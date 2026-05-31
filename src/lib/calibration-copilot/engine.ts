/**
 * CalibrationCopilot — engine.
 *
 * Real NSE / KGE / PBIAS / R² computed from observed+simulated series.
 * The "nudge" suggestions are heuristic (derived from PBIAS sign and
 * lag of peak) — clearly labelled in the UI as heuristic.
 */

export type GaugeStat = {
  gaugeId: string;
  variable: "flow" | "depth" | "level";
  nse: number;
  kge: number;
  pbias: number;
  r2: number;
  nObs: number;
};

export type ParamNudge = {
  paramId: string;
  scope: string;
  current: number;
  suggested: number;
  unit?: string;
  sensitivity: number;
  rationale: string;
};

export type Pair = { obs: number; sim: number };

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Nash–Sutcliffe Efficiency. 1 = perfect, 0 = mean-of-obs, <0 = worse than mean. */
export function nse(obs: number[], sim: number[]): number {
  const n = Math.min(obs.length, sim.length);
  if (n === 0) return 0;
  const mo = mean(obs.slice(0, n));
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (obs[i] - sim[i]) ** 2; den += (obs[i] - mo) ** 2; }
  return den === 0 ? 0 : 1 - num / den;
}

/** Pearson correlation r. */
export function pearson(obs: number[], sim: number[]): number {
  const n = Math.min(obs.length, sim.length);
  if (n === 0) return 0;
  const mo = mean(obs.slice(0, n)), ms = mean(sim.slice(0, n));
  let num = 0, do2 = 0, ds2 = 0;
  for (let i = 0; i < n; i++) {
    const a = obs[i] - mo, b = sim[i] - ms;
    num += a * b; do2 += a * a; ds2 += b * b;
  }
  const d = Math.sqrt(do2 * ds2);
  return d === 0 ? 0 : num / d;
}

/** Kling–Gupta Efficiency (2009). */
export function kge(obs: number[], sim: number[]): number {
  const n = Math.min(obs.length, sim.length);
  if (n === 0) return 0;
  const r = pearson(obs, sim);
  const mo = mean(obs.slice(0, n)), ms = mean(sim.slice(0, n));
  const so = Math.sqrt(mean(obs.slice(0, n).map((v) => (v - mo) ** 2)));
  const ss = Math.sqrt(mean(sim.slice(0, n).map((v) => (v - ms) ** 2)));
  const alpha = so === 0 ? 1 : ss / so;
  const beta = mo === 0 ? 1 : ms / mo;
  return 1 - Math.sqrt((r - 1) ** 2 + (alpha - 1) ** 2 + (beta - 1) ** 2);
}

/** Percent bias: (sum(sim-obs)/sum(obs)) × 100. */
export function pbias(obs: number[], sim: number[]): number {
  const n = Math.min(obs.length, sim.length);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += sim[i] - obs[i]; den += obs[i]; }
  return den === 0 ? 0 : (num / den) * 100;
}

export function scoreGauge(id: string, variable: GaugeStat["variable"], obs: number[], sim: number[]): GaugeStat {
  const n = Math.min(obs.length, sim.length);
  const r = pearson(obs, sim);
  return {
    gaugeId: id,
    variable,
    nObs: n,
    nse: nse(obs, sim),
    kge: kge(obs, sim),
    pbias: pbias(obs, sim),
    r2: r * r,
  };
}

/** Generate heuristic nudges from PBIAS sign and timing on the worst gauge. */
export function suggestNudges(worst: GaugeStat): ParamNudge[] {
  const nudges: ParamNudge[] = [];
  if (worst.pbias > 5) {
    nudges.push({
      paramId: "PCT_IMPERV", scope: `Subcatchments draining to ${worst.gaugeId}`,
      current: 60, suggested: Math.round(60 * (1 - worst.pbias / 200)),
      unit: "%", sensitivity: Math.min(0.3, Math.abs(worst.pbias) / 100),
      rationale: `+${worst.pbias.toFixed(1)}% volume bias — reduce impervious cover to lower runoff volume.`,
    });
  } else if (worst.pbias < -5) {
    nudges.push({
      paramId: "PCT_IMPERV", scope: `Subcatchments draining to ${worst.gaugeId}`,
      current: 60, suggested: Math.round(60 * (1 - worst.pbias / 200)),
      unit: "%", sensitivity: Math.min(0.3, Math.abs(worst.pbias) / 100),
      rationale: `${worst.pbias.toFixed(1)}% volume bias — increase impervious cover to raise runoff volume.`,
    });
  }
  if (worst.nse < 0.6) {
    nudges.push({
      paramId: "MANNING_N", scope: "Conduits in worst gauge's catchment",
      current: 0.013, suggested: 0.015, sensitivity: Math.max(0.05, 0.6 - worst.nse),
      rationale: `Low NSE (${worst.nse.toFixed(2)}) suggests timing issues — raising roughness slows peak arrival.`,
    });
  }
  if (worst.kge < 0.6) {
    nudges.push({
      paramId: "INIT_LOSS", scope: "Subcatchments S-30x",
      current: 5, suggested: 3, unit: "mm", sensitivity: 0.09,
      rationale: `KGE (${worst.kge.toFixed(2)}) is dragged by amplitude — reducing initial losses lifts rising-limb fit.`,
    });
  }
  if (nudges.length === 0) {
    nudges.push({
      paramId: "—", scope: "—", current: 0, suggested: 0, sensitivity: 0,
      rationale: `Worst gauge ${worst.gaugeId} already scores NSE ${worst.nse.toFixed(2)} / KGE ${worst.kge.toFixed(2)}. No nudge recommended.`,
    });
  }
  return nudges;
}

/** Demo observed+simulated series so the page has real numbers before user uploads. */
export function syntheticPair(seed: number, biasPct: number, lagMin: number, noise: number): Pair[] {
  const out: Pair[] = [];
  const N = 180;
  const dt = 5;
  for (let i = 0; i < N; i++) {
    const t = i * dt;
    const tp = 90;
    const sigma = 35;
    const obs = 12 * Math.exp(-((t - tp) ** 2) / (2 * sigma * sigma)) + 0.5 + ((seed * 7 + i) % 11) * 0.05;
    const tShift = t - lagMin;
    const sim = 12 * Math.exp(-((tShift - tp) ** 2) / (2 * sigma * sigma)) * (1 + biasPct / 100) + 0.5
      + Math.cos(i / 5 + seed) * noise;
    out.push({ obs: Math.max(0, obs), sim: Math.max(0, sim) });
  }
  return out;
}

export const DEMO_GAUGES = [
  { id: "FM-22-A", variable: "flow" as const, pairs: syntheticPair(1, -3, 0, 0.3) },
  { id: "FM-22-B", variable: "flow" as const, pairs: syntheticPair(2, 18, 10, 0.6) },
  { id: "DG-04", variable: "depth" as const, pairs: syntheticPair(3, -2, 3, 0.15) },
  { id: "DG-07", variable: "depth" as const, pairs: syntheticPair(4, 9, 6, 0.25) },
  { id: "WL-03", variable: "level" as const, pairs: syntheticPair(5, 1.5, 1, 0.1) },
];
