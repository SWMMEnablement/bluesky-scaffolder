/**
 * SWMM5 .rpt parser — extracts the summary tables that CalibrationCopilot
 * and FloodLensAI consume. Tolerant: returns empty arrays if a table is
 * missing rather than throwing.
 */
import type { RptSummary } from "./types";

function findSection(text: string, header: string): string[] | null {
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.includes(header));
  if (idx < 0) return null;
  // Walk forward until two blank lines or the next ALL-CAPS heading underline.
  const start = idx + 1;
  let end = start;
  let blanks = 0;
  while (end < lines.length) {
    const l = lines[end];
    if (l.trim() === "") {
      blanks++;
      if (blanks >= 2) break;
    } else blanks = 0;
    if (end > start + 4 && /^\s*\*{5,}/.test(l)) break;
    end++;
  }
  return lines.slice(start, end);
}

function numOr0(s: string | undefined): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function parseRpt(text: string): RptSummary {
  const out: RptSummary = {
    continuityErrorPct: 0,
    nodes: [],
    links: [],
    subcatchments: [],
  };

  // Flow Routing Continuity ... "Continuity Error (%)  XXXX"
  const contMatch = /Continuity Error \(%\)[^\n]*?(-?[\d.]+)/.exec(text);
  if (contMatch) out.continuityErrorPct = numOr0(contMatch[1]);

  const nodeFlood = findSection(text, "Node Flooding Summary");
  if (nodeFlood) {
    for (const l of nodeFlood) {
      const tk = l.trim().split(/\s+/);
      if (tk.length < 6 || !/^[\w-]+$/.test(tk[0])) continue;
      // ID  HrsFlooded  MaxRate  TimeOfMax  TotalFloodVol  MaxPondedDepth
      out.nodes.push({
        id: tk[0],
        floodedHours: numOr0(tk[1]),
        maxDepthM: numOr0(tk[5]),
        maxHgl: 0,
        floodVolMl: numOr0(tk[4]),
      });
    }
  }

  const nodeDepth = findSection(text, "Node Depth Summary");
  if (nodeDepth) {
    for (const l of nodeDepth) {
      const tk = l.trim().split(/\s+/);
      if (tk.length < 5 || !/^[\w-]+$/.test(tk[0])) continue;
      // ID Type AvgDepth MaxDepth MaxHGL ...
      const existing = out.nodes.find((n) => n.id === tk[0]);
      if (existing) {
        existing.maxDepthM = Math.max(existing.maxDepthM, numOr0(tk[3]));
        existing.maxHgl = numOr0(tk[4]);
      } else {
        out.nodes.push({
          id: tk[0],
          maxDepthM: numOr0(tk[3]),
          maxHgl: numOr0(tk[4]),
          floodedHours: 0,
          floodVolMl: 0,
        });
      }
    }
  }

  const linkFlow = findSection(text, "Link Flow Summary");
  if (linkFlow) {
    for (const l of linkFlow) {
      const tk = l.trim().split(/\s+/);
      if (tk.length < 6 || !/^[\w-]+$/.test(tk[0])) continue;
      // ID Type MaxFlow Day HrMin MaxVel ...
      out.links.push({
        id: tk[0],
        maxFlowM3s: numOr0(tk[2]),
        timeOfPeakHr: 0,
        maxVelocityMs: numOr0(tk[5]),
      });
    }
  }

  const sub = findSection(text, "Subcatchment Runoff Summary");
  if (sub) {
    for (const l of sub) {
      const tk = l.trim().split(/\s+/);
      if (tk.length < 4 || !/^[\w-]+$/.test(tk[0])) continue;
      // ID TotalPrecip TotalRunon TotalEvap TotalInfil ImpervRunoff PervRunoff TotalRunoff TotalRunoffMG PeakRunoff RunoffCoef
      out.subcatchments.push({
        id: tk[0],
        totalPrecipMm: numOr0(tk[1]),
        totalRunoffMm: numOr0(tk[7]),
        runoffCoef: numOr0(tk[10]),
      });
    }
  }

  return out;
}
