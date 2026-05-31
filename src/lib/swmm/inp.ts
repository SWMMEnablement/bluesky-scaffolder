/**
 * SWMM5 .inp parser — real, section-aware, no regex bonfire.
 *
 * Only parses sections BlueSky-ICM actually uses. Unknown sections are kept
 * verbatim under InpModel.rawSections so ModelDiff can still surface them.
 */

import type {
  Conduit,
  InpModel,
  Junction,
  Outfall,
  Raingage,
  Subcatchment,
  TimeSeries,
} from "./types";

const SECTION_RE = /^\s*\[([A-Z0-9_]+)\]\s*$/i;

/** Split file into [SECTION_NAME] -> lines (comments + headers stripped). */
function splitSections(text: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  let current = "__PROLOGUE__";
  out.set(current, []);
  for (const rawLine of text.split(/\r?\n/)) {
    const m = SECTION_RE.exec(rawLine);
    if (m) {
      current = m[1].toUpperCase();
      if (!out.has(current)) out.set(current, []);
      continue;
    }
    out.get(current)!.push(rawLine);
  }
  return out;
}

/** Iterate non-blank, non-comment data rows. Returns tokens per row. */
function* dataRows(lines: string[]): Generator<string[]> {
  for (const raw of lines) {
    const stripped = raw.replace(/;.*$/, "").trim();
    if (!stripped) continue;
    yield stripped.split(/\s+/);
  }
}

function rawText(lines: string[]): string {
  return lines.join("\n").trim();
}

function num(v: string | undefined, fallback = 0): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function parseInp(text: string): InpModel {
  const sections = splitSections(text);

  const model: InpModel = {
    title: "",
    options: {},
    junctions: new Map(),
    outfalls: new Map(),
    conduits: new Map(),
    subcatchments: new Map(),
    raingages: new Map(),
    timeseries: new Map(),
    rawSections: new Map(),
  };

  for (const [name, lines] of sections) {
    if (name !== "__PROLOGUE__") model.rawSections.set(name, rawText(lines));
  }

  const title = sections.get("TITLE");
  if (title) model.title = rawText(title);

  const opts = sections.get("OPTIONS");
  if (opts) {
    for (const tk of dataRows(opts)) {
      if (tk.length >= 2) model.options[tk[0].toUpperCase()] = tk.slice(1).join(" ");
    }
  }

  const junc = sections.get("JUNCTIONS");
  if (junc) {
    for (const t of dataRows(junc)) {
      const j: Junction = {
        id: t[0],
        invertElev: num(t[1]),
        maxDepth: num(t[2]),
        initDepth: num(t[3]),
      };
      model.junctions.set(j.id, j);
    }
  }

  const out = sections.get("OUTFALLS");
  if (out) {
    for (const t of dataRows(out)) {
      const o: Outfall = {
        id: t[0],
        invertElev: num(t[1]),
        type: ((t[2] ?? "FREE").toUpperCase() as Outfall["type"]) ?? "FREE",
      };
      model.outfalls.set(o.id, o);
    }
  }

  const cond = sections.get("CONDUITS");
  if (cond) {
    for (const t of dataRows(cond)) {
      const c: Conduit = {
        id: t[0],
        fromNode: t[1],
        toNode: t[2],
        length: num(t[3]),
        roughness: num(t[4]),
        inOffset: num(t[5]),
        outOffset: num(t[6]),
      };
      model.conduits.set(c.id, c);
    }
  }

  const sub = sections.get("SUBCATCHMENTS");
  if (sub) {
    for (const t of dataRows(sub)) {
      // Name Raingage Outlet Area %Imperv Width Slope CurbLen [SnowPack]
      const s: Subcatchment = {
        id: t[0],
        raingage: t[1],
        outlet: t[2],
        areaHa: num(t[3]),
        pctImperv: num(t[4]),
        width: num(t[5]),
        slopePct: num(t[6]),
      };
      model.subcatchments.set(s.id, s);
    }
  }

  // [INFILTRATION] CN method: Name CN  DryTime
  const infil = sections.get("INFILTRATION");
  if (infil && (model.options.INFILTRATION ?? "").toUpperCase() === "CURVE_NUMBER") {
    for (const t of dataRows(infil)) {
      const s = model.subcatchments.get(t[0]);
      if (s) s.cn = num(t[1]);
    }
  }

  const rg = sections.get("RAINGAGES");
  if (rg) {
    for (const t of dataRows(rg)) {
      // Name Format Interval SCF Source
      const intervalStr = t[2] ?? "0:05";
      const [h, m] = intervalStr.split(":").map(Number);
      const intervalMin = (Number.isFinite(h) ? h * 60 : 0) + (Number.isFinite(m) ? m : 0);
      const r: Raingage = {
        id: t[0],
        format: ((t[1] ?? "INTENSITY").toUpperCase() as Raingage["format"]) ?? "INTENSITY",
        intervalMin: intervalMin || 5,
        source: t.slice(4).join(" "),
      };
      model.raingages.set(r.id, r);
    }
  }

  const ts = sections.get("TIMESERIES");
  if (ts) {
    // Name (Date) Time Value  — minutes-from-zero if Date omitted, else date+time.
    // We collapse everything into minutes from the first row of each series.
    const byName = new Map<string, { t: number; v: number }[]>();
    let baseEpoch: Map<string, number> = new Map();
    for (const t of dataRows(ts)) {
      const name = t[0];
      let timeMin = 0;
      let value = 0;
      // Heuristic: if t[1] looks like a date (mm/dd/yyyy), use date+time
      const looksLikeDate = /\d+\/\d+\/\d+/.test(t[1] ?? "");
      if (looksLikeDate) {
        const [mo, da, yr] = t[1].split("/").map(Number);
        const [hh, mm] = (t[2] ?? "0:00").split(":").map(Number);
        const epoch = Date.UTC(yr, mo - 1, da, hh, mm) / 60000;
        if (!baseEpoch.has(name)) baseEpoch.set(name, epoch);
        timeMin = epoch - (baseEpoch.get(name) ?? epoch);
        value = num(t[3]);
      } else {
        const [hh, mm] = (t[1] ?? "0:00").split(":").map(Number);
        timeMin = (Number.isFinite(hh) ? hh * 60 : 0) + (Number.isFinite(mm) ? mm : 0);
        value = num(t[2]);
      }
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name)!.push({ t: timeMin, v: value });
    }
    for (const [name, points] of byName) {
      points.sort((a, b) => a.t - b.t);
      model.timeseries.set(name, { id: name, points } as TimeSeries);
    }
  }

  return model;
}

/** Convenience: read a File and parse it. Browser-only. */
export async function parseInpFile(file: File): Promise<InpModel> {
  const text = await file.text();
  return parseInp(text);
}
