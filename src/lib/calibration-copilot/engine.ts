/**
 * CalibrationCopilot — engine seam.
 * Real impl will load observed gauge CSVs + a simulated series from .out/.rpt
 * and compute these stats. For now we hand-author plausible numbers.
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
  /** Where it lives in the model. */
  scope: string;
  current: number;
  suggested: number;
  unit?: string;
  /** Local sensitivity: how much each unit change moves NSE on the worst gauge. */
  sensitivity: number;
  rationale: string;
};

export const MOCK_GAUGES: GaugeStat[] = [
  { gaugeId: "FM-22-A", variable: "flow", nse: 0.81, kge: 0.78, pbias: -4.2, r2: 0.87, nObs: 1440 },
  { gaugeId: "FM-22-B", variable: "flow", nse: 0.42, kge: 0.51, pbias: 18.6, r2: 0.61, nObs: 1440 },
  { gaugeId: "DG-04", variable: "depth", nse: 0.68, kge: 0.71, pbias: -2.1, r2: 0.79, nObs: 720 },
  { gaugeId: "DG-07", variable: "depth", nse: 0.55, kge: 0.6, pbias: 9.3, r2: 0.7, nObs: 720 },
  { gaugeId: "WL-03", variable: "level", nse: 0.74, kge: 0.7, pbias: 1.5, r2: 0.82, nObs: 2880 },
];

export const MOCK_NUDGES: ParamNudge[] = [
  {
    paramId: "MANNING_N",
    scope: "Conduits in basin S-Central",
    current: 0.013,
    suggested: 0.015,
    sensitivity: 0.18,
    rationale:
      "Simulated peaks at FM-22-B arrive ~10 min early. Higher roughness slows routing and lifts NSE.",
  },
  {
    paramId: "PCT_IMPERV",
    scope: "Subcatchment S-301",
    current: 62,
    suggested: 71,
    unit: "%",
    sensitivity: 0.12,
    rationale: "Volume bias +18.6% at FM-22-B suggests under-estimated impervious cover.",
  },
  {
    paramId: "INIT_LOSS",
    scope: "Subcatchments S-30x",
    current: 5,
    suggested: 3,
    unit: "mm",
    sensitivity: 0.09,
    rationale: "Reducing initial losses improves rising-limb timing at DG-07.",
  },
  {
    paramId: "ROUTING_DT",
    scope: "Simulation options",
    current: 30,
    suggested: 15,
    unit: "s",
    sensitivity: 0.04,
    rationale: "Coarse dt is smoothing the peak; halving it costs ~2× runtime.",
  },
];

/** Mock simulated vs observed pairs for the scatter on the worst gauge (FM-22-B). */
export const MOCK_SCATTER = Array.from({ length: 90 }, (_, i) => {
  const obs = 5 + 12 * Math.sin(i / 14) + (i % 11) * 0.3;
  const sim = obs * (1.1 + 0.05 * Math.sin(i / 7)) + (Math.cos(i / 5) - 0.5) * 1.4;
  return { obs: Math.max(0, obs), sim: Math.max(0, sim) };
});
