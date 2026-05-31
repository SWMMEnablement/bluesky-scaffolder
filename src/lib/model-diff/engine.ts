/**
 * ModelDiff — real engine.
 *
 * Compares two parsed InpModels and emits a typed change set keyed by
 * (section, object id). No hand-written mocks below this line.
 */

import type { Conduit, InpModel, Junction, Subcatchment } from "@/lib/swmm/types";

export type DiffKind = "added" | "removed" | "modified";

export type Change = {
  id: string;
  section: "JUNCTIONS" | "CONDUITS" | "SUBCATCHMENTS" | "OUTFALLS" | "TIMESERIES" | "RAINGAGES";
  objectId: string;
  kind: DiffKind;
  field?: string;
  before?: string;
  after?: string;
  impact?: string;
};

export type DiffResult = {
  fileA: string;
  fileB: string;
  summary: { added: number; removed: number; modified: number };
  changes: Change[];
  nodes: { id: string; x: number; y: number; state: "same" | "changed" | "new" | "removed" }[];
  edges: { a: string; b: string; state: "same" | "changed" | "new" | "removed" }[];
};

type FieldSpec<T> = { key: keyof T; label: string; format?: (v: unknown) => string; impact?: (a: unknown, b: unknown) => string | undefined };

const JUNCTION_FIELDS: FieldSpec<Junction>[] = [
  { key: "invertElev", label: "InvertElev", impact: (a, b) => (b! < a! ? "Lowered invert — check freeboard at upstream conduits." : "Raised invert — verify upstream connectivity.") },
  { key: "maxDepth", label: "MaxDepth" },
  { key: "initDepth", label: "InitDepth" },
];
const CONDUIT_FIELDS: FieldSpec<Conduit>[] = [
  { key: "length", label: "Length" },
  { key: "roughness", label: "Roughness", impact: (a, b) => (Number(b) > Number(a) ? "Rougher — slower routing, mild attenuation downstream." : "Smoother — faster routing, less attenuation.") },
  { key: "inOffset", label: "InOffset" },
  { key: "outOffset", label: "OutOffset" },
  { key: "fromNode", label: "FromNode" },
  { key: "toNode", label: "ToNode" },
];
const SUB_FIELDS: FieldSpec<Subcatchment>[] = [
  { key: "areaHa", label: "Area_ha" },
  { key: "pctImperv", label: "PctImperv", impact: (a, b) => (Number(b) > Number(a) ? `More imperviousness — expect higher peak inflow at ${"outlet"}.` : "Less imperviousness — expect lower peak inflow.") },
  { key: "width", label: "Width" },
  { key: "slopePct", label: "Slope" },
  { key: "outlet", label: "Outlet" },
  { key: "cn", label: "CurveNumber" },
];

function diffMap<T>(
  section: Change["section"],
  before: Map<string, T>,
  after: Map<string, T>,
  fields: FieldSpec<T>[]
): Change[] {
  const out: Change[] = [];
  let cid = 0;
  const ids = new Set([...before.keys(), ...after.keys()]);
  for (const id of ids) {
    const a = before.get(id);
    const b = after.get(id);
    if (a && !b) {
      out.push({ id: `${section}-${++cid}`, section, objectId: id, kind: "removed", impact: `Object removed — verify downstream coverage.` });
      continue;
    }
    if (!a && b) {
      out.push({ id: `${section}-${++cid}`, section, objectId: id, kind: "added", impact: `New ${section.toLowerCase().slice(0, -1)} introduced.` });
      continue;
    }
    if (!a || !b) continue;
    for (const f of fields) {
      const va = a[f.key];
      const vb = b[f.key];
      if (va == null && vb == null) continue;
      if (String(va) !== String(vb)) {
        out.push({
          id: `${section}-${++cid}`,
          section,
          objectId: id,
          kind: "modified",
          field: f.label,
          before: f.format ? f.format(va) : String(va),
          after: f.format ? f.format(vb) : String(vb),
          impact: f.impact?.(va, vb),
        });
      }
    }
  }
  return out;
}

/** Synthesize SVG positions deterministically from node IDs. */
function layoutNodes(ids: string[]): { id: string; x: number; y: number }[] {
  // Stable hash-based pseudo-layout so the diff map is the same every refresh.
  return ids.map((id, i) => {
    let h = 0;
    for (let k = 0; k < id.length; k++) h = (h * 31 + id.charCodeAt(k)) | 0;
    const col = i % 6;
    const row = Math.floor(i / 6);
    const jitterX = ((h & 0xff) / 255) * 30 - 15;
    const jitterY = (((h >> 8) & 0xff) / 255) * 30 - 15;
    return { id, x: 60 + col * 90 + jitterX, y: 50 + row * 70 + jitterY };
  });
}

export function diffInp(a: InpModel, b: InpModel, fileA = "modelA.inp", fileB = "modelB.inp"): DiffResult {
  const changes: Change[] = [
    ...diffMap("JUNCTIONS", a.junctions, b.junctions, JUNCTION_FIELDS),
    ...diffMap("CONDUITS", a.conduits, b.conduits, CONDUIT_FIELDS),
    ...diffMap("SUBCATCHMENTS", a.subcatchments, b.subcatchments, SUB_FIELDS),
    // Outfalls / raingages / timeseries: presence-only diff
    ...diffMap("OUTFALLS", a.outfalls, b.outfalls, [{ key: "invertElev", label: "InvertElev" }, { key: "type", label: "Type" }]),
    ...diffMap("RAINGAGES", a.raingages, b.raingages, [{ key: "intervalMin", label: "Interval_min" }, { key: "format", label: "Format" }, { key: "source", label: "Source" }]),
    ...diffMap("TIMESERIES", a.timeseries, b.timeseries, []),
  ];

  const summary = { added: 0, removed: 0, modified: 0 };
  for (const c of changes) summary[c.kind]++;

  // Node/edge map: union of nodes from both models
  const nodeIds = new Set<string>();
  for (const m of [a, b]) {
    for (const id of m.junctions.keys()) nodeIds.add(id);
    for (const id of m.outfalls.keys()) nodeIds.add(id);
    for (const s of m.subcatchments.values()) nodeIds.add(s.id);
  }
  const positioned = layoutNodes([...nodeIds]);
  const changedIds = new Set(changes.filter((c) => c.kind === "modified").map((c) => c.objectId));
  const addedIds = new Set(changes.filter((c) => c.kind === "added").map((c) => c.objectId));
  const removedIds = new Set(changes.filter((c) => c.kind === "removed").map((c) => c.objectId));
  const nodes = positioned.map((n) => ({
    ...n,
    state: (addedIds.has(n.id)
      ? "new"
      : removedIds.has(n.id)
        ? "removed"
        : changedIds.has(n.id)
          ? "changed"
          : "same") as "same" | "changed" | "new" | "removed",
  }));

  const edgeMap = new Map<string, { a: string; b: string; state: "same" | "changed" | "new" | "removed" }>();
  for (const c of a.conduits.values()) edgeMap.set(c.id, { a: c.fromNode, b: c.toNode, state: "same" });
  for (const c of b.conduits.values()) {
    const prev = edgeMap.get(c.id);
    if (!prev) edgeMap.set(c.id, { a: c.fromNode, b: c.toNode, state: "new" });
    else if (prev.a !== c.fromNode || prev.b !== c.toNode || changedIds.has(c.id)) edgeMap.set(c.id, { a: c.fromNode, b: c.toNode, state: "changed" });
  }
  for (const id of a.conduits.keys()) {
    if (!b.conduits.has(id)) {
      const prev = edgeMap.get(id);
      if (prev) edgeMap.set(id, { ...prev, state: "removed" });
    }
  }
  for (const c of changes) {
    if (c.section === "CONDUITS" && c.kind === "modified") {
      const e = edgeMap.get(c.objectId);
      if (e && e.state === "same") e.state = "changed";
    }
  }

  return { fileA, fileB, summary, changes, nodes, edges: [...edgeMap.values()] };
}

/** Hand-built sample so the tool has something to show before the user uploads. */
export const SAMPLE_INP_A = `[TITLE]
BlueSky-ICM demo · lower basin v23

[OPTIONS]
FLOW_UNITS           CMS
INFILTRATION         CURVE_NUMBER
FLOW_ROUTING         KINWAVE
START_DATE           01/01/2025
START_TIME           00:00:00
END_TIME             06:00:00
REPORT_STEP          00:05:00

[RAINGAGES]
RG1  INTENSITY  0:05  1.0  TIMESERIES  TS_RAIN

[SUBCATCHMENTS]
S-301  RG1  J-102   4.20  62  180  1.20  0
S-302  RG1  J-103   3.10  48  150  0.80  0
S-303  RG1  J-104   5.50  55  220  1.60  0

[INFILTRATION]
S-301  78  7
S-302  72  7
S-303  80  7

[JUNCTIONS]
J-101  10.50  3.0  0.0
J-102  10.30  3.0  0.0
J-103  10.20  3.0  0.0
J-104  10.20  3.0  0.0
J-105  10.00  3.0  0.0
J-106   9.80  3.0  0.0

[OUTFALLS]
OUT-1  9.40  FREE

[CONDUITS]
P-201  J-101  J-102  120  0.013  0  0
P-202  J-102  J-103   90  0.013  0  0
P-203  J-103  J-104  110  0.013  0  0
P-204  J-104  J-105  130  0.013  0  0
P-205  J-105  J-106   80  0.013  0  0
P-206  J-106  OUT-1   60  0.013  0  0

[TIMESERIES]
TS_RAIN  0:00  0
TS_RAIN  0:15  8
TS_RAIN  0:30  24
TS_RAIN  0:45  32
TS_RAIN  1:00  18
TS_RAIN  1:15  6
TS_RAIN  1:30  0
`;

export const SAMPLE_INP_B = `[TITLE]
BlueSky-ICM demo · lower basin v24 climate

[OPTIONS]
FLOW_UNITS           CMS
INFILTRATION         CURVE_NUMBER
FLOW_ROUTING         KINWAVE
START_DATE           01/01/2025
START_TIME           00:00:00
END_TIME             06:00:00
REPORT_STEP          00:05:00

[RAINGAGES]
RG1  INTENSITY  0:05  1.0  TIMESERIES  TS_RAIN_100Y

[SUBCATCHMENTS]
S-301  RG1  J-102   4.20  71  180  1.20  0
S-303  RG1  J-104   5.50  55  220  1.60  0
S-304  RG1  J-105   4.20  68  200  1.40  0

[INFILTRATION]
S-301  78  7
S-303  80  7
S-304  74  7

[JUNCTIONS]
J-101  10.50  3.0  0.0
J-102  10.30  3.0  0.0
J-103  10.20  3.0  0.0
J-104  10.05  3.0  0.0
J-105  10.00  3.0  0.0
J-106   9.80  3.0  0.0

[OUTFALLS]
OUT-1  9.40  FREE

[CONDUITS]
P-201  J-101  J-102  120  0.013  0  0
P-202  J-102  J-103   90  0.013  0  0
P-203  J-103  J-104  110  0.013  0  0
P-204  J-104  J-105  130  0.015  0  0
P-205  J-105  J-106   80  0.015  0  0
P-206  J-106  OUT-1   60  0.013  0  0

[TIMESERIES]
TS_RAIN_100Y  0:00  0
TS_RAIN_100Y  0:15  10
TS_RAIN_100Y  0:30  30
TS_RAIN_100Y  0:45  42
TS_RAIN_100Y  1:00  24
TS_RAIN_100Y  1:15  8
TS_RAIN_100Y  1:30  0
`;
