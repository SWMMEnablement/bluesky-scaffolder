/**
 * Tool registry — shared across the hub and every tool route.
 * Add or rename a tool here and both the hub and the nav stay in sync.
 */

export type ToolMeta = {
  slug: string;
  name: string;
  pitch: string;
  description: string;
  tag: string;
  index: string;
  /** What real compute would need to plug in once we move past the concept build. */
  computeSeam: string;
};

export const TOOLS: ToolMeta[] = [
  {
    slug: "model-diff",
    name: "ModelDiff",
    tag: "DIFF_ENGINE",
    index: "01",
    pitch: "Diff two SWMM .inp versions like code.",
    description:
      "Side-by-side network map + change list for conduits, subcatchments, controls, and time series. Stops modelers from doing this in a text editor at 11pm.",
    computeSeam:
      "Parse two .inp / IEDB exports with a structured tokenizer, walk sections, emit a typed change set keyed by object ID.",
  },
  {
    slug: "rain-lab",
    name: "RainLab",
    tag: "HYETOGRAPH",
    index: "02",
    pitch: "Design-storm + ensemble rainfall generator.",
    description:
      "Build Chicago / NRCS / Huff hyetographs, layer climate-uplift factors, export as SWMM time series or ICM rainfall events.",
    computeSeam:
      "Pure-JS storm synthesis (no solver dep). Output written as SWMM TIMESERIES blocks or ICM CSV events.",
  },
  {
    slug: "calibration-copilot",
    name: "CalibrationCopilot",
    tag: "STAT_AUTO",
    index: "03",
    pitch: "Calibration scoreboard with parameter nudges.",
    description:
      "Loads observed gauge data alongside a simulated run, computes NSE / KGE / PBIAS / R² per gauge, and proposes targeted parameter changes with sensitivity bars.",
    computeSeam:
      "Read .out or .rpt for simulated series, observed CSV for gauges, compute stats in-browser; nudge model = local sensitivity sweep.",
  },
  {
    slug: "flood-lens",
    name: "FloodLensAI",
    tag: "2D_RESULTS",
    index: "04",
    pitch: "Per-building depth, duration, hazard rating.",
    description:
      "Upload a 2D results raster (or ICM mesh result) and a building footprint layer; get per-asset depth, hazard rating, and damage curve estimates.",
    computeSeam:
      "Server function ingests GeoTIFF + GeoJSON, samples raster at each polygon, applies DEFRA/FEMA hazard classifier and a depth-damage curve.",
  },
  {
    slug: "scenario-studio",
    name: "ScenarioStudio",
    tag: "MULTI_RUN",
    index: "05",
    pitch: "Compare N scenarios on one dashboard.",
    description:
      "Drag baseline, SUDS retrofit, pipe upsize, and climate-2050 runs onto one board. Peak flow, flood volume, CSO spills, cost per m³ avoided.",
    computeSeam:
      "Each scenario = a parsed .out + cost manifest. KPI roll-up is deterministic; everything below is mock today.",
  },
];

export function getTool(slug: string): ToolMeta {
  const t = TOOLS.find((x) => x.slug === slug);
  if (!t) throw new Error(`Unknown tool: ${slug}`);
  return t;
}
