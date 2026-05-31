/**
 * Shared SWMM domain types. Used by parsers, the runoff engine, and every tool.
 * Kept deliberately minimal — only what BlueSky-ICM actually consumes today.
 */

export type Junction = {
  id: string;
  invertElev: number;
  maxDepth: number;
  initDepth: number;
};

export type Subcatchment = {
  id: string;
  raingage: string;
  outlet: string;
  areaHa: number;
  pctImperv: number;
  width: number;
  slopePct: number;
  /** SCS curve number (0-100). Optional — only present if [INFILTRATION] is CURVE_NUMBER. */
  cn?: number;
};

export type Conduit = {
  id: string;
  fromNode: string;
  toNode: string;
  length: number;
  roughness: number;
  inOffset: number;
  outOffset: number;
};

export type Raingage = {
  id: string;
  format: "INTENSITY" | "VOLUME" | "CUMULATIVE";
  intervalMin: number;
  source: string; // TIMESERIES name or FILE
};

export type TimeSeriesPoint = { t: number /* minutes from start */; v: number };

export type TimeSeries = {
  id: string;
  points: TimeSeriesPoint[];
};

export type Outfall = {
  id: string;
  invertElev: number;
  type: "FREE" | "NORMAL" | "FIXED" | "TIDAL" | "TIMESERIES";
};

export type InpModel = {
  title: string;
  options: Record<string, string>;
  junctions: Map<string, Junction>;
  outfalls: Map<string, Outfall>;
  conduits: Map<string, Conduit>;
  subcatchments: Map<string, Subcatchment>;
  raingages: Map<string, Raingage>;
  timeseries: Map<string, TimeSeries>;
  /** Original section text, keyed by section name, for fidelity in diffs. */
  rawSections: Map<string, string>;
};

export type RunoffSeries = {
  /** Minutes since sim start. */
  t: number[];
  /** Per-subcatchment runoff (m³/s) keyed by subcatchment id. */
  runoff: Map<string, number[]>;
  /** Per-node total inflow (m³/s) keyed by node id. */
  nodeInflow: Map<string, number[]>;
};

export type RunSummary = {
  totalRainfallMm: number;
  totalRunoffMm: number;
  runoffCoefficient: number;
  peakSystemFlowM3s: number;
  peakAtMinute: number;
  continuityErrorPct: number;
};

export type SwmmRun = {
  series: RunoffSeries;
  summary: RunSummary;
  /** Which provider produced this run. */
  engine: "wasm" | "lite";
};

export type RptSummary = {
  continuityErrorPct: number;
  nodes: {
    id: string;
    maxDepthM: number;
    maxHgl: number;
    floodedHours: number;
    floodVolMl: number;
  }[];
  links: {
    id: string;
    maxFlowM3s: number;
    maxVelocityMs: number;
    timeOfPeakHr: number;
  }[];
  subcatchments: {
    id: string;
    totalPrecipMm: number;
    totalRunoffMm: number;
    runoffCoef: number;
  }[];
};

export type OutTimeseries = {
  /** Number of reporting steps. */
  nPeriods: number;
  /** Seconds between reports. */
  reportStepSec: number;
  /** Start date as ms since epoch. */
  startEpochMs: number;
  /** Available subcatchments / nodes / links and their variable indexes. */
  subcatchments: string[];
  nodes: string[];
  links: string[];
  /** Lazy reader for a specific series. Returns m³/s for flow, m for depth, etc. */
  readNodeSeries: (id: string, varIndex: number) => Float32Array;
  readLinkSeries: (id: string, varIndex: number) => Float32Array;
};
