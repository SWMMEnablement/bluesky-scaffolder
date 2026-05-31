/**
 * ScenarioStudio — engine.
 *
 * Each scenario is now a recipe of perturbations applied to the demo .inp,
 * actually run through the lite SWMM provider. Hydrographs / peaks / flood
 * volumes come from the engine, not hand-written numbers.
 */
import { parseInp } from "@/lib/swmm/inp";
import { getProvider } from "@/lib/swmm/provider";
import type { InpModel, SwmmRun } from "@/lib/swmm/types";
import { SAMPLE_INP_A } from "@/lib/model-diff/engine";
import { buildHyetogram } from "@/lib/rain-lab/engine";

export type ScenarioTag = "BASELINE" | "RETROFIT" | "UPSIZE" | "CLIMATE";

export type ScenarioRecipe = {
  id: string;
  name: string;
  label: string;
  tag: ScenarioTag;
  status: "verified" | "active" | "draft";
  /** Capex in £M to compute £/m³ avoided. */
  costMgbp: number;
  /** Climate uplift multiplier on rainfall depth (1.0 = present-day). */
  uplift: number;
  /** Multiplier on every subcatchment's %imperv (e.g. SUDS = 0.85). */
  impervMul: number;
  /** Multiplier on every conduit's roughness. */
  roughnessMul: number;
};

export type Scenario = ScenarioRecipe & {
  run: SwmmRun;
  peakFlowM3s: number;
  floodVolumeMl: number;
  csoSpills: number;
  costPerM3Avoided: number | null;
  hydrograph: number[]; // 24 hourly resampled values
};

const RECIPES: ScenarioRecipe[] = [
  { id: "BASE_2024", name: "Baseline 2024", label: "BASE", tag: "BASELINE", status: "verified", costMgbp: 0, uplift: 1.0, impervMul: 1.0, roughnessMul: 1.0 },
  { id: "SUDS_A", name: "SUDS retrofit · zone A", label: "SUDS-A", tag: "RETROFIT", status: "active", costMgbp: 12.4, uplift: 1.0, impervMul: 0.82, roughnessMul: 1.0 },
  { id: "UPSIZE_P099", name: "Pipe upsize P-099", label: "UPSZ", tag: "UPSIZE", status: "active", costMgbp: 6.8, uplift: 1.0, impervMul: 1.0, roughnessMul: 0.85 },
  { id: "CLIMATE_2050", name: "Climate 2050 + SUDS", label: "CL-50", tag: "CLIMATE", status: "draft", costMgbp: 18.2, uplift: 1.35, impervMul: 0.88, roughnessMul: 1.0 },
];

function applyRecipe(base: InpModel, recipe: ScenarioRecipe): InpModel {
  // Shallow clone the maps we mutate
  const model: InpModel = {
    ...base,
    subcatchments: new Map(base.subcatchments),
    conduits: new Map(base.conduits),
  };
  for (const [id, s] of model.subcatchments) {
    model.subcatchments.set(id, { ...s, pctImperv: Math.max(0, Math.min(100, s.pctImperv * recipe.impervMul)) });
  }
  for (const [id, c] of model.conduits) {
    model.conduits.set(id, { ...c, roughness: c.roughness * recipe.roughnessMul });
  }
  return model;
}

function resampleToHours(t: number[], series: number[], hours: number): number[] {
  const out = new Array<number>(hours).fill(0);
  for (let h = 0; h < hours; h++) {
    const tMin = h * 60;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < t.length; i++) {
      const d = Math.abs(t[i] - tMin);
      if (d < best) { best = d; nearest = i; }
    }
    out[h] = series[nearest] ?? 0;
  }
  return out;
}

export async function runAllScenarios(): Promise<Scenario[]> {
  const provider = getProvider();
  const baseInp = parseInp(SAMPLE_INP_A);

  // Shared design storm at 48mm / 3hr Chicago — uplift varies per scenario.
  const stormBase = buildHyetogram({ shape: "chicago", durationMin: 180, depthMm: 48, uplift: 1.0, stepMin: 5 });

  const results: Scenario[] = [];
  let baselineFloodMl = 0;

  for (const r of RECIPES) {
    const model = applyRecipe(baseInp, r);
    const upliftedStorm = {
      id: `${r.id}_storm`,
      points: stormBase.map((p) => ({ t: p.t, v: p.i * r.uplift })),
    };
    const run = await provider.runSimulation(model, { storm: upliftedStorm, durationMin: 24 * 60 });

    // System flow time series
    const N = run.series.t.length;
    const total = new Array<number>(N).fill(0);
    for (const v of run.series.nodeInflow.values()) for (let i = 0; i < N; i++) total[i] += v[i];

    // "Flood volume" proxy: integrated flow above a notional capacity threshold (5 m³/s)
    const cap = 5;
    const stepSec = (run.series.t[1] ?? 1) * 60 - (run.series.t[0] ?? 0) * 60 || 60;
    const floodM3 = total.reduce((a, q) => a + Math.max(0, q - cap) * stepSec, 0);
    const floodMl = floodM3 / 1000; // m³ → ML (×1e-3)

    // "CSO spills": count peaks above capacity separated by >30min
    let spills = 0; let inEvent = false;
    for (const q of total) {
      if (q > cap && !inEvent) { spills++; inEvent = true; }
      else if (q < cap * 0.7) inEvent = false;
    }

    const scenario: Scenario = {
      ...r,
      run,
      peakFlowM3s: run.summary.peakSystemFlowM3s,
      floodVolumeMl: floodMl,
      csoSpills: spills,
      costPerM3Avoided: null, // filled after baseline known
      hydrograph: resampleToHours(run.series.t, total, 24),
    };
    if (r.tag === "BASELINE") baselineFloodMl = floodMl;
    results.push(scenario);
  }

  // Compute £/m³ avoided
  for (const s of results) {
    if (s.tag === "BASELINE") continue;
    const avoidedM3 = Math.max(0, baselineFloodMl - s.floodVolumeMl) * 1000;
    s.costPerM3Avoided = avoidedM3 > 0 ? (s.costMgbp * 1_000_000) / avoidedM3 : null;
  }

  return results;
}
