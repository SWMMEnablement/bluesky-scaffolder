/**
 * SWMM5 binary .out reader.
 *
 * Layout (little-endian, EPA SWMM5 spec §28):
 *   Opening:   identifier(4), version, flowUnits, nSub, nNode, nLink, nPoll
 *   Object IDs (variable-length strings, length-prefixed int32)
 *   Object properties (skipped here; offsets recomputed analytically)
 *   Reporting variables block (skipped)
 *   Reporting interval + start date (Float64 days since 1899-12-30)
 *   Computed results (nPeriods × per-step block)
 *   Closing records: byteOffset to ID table, byteOffset to props, byteOffset to start of results, nPeriods, errorCode, identifier
 *
 * We only need: object IDs, nPeriods, reportStep, start date, and on-demand
 * per-series reads. The per-step block size is computed from counts so we
 * can seek directly into the results.
 *
 * SWMM5 per-step variable counts (always-present, no pollutants here):
 *   subcatchment vars: 8
 *   node vars:         6
 *   link vars:         5
 *   system vars:      14
 */
import type { OutTimeseries } from "./types";

const SUB_VARS = 8;
const NODE_VARS = 6;
const LINK_VARS = 5;
const SYS_VARS = 14;

function readString(view: DataView, offset: number): { value: string; next: number } {
  const len = view.getInt32(offset, true);
  offset += 4;
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, len);
  let value = "";
  for (let i = 0; i < len; i++) value += String.fromCharCode(bytes[i]);
  return { value, next: offset + len };
}

export function parseOut(buffer: ArrayBuffer): OutTimeseries {
  const view = new DataView(buffer);
  const totalLen = buffer.byteLength;

  // Closing block: last 6 × int32 (24 bytes)
  const idTableOffset = view.getInt32(totalLen - 24, true);
  const propsOffset = view.getInt32(totalLen - 20, true);
  const resultsOffset = view.getInt32(totalLen - 16, true);
  const nPeriods = view.getInt32(totalLen - 12, true);
  // errorCode at -8, magic at -4

  // Opening: identifier(4) magic, version(4), flowUnits(4), nSub(4), nNode(4), nLink(4), nPoll(4)
  const nSub = view.getInt32(12, true);
  const nNode = view.getInt32(16, true);
  const nLink = view.getInt32(20, true);
  const nPoll = view.getInt32(24, true);

  // Object IDs
  let off = idTableOffset;
  const subcatchments: string[] = [];
  const nodes: string[] = [];
  const links: string[] = [];
  for (let i = 0; i < nSub; i++) {
    const r = readString(view, off);
    subcatchments.push(r.value);
    off = r.next;
  }
  for (let i = 0; i < nNode; i++) {
    const r = readString(view, off);
    nodes.push(r.value);
    off = r.next;
  }
  for (let i = 0; i < nLink; i++) {
    const r = readString(view, off);
    links.push(r.value);
    off = r.next;
  }
  // pollutant names skipped — not used

  // Reporting period: stored just before results block as
  // [Float64 startDate(days)] [Int32 reportStep(sec)]
  const startDateDays = view.getFloat64(resultsOffset - 12, true);
  const reportStepSec = view.getInt32(resultsOffset - 4, true);
  // SWMM date origin: days since 1899-12-30
  const startEpochMs = Math.round((startDateDays - 25569) * 86400 * 1000);

  // Per-step block: float32 time(8 bytes float64) + nSub*SUB_VARS + nNode*NODE_VARS + nLink*LINK_VARS + SYS_VARS, all float32
  // Note: SWMM5 actually writes the report time at the start of each period as Float64 (datetime).
  const stepBytes =
    8 + (nSub * SUB_VARS + nNode * NODE_VARS + nLink * LINK_VARS + SYS_VARS + nPoll * (nSub + nNode + nLink)) * 4;

  function readNodeSeries(id: string, varIndex: number): Float32Array {
    const idx = nodes.indexOf(id);
    if (idx < 0) return new Float32Array();
    const out = new Float32Array(nPeriods);
    // Offset within a step block to start of node area:
    const nodeBase = 8 + nSub * SUB_VARS * 4;
    for (let p = 0; p < nPeriods; p++) {
      const stepStart = resultsOffset + p * stepBytes;
      const at = stepStart + nodeBase + (idx * NODE_VARS + varIndex) * 4;
      out[p] = view.getFloat32(at, true);
    }
    return out;
  }

  function readLinkSeries(id: string, varIndex: number): Float32Array {
    const idx = links.indexOf(id);
    if (idx < 0) return new Float32Array();
    const out = new Float32Array(nPeriods);
    const linkBase = 8 + (nSub * SUB_VARS + nNode * NODE_VARS) * 4;
    for (let p = 0; p < nPeriods; p++) {
      const stepStart = resultsOffset + p * stepBytes;
      const at = stepStart + linkBase + (idx * LINK_VARS + varIndex) * 4;
      out[p] = view.getFloat32(at, true);
    }
    return out;
  }

  return {
    nPeriods,
    reportStepSec,
    startEpochMs,
    subcatchments,
    nodes,
    links,
    readNodeSeries,
    readLinkSeries,
  };
  // Unused-but-validated bookkeeping
  void propsOffset;
}
