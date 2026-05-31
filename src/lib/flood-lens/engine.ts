/**
 * FloodLensAI — engine seam.
 * Real impl will accept a 2D results raster (GeoTIFF) + building footprints
 * (GeoJSON), sample max depth + duration per polygon, apply a hazard classifier
 * and a depth-damage curve. For now we hand-author the buildings.
 */

export type HazardRating = "low" | "moderate" | "significant" | "extreme";

export type BuildingAssessment = {
  id: string;
  /** SWMM node id this building is sampled from. Used to merge .rpt results. */
  nodeId: string;
  use: "residential" | "commercial" | "industrial" | "critical";
  /** Floor area, m². */
  area: number;
  maxDepthM: number;
  durationMin: number;
  velocityMs: number;
  hazard: HazardRating;
  /** Estimated direct damages, GBP. */
  damageGbp: number;
  /** SVG placement on the mock map (0-100). */
  x: number;
  y: number;
};

const HAZARD_RANK: HazardRating[] = ["low", "moderate", "significant", "extreme"];

export function hazardColor(h: HazardRating): string {
  switch (h) {
    case "low":
      return "var(--success)";
    case "moderate":
      return "var(--warning)";
    case "significant":
      return "var(--accent)";
    case "extreme":
      return "var(--destructive)";
  }
}

export function hazardOrder(h: HazardRating): number {
  return HAZARD_RANK.indexOf(h);
}

/** DEFRA-style hazard rating from depth × (velocity + 0.5). */
function classify(depthM: number, velMs: number): HazardRating {
  const hr = depthM * (velMs + 0.5);
  if (hr < 0.75) return "low";
  if (hr < 1.5) return "moderate";
  if (hr < 2.5) return "significant";
  return "extreme";
}

/** Cheap depth-damage curve. Real impl: tabulated by use class. */
function damage(use: BuildingAssessment["use"], depthM: number, area: number): number {
  const unit = { residential: 380, commercial: 520, industrial: 410, critical: 980 }[use];
  const frac = Math.min(1, 0.05 + 0.42 * depthM);
  return Math.round(unit * area * frac);
}

const SEED: Omit<BuildingAssessment, "hazard" | "damageGbp">[] = [
  { id: "B-0421", use: "residential", area: 120, maxDepthM: 0.35, durationMin: 95, velocityMs: 0.4, x: 18, y: 32 },
  { id: "B-0422", use: "residential", area: 110, maxDepthM: 0.62, durationMin: 140, velocityMs: 0.6, x: 22, y: 38 },
  { id: "B-0508", use: "commercial", area: 640, maxDepthM: 1.1, durationMin: 220, velocityMs: 0.9, x: 35, y: 44 },
  { id: "B-0612", use: "critical", area: 1800, maxDepthM: 0.9, durationMin: 180, velocityMs: 1.1, x: 48, y: 52 },
  { id: "B-0617", use: "residential", area: 95, maxDepthM: 0.15, durationMin: 40, velocityMs: 0.2, x: 55, y: 30 },
  { id: "B-0721", use: "industrial", area: 2200, maxDepthM: 0.7, durationMin: 160, velocityMs: 0.5, x: 62, y: 60 },
  { id: "B-0822", use: "commercial", area: 410, maxDepthM: 1.6, durationMin: 280, velocityMs: 1.4, x: 70, y: 48 },
  { id: "B-0901", use: "residential", area: 140, maxDepthM: 0.05, durationMin: 20, velocityMs: 0.1, x: 78, y: 35 },
  { id: "B-0908", use: "residential", area: 130, maxDepthM: 0.42, durationMin: 110, velocityMs: 0.5, x: 30, y: 64 },
  { id: "B-0911", use: "commercial", area: 540, maxDepthM: 2.1, durationMin: 320, velocityMs: 1.6, x: 44, y: 70 },
  { id: "B-1004", use: "residential", area: 100, maxDepthM: 0.25, durationMin: 60, velocityMs: 0.3, x: 60, y: 74 },
  { id: "B-1110", use: "critical", area: 900, maxDepthM: 0.3, durationMin: 70, velocityMs: 0.4, x: 80, y: 68 },
];

export const MOCK_BUILDINGS: BuildingAssessment[] = SEED.map((b) => {
  const hazard = classify(b.maxDepthM, b.velocityMs);
  return { ...b, hazard, damageGbp: damage(b.use, b.maxDepthM, b.area) };
});

export type FloodSummary = {
  total: number;
  byHazard: Record<HazardRating, number>;
  totalDamageGbp: number;
};

export function summarize(rows: BuildingAssessment[]): FloodSummary {
  const byHazard: Record<HazardRating, number> = {
    low: 0,
    moderate: 0,
    significant: 0,
    extreme: 0,
  };
  let totalDamageGbp = 0;
  for (const r of rows) {
    byHazard[r.hazard] += 1;
    totalDamageGbp += r.damageGbp;
  }
  return { total: rows.length, byHazard, totalDamageGbp };
}
