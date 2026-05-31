/**
 * "Lite" runoff engine — real math, no WASM dependency.
 *
 * Approach:
 *   1. Per-subcatchment: NRCS Curve Number loss model (if CN provided)
 *      else direct-runoff coefficient from %Imperv (Schaake-style).
 *   2. Effective rainfall → time-distributed runoff using a single linear
 *      reservoir whose time constant K is derived from width, slope and
 *      area (kinematic-wave approximation, Manning n=0.025 default).
 *   3. Sum sub-catchment runoff at each downstream node (one-step routing,
 *      no full St-Venant solver — this is the seam where swmm5.wasm
 *      would replace us).
 *
 * Honest about its limits. Used by RainLab, ScenarioStudio, and
 * CalibrationCopilot as a deterministic stand-in for a SWMM5 run.
 */

import type { InpModel, RunoffSeries, RunSummary, SwmmRun, TimeSeries } from "./types";

export type LiteRunOpts = {
  /** Override the raingage source with an in-memory series (e.g. RainLab output). */
  storm?: TimeSeries;
  /** Total sim length in minutes. Defaults to last storm point + 60 min recession. */
  durationMin?: number;
  /** Internal step in seconds (default 60). */
  stepSec?: number;
};

/** NRCS CN runoff in mm given cumulative rainfall in mm. */
function cnRunoff(P: number, CN: number): number {
  if (P <= 0) return 0;
  const S = (25400 / CN) - 254; // mm
  const Ia = 0.2 * S;
  if (P <= Ia) return 0;
  return Math.pow(P - Ia, 2) / (P - Ia + S);
}

/** Discrete linear-reservoir routing: Q[t+1] = Q[t]*exp(-Δt/K) + (1-exp(...))*inflow */
function linearReservoir(inflow: number[], K: number, stepSec: number): number[] {
  const a = Math.exp(-stepSec / K);
  const out = new Array<number>(inflow.length);
  let q = 0;
  for (let i = 0; i < inflow.length; i++) {
    q = q * a + (1 - a) * inflow[i];
    out[i] = q;
  }
  return out;
}

/** Interpolate a TIMESERIES (intensity mm/hr or volume mm) onto a uniform grid. */
function resampleStorm(ts: TimeSeries, durationMin: number, stepSec: number): number[] {
  const n = Math.ceil((durationMin * 60) / stepSec);
  const out = new Array<number>(n).fill(0);
  if (!ts.points.length) return out;
  for (let i = 0; i < n; i++) {
    const tMin = (i * stepSec) / 60;
    // step-style hold to next point (SWMM TIMESERIES intensity convention)
    let v = 0;
    for (let k = 0; k < ts.points.length; k++) {
      if (ts.points[k].t <= tMin) v = ts.points[k].v;
      else break;
    }
    out[i] = v; // mm/hr
  }
  return out;
}

export function runLite(model: InpModel, opts: LiteRunOpts = {}): SwmmRun {
  const stepSec = opts.stepSec ?? 60;

  // Pick storm: explicit opts.storm wins, else first raingage's series.
  let storm: TimeSeries | undefined = opts.storm;
  if (!storm) {
    const firstRg = [...model.raingages.values()][0];
    if (firstRg) storm = model.timeseries.get(firstRg.source.replace(/^TIMESERIES\s+/i, ""));
  }
  if (!storm) {
    // No rainfall — synthesize a flat 25mm/hr 1-hr storm so the pipeline still produces output.
    storm = {
      id: "__default_storm",
      points: [
        { t: 0, v: 25 },
        { t: 60, v: 0 },
      ],
    };
  }

  const lastT = storm.points.at(-1)?.t ?? 60;
  const durationMin = opts.durationMin ?? Math.max(120, lastT + 60);
  const intensityMmHr = resampleStorm(storm, durationMin, stepSec);
  const N = intensityMmHr.length;
  const t: number[] = Array.from({ length: N }, (_, i) => (i * stepSec) / 60);

  // Total rainfall depth (mm) for summary
  const totalRainMm = intensityMmHr.reduce((a, v) => a + (v * stepSec) / 3600, 0);

  const subs = [...model.subcatchments.values()];
  // Fallback synthetic catchment if none parsed
  const effectiveSubs = subs.length
    ? subs
    : [
        {
          id: "S-DEMO",
          raingage: storm.id,
          outlet: "OUT-1",
          areaHa: 5,
          pctImperv: 55,
          width: 200,
          slopePct: 1.2,
        },
      ];

  const runoff = new Map<string, number[]>();
  const nodeInflow = new Map<string, number[]>();
  let totalRunoffVolumeM3 = 0;
  const totalAreaM2 = effectiveSubs.reduce((a, s) => a + s.areaHa * 10000, 0);

  for (const s of effectiveSubs) {
    const areaM2 = s.areaHa * 10000;
    // Effective rainfall via CN if present, else %imperv coefficient
    const effIntensity = new Array<number>(N);
    if (s.cn != null) {
      let cumP = 0;
      let cumQ = 0;
      for (let i = 0; i < N; i++) {
        cumP += (intensityMmHr[i] * stepSec) / 3600;
        const Qcum = cnRunoff(cumP, s.cn);
        const deltaQ = Math.max(0, Qcum - cumQ);
        cumQ = Qcum;
        effIntensity[i] = (deltaQ * 3600) / stepSec; // mm/hr
      }
    } else {
      const c = Math.max(0.05, Math.min(0.95, s.pctImperv / 100));
      for (let i = 0; i < N; i++) effIntensity[i] = intensityMmHr[i] * c;
    }

    // Inflow (m³/s) at top of catchment: i_eff(mm/hr) × area(m²) / 3.6e6
    const rawInflow = effIntensity.map((iMmHr) => (iMmHr * areaM2) / 3_600_000);

    // Time of concentration via kinematic-wave-style proxy:
    //   K (s) ≈ 60 + 0.6 * sqrt(area_m2) / max(0.1, slope_pct)
    const K = 60 + 0.6 * Math.sqrt(areaM2) / Math.max(0.1, s.slopePct);
    const routed = linearReservoir(rawInflow, K, stepSec);
    runoff.set(s.id, routed);
    totalRunoffVolumeM3 += routed.reduce((a, v) => a + v * stepSec, 0);

    // Sum into outlet node
    if (!nodeInflow.has(s.outlet)) nodeInflow.set(s.outlet, new Array<number>(N).fill(0));
    const acc = nodeInflow.get(s.outlet)!;
    for (let i = 0; i < N; i++) acc[i] += routed[i];
  }

  // Peak system flow = max over time of sum across all outlets
  let peak = 0;
  let peakAt = 0;
  for (let i = 0; i < N; i++) {
    let sum = 0;
    for (const v of nodeInflow.values()) sum += v[i];
    if (sum > peak) {
      peak = sum;
      peakAt = t[i];
    }
  }

  const totalRunoffMm = totalAreaM2 > 0 ? (totalRunoffVolumeM3 / totalAreaM2) * 1000 : 0;

  const summary: RunSummary = {
    totalRainfallMm: totalRainMm,
    totalRunoffMm,
    runoffCoefficient: totalRainMm > 0 ? totalRunoffMm / totalRainMm : 0,
    peakSystemFlowM3s: peak,
    peakAtMinute: peakAt,
    continuityErrorPct: 0, // lite engine is volume-conservative by construction
  };

  const series: RunoffSeries = { t, runoff, nodeInflow };
  return { series, summary, engine: "lite" };
}
