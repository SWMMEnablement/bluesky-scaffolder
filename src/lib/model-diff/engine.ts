/**
 * ModelDiff — engine seam.
 * Real impl will parse two SWMM .inp files (or ICM IEDB exports) and return this shape.
 */
export type DiffKind = "added" | "removed" | "modified";

export type Change = {
  id: string;
  section: "JUNCTIONS" | "CONDUITS" | "SUBCATCHMENTS" | "CONTROLS" | "TIMESERIES";
  objectId: string;
  kind: DiffKind;
  field?: string;
  before?: string;
  after?: string;
  /** Plain-English impact summary that would be generated from a hydraulic sensitivity check. */
  impact?: string;
};

export type DiffResult = {
  fileA: string;
  fileB: string;
  summary: { added: number; removed: number; modified: number };
  changes: Change[];
  /** SVG-friendly node positions for the mock network map. */
  nodes: { id: string; x: number; y: number; state: "same" | "changed" | "new" | "removed" }[];
  edges: { a: string; b: string; state: "same" | "changed" | "new" | "removed" }[];
};

export const MOCK_DIFF: DiffResult = {
  fileA: "lower_basin_v23.inp",
  fileB: "lower_basin_v24_climate.inp",
  summary: { added: 3, removed: 1, modified: 11 },
  nodes: [
    { id: "J-101", x: 60, y: 70, state: "same" },
    { id: "J-102", x: 140, y: 90, state: "changed" },
    { id: "J-103", x: 220, y: 70, state: "same" },
    { id: "J-104", x: 300, y: 120, state: "changed" },
    { id: "J-105", x: 380, y: 100, state: "new" },
    { id: "J-106", x: 460, y: 150, state: "same" },
    { id: "OUT-1", x: 540, y: 180, state: "same" },
    { id: "S-301", x: 100, y: 200, state: "changed" },
    { id: "S-302", x: 260, y: 220, state: "removed" },
    { id: "S-304", x: 420, y: 230, state: "new" },
  ],
  edges: [
    { a: "J-101", b: "J-102", state: "same" },
    { a: "J-102", b: "J-103", state: "changed" },
    { a: "J-103", b: "J-104", state: "same" },
    { a: "J-104", b: "J-105", state: "new" },
    { a: "J-105", b: "J-106", state: "new" },
    { a: "J-106", b: "OUT-1", state: "same" },
    { a: "S-301", b: "J-102", state: "same" },
    { a: "S-304", b: "J-105", state: "new" },
  ],
  changes: [
    {
      id: "c1",
      section: "CONDUITS",
      objectId: "P-204",
      kind: "modified",
      field: "Geom1",
      before: "0.600",
      after: "0.900",
      impact: "Upsize: peak depth at J-104 drops ~0.18 m under 10-yr 6-hr storm.",
    },
    {
      id: "c2",
      section: "CONDUITS",
      objectId: "P-205",
      kind: "modified",
      field: "Roughness",
      before: "0.013",
      after: "0.015",
      impact: "Slightly slower routing; small attenuation at OUT-1.",
    },
    {
      id: "c3",
      section: "SUBCATCHMENTS",
      objectId: "S-301",
      kind: "modified",
      field: "PctImperv",
      before: "62",
      after: "71",
      impact: "More runoff volume — expect +6% peak inflow at J-102.",
    },
    {
      id: "c4",
      section: "SUBCATCHMENTS",
      objectId: "S-302",
      kind: "removed",
      impact: "Catchment dropped from model — verify outfall coverage is still complete.",
    },
    {
      id: "c5",
      section: "SUBCATCHMENTS",
      objectId: "S-304",
      kind: "added",
      impact: "New 4.2 ha catchment added downstream of J-105.",
    },
    {
      id: "c6",
      section: "CONTROLS",
      objectId: "RULE_PUMP_A",
      kind: "modified",
      field: "Setpoint",
      before: "2.10 m",
      after: "1.85 m",
      impact: "Pump starts earlier; wet-well drawdown improves.",
    },
    {
      id: "c7",
      section: "TIMESERIES",
      objectId: "TS_RAIN_100Y",
      kind: "added",
      impact: "Climate-uplifted 100-yr design storm series added.",
    },
    {
      id: "c8",
      section: "JUNCTIONS",
      objectId: "J-104",
      kind: "modified",
      field: "InvertElev",
      before: "10.20",
      after: "10.05",
      impact: "Lowered invert; check freeboard at upstream conduits.",
    },
  ],
};

export async function runDiff(_inpA: File | null, _inpB: File | null): Promise<DiffResult> {
  // Concept build: ignore the files and return mock data.
  // Real impl: tokenize each .inp by section, build keyed objects, diff field-by-field.
  await new Promise((r) => setTimeout(r, 250));
  return MOCK_DIFF;
}
