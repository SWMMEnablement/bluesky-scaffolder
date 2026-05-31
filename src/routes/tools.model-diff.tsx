import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Upload, GitCompare, RotateCcw } from "lucide-react";
import { getTool } from "@/lib/tools/registry";
import { ComputeSeam, KpiTile, Panel, StatusPill, ToolPageHeader } from "@/components/tool-kit";
import { diffInp, SAMPLE_INP_A, SAMPLE_INP_B, type Change, type DiffResult } from "@/lib/model-diff/engine";
import { parseInp } from "@/lib/swmm/inp";
import { toast } from "sonner";

const tool = getTool("model-diff");

export const Route = createFileRoute("/tools/model-diff")({
  head: () => ({
    meta: [
      { title: "ModelDiff — BlueSky-ICM" },
      {
        name: "description",
        content:
          "Diff two SWMM .inp versions: network map, change list for conduits, subcatchments and controls, plus hydraulic impact notes.",
      },
      { property: "og:title", content: "ModelDiff — BlueSky-ICM" },
      {
        property: "og:description",
        content: "Like git-diff, but for SWMM5 / InfoWorks ICM models.",
      },
    ],
  }),
  component: ModelDiffPage,
});

const SECTION_FILTERS = ["ALL", "CONDUITS", "JUNCTIONS", "SUBCATCHMENTS", "OUTFALLS", "RAINGAGES", "TIMESERIES"] as const;

function computeSample(): DiffResult {
  return diffInp(parseInp(SAMPLE_INP_A), parseInp(SAMPLE_INP_B), "lower_basin_v23.inp", "lower_basin_v24_climate.inp");
}

function ModelDiffPage() {
  const [diff, setDiff] = useState<DiffResult>(() => computeSample());
  const [filter, setFilter] = useState<(typeof SECTION_FILTERS)[number]>("ALL");
  const [selected, setSelected] = useState<Change | null>(diff.changes[0] ?? null);
  const [fileA, setFileA] = useState<string>(diff.fileA);
  const [fileB, setFileB] = useState<string>(diff.fileB);
  const [rawA, setRawA] = useState<string>(SAMPLE_INP_A);
  const [rawB, setRawB] = useState<string>(SAMPLE_INP_B);

  useEffect(() => {
    try {
      const d = diffInp(parseInp(rawA), parseInp(rawB), fileA, fileB);
      setDiff(d);
      setSelected(d.changes[0] ?? null);
    } catch (err) {
      toast("Diff failed", { description: err instanceof Error ? err.message : "Parse error" });
    }
  }, [rawA, rawB, fileA, fileB]);

  async function pickFile(slot: "A" | "B", e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const text = await f.text();
    if (slot === "A") { setFileA(f.name); setRawA(text); }
    else { setFileB(f.name); setRawB(text); }
    toast(`Loaded ${f.name}`, { description: `${(text.length / 1024).toFixed(1)} KB` });
  }

  function reset() {
    setFileA("lower_basin_v23.inp"); setFileB("lower_basin_v24_climate.inp");
    setRawA(SAMPLE_INP_A); setRawB(SAMPLE_INP_B);
  }

  const changes = filter === "ALL" ? diff.changes : diff.changes.filter((c) => c.section === filter);

  return (
    <>
      <ToolPageHeader index={tool.index} tag={tool.tag} name={tool.name} pitch={tool.description} />

      <section className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <UploadSlot label="MODEL A" file={fileA} onPick={(e) => pickFile("A", e)} />
          <div className="flex items-center justify-center gap-3">
            <div className="rounded-full border border-border bg-surface p-3">
              <GitCompare className="size-5 text-primary" />
            </div>
            <button onClick={reset} className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground">
              <RotateCcw className="size-3" /> reset to sample
            </button>
          </div>
          <UploadSlot label="MODEL B" file={fileB} onPick={(e) => pickFile("B", e)} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiTile label="Modified" value={String(diff.summary.modified)} tone="primary" />
          <KpiTile label="Added" value={String(diff.summary.added)} tone="good" />
          <KpiTile label="Removed" value={String(diff.summary.removed)} tone="bad" />
          <KpiTile label="Touched objects" value={String(new Set(diff.changes.map((c) => c.objectId)).size)} delta={`across ${new Set(diff.changes.map((c) => c.section)).size} sections`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Panel title="Network map" meta={`${diff.nodes.length} nodes · ${diff.edges.length} links`} className="lg:col-span-7">
            <NetworkMap diff={diff} />
            <Legend />
          </Panel>

          <Panel title="Change list" meta={`${changes.length} of ${diff.changes.length}`} className="lg:col-span-5">
            <div className="flex flex-wrap gap-1 mb-3">
              {SECTION_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    filter === s
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <ul className="divide-y divide-border max-h-[420px] overflow-auto rounded border border-border">
              {changes.length === 0 && (
                <li className="px-3 py-6 text-center text-xs font-mono text-muted-foreground">No changes in this section</li>
              )}
              {changes.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelected(c)}
                    className={`w-full text-left px-3 py-2 hover:bg-secondary/40 transition-colors ${
                      selected?.id === c.id ? "bg-primary/[0.08]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-foreground">{c.objectId}</span>
                      <KindBadge kind={c.kind} />
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {c.section}{c.field ? ` · ${c.field}` : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {selected && (
          <Panel title={`Detail · ${selected.objectId}`} meta={selected.section}>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <KindBadge kind={selected.kind} />
                  {selected.field && (
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      Field · {selected.field}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded border border-border bg-background p-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Before</p>
                    <p className="font-mono text-sm">{selected.before ?? "—"}</p>
                  </div>
                  <div className="rounded border border-primary/40 bg-primary/[0.06] p-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-1">After</p>
                    <p className="font-mono text-sm text-primary">{selected.after ?? "—"}</p>
                  </div>
                </div>
              </div>
              <div className="rounded border border-border bg-background p-4">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Heuristic impact</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{selected.impact ?? "No impact heuristic for this field."}</p>
              </div>
            </div>
          </Panel>
        )}
      </section>

      <ComputeSeam
        real="Real .inp parsing: tokenized section-by-section into a typed InpModel; the change set above is computed field-by-field, not mocked."
        note={tool.computeSeam}
      />
    </>
  );
}

function UploadSlot({ label, file, onPick }: { label: string; file: string; onPick: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="block rounded-lg border border-dashed border-border bg-surface p-4 cursor-pointer hover:border-primary/50 transition-colors">
      <input type="file" accept=".inp,.txt" className="hidden" onChange={onPick} />
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        <Upload className="size-3.5 text-muted-foreground" />
      </div>
      <p className="font-mono text-sm text-foreground truncate">{file}</p>
      <p className="text-[10px] font-mono text-muted-foreground mt-1">SWMM5 .inp · parsed in-browser</p>
    </label>
  );
}

function KindBadge({ kind }: { kind: Change["kind"] }) {
  if (kind === "added") return <StatusPill tone="good">+ added</StatusPill>;
  if (kind === "removed") return <StatusPill tone="bad">− removed</StatusPill>;
  return <StatusPill tone="primary">~ modified</StatusPill>;
}

function NetworkMap({ diff }: { diff: DiffResult }) {
  const colorFor = (state: string) =>
    state === "new" ? "var(--success)"
    : state === "removed" ? "var(--accent)"
    : state === "changed" ? "var(--primary)"
    : "var(--muted-foreground)";

  const W = Math.max(600, ...diff.nodes.map((n) => n.x + 40));
  const H = Math.max(280, ...diff.nodes.map((n) => n.y + 40));

  return (
    <div className="rounded border border-border bg-background overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[320px] bg-grid">
        {diff.edges.map((e, i) => {
          const a = diff.nodes.find((n) => n.id === e.a);
          const b = diff.nodes.find((n) => n.id === e.b);
          if (!a || !b) return null;
          const stroke = colorFor(e.state);
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke}
              strokeWidth={e.state === "same" ? 1.5 : 2.2}
              strokeDasharray={e.state === "new" ? "4 3" : undefined}
              opacity={e.state === "same" ? 0.5 : 1} />
          );
        })}
        {diff.nodes.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={n.id.startsWith("S-") ? 7 : 5}
              fill="var(--background)" stroke={colorFor(n.state)}
              strokeWidth={n.state === "same" ? 1.5 : 2.4} />
            <text x={n.x + 8} y={n.y - 6} fontSize={9}
              fill="var(--muted-foreground)" fontFamily="var(--font-mono)">{n.id}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Legend() {
  const items = [
    { label: "Unchanged", color: "var(--muted-foreground)" },
    { label: "Modified", color: "var(--primary)" },
    { label: "Added", color: "var(--success)" },
    { label: "Removed", color: "var(--accent)" },
  ];
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
          <span className="size-2 rounded-full" style={{ backgroundColor: i.color }} />{i.label}
        </span>
      ))}
    </div>
  );
}
