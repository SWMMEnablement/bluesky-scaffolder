import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, GitCompare } from "lucide-react";
import { getTool } from "@/lib/tools/registry";
import { ComputeSeam, KpiTile, Panel, StatusPill, ToolPageHeader } from "@/components/tool-kit";
import { MOCK_DIFF, type Change } from "@/lib/model-diff/engine";
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

const SECTION_FILTERS = ["ALL", "CONDUITS", "JUNCTIONS", "SUBCATCHMENTS", "CONTROLS", "TIMESERIES"] as const;

function ModelDiffPage() {
  const [filter, setFilter] = useState<(typeof SECTION_FILTERS)[number]>("ALL");
  const [selected, setSelected] = useState<Change | null>(MOCK_DIFF.changes[0]);

  const changes =
    filter === "ALL" ? MOCK_DIFF.changes : MOCK_DIFF.changes.filter((c) => c.section === filter);

  function onUpload() {
    toast("Concept build — using sample diff", {
      description: "lower_basin_v23.inp ↔ lower_basin_v24_climate.inp",
    });
  }

  return (
    <>
      <ToolPageHeader index={tool.index} tag={tool.tag} name={tool.name} pitch={tool.description} />

      <section className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Upload row */}
        <div className="grid md:grid-cols-3 gap-4">
          <UploadSlot label="MODEL A" file={MOCK_DIFF.fileA} onUpload={onUpload} />
          <div className="flex items-center justify-center">
            <div className="rounded-full border border-border bg-surface p-3">
              <GitCompare className="size-5 text-primary" />
            </div>
          </div>
          <UploadSlot label="MODEL B" file={MOCK_DIFF.fileB} onUpload={onUpload} />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiTile label="Modified" value={String(MOCK_DIFF.summary.modified)} tone="primary" />
          <KpiTile label="Added" value={String(MOCK_DIFF.summary.added)} tone="good" />
          <KpiTile label="Removed" value={String(MOCK_DIFF.summary.removed)} tone="bad" />
          <KpiTile label="Touched objects" value="15" delta="across 5 sections" />
        </div>

        {/* Map + change list */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Panel
            title="Network map"
            meta={`${MOCK_DIFF.nodes.length} nodes · ${MOCK_DIFF.edges.length} links`}
            className="lg:col-span-7"
          >
            <NetworkMap />
            <Legend />
          </Panel>

          <Panel title="Change list" meta={`${changes.length} of ${MOCK_DIFF.changes.length}`} className="lg:col-span-5">
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
                      {c.section}
                      {c.field ? ` · ${c.field}` : ""}
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
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                      Before
                    </p>
                    <p className="font-mono text-sm">{selected.before ?? "—"}</p>
                  </div>
                  <div className="rounded border border-primary/40 bg-primary/[0.06] p-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-1">
                      After
                    </p>
                    <p className="font-mono text-sm text-primary">{selected.after ?? "—"}</p>
                  </div>
                </div>
              </div>
              <div className="rounded border border-border bg-background p-4">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                  Hydraulic impact
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">{selected.impact}</p>
              </div>
            </div>
          </Panel>
        )}
      </section>

      <ComputeSeam note={tool.computeSeam} />
    </>
  );
}

function UploadSlot({ label, file, onUpload }: { label: string; file: string; onUpload: () => void }) {
  return (
    <label className="block rounded-lg border border-dashed border-border bg-surface p-4 cursor-pointer hover:border-primary/50 transition-colors">
      <input
        type="file"
        accept=".inp,.iedb"
        className="hidden"
        onChange={(e) => {
          e.target.value = "";
          onUpload();
        }}
      />
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Upload className="size-3.5 text-muted-foreground" />
      </div>
      <p className="font-mono text-sm text-foreground truncate">{file}</p>
      <p className="text-[10px] font-mono text-muted-foreground mt-1">
        .inp / .iedb · sample loaded
      </p>
    </label>
  );
}

function KindBadge({ kind }: { kind: Change["kind"] }) {
  if (kind === "added") return <StatusPill tone="good">+ added</StatusPill>;
  if (kind === "removed") return <StatusPill tone="bad">− removed</StatusPill>;
  return <StatusPill tone="primary">~ modified</StatusPill>;
}

function NetworkMap() {
  const colorFor = (state: string) =>
    state === "new"
      ? "var(--success)"
      : state === "removed"
        ? "var(--accent)"
        : state === "changed"
          ? "var(--primary)"
          : "var(--muted-foreground)";

  return (
    <div className="rounded border border-border bg-background overflow-hidden">
      <svg viewBox="0 0 600 280" className="w-full h-[280px] bg-grid">
        {MOCK_DIFF.edges.map((e, i) => {
          const a = MOCK_DIFF.nodes.find((n) => n.id === e.a);
          const b = MOCK_DIFF.nodes.find((n) => n.id === e.b);
          if (!a || !b) return null;
          const stroke = colorFor(e.state);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={stroke}
              strokeWidth={e.state === "same" ? 1.5 : 2.2}
              strokeDasharray={e.state === "new" ? "4 3" : undefined}
              opacity={e.state === "same" ? 0.5 : 1}
            />
          );
        })}
        {MOCK_DIFF.nodes.map((n) => (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r={n.id.startsWith("S-") ? 7 : 5}
              fill="var(--background)"
              stroke={colorFor(n.state)}
              strokeWidth={n.state === "same" ? 1.5 : 2.4}
            />
            <text
              x={n.x + 8}
              y={n.y - 6}
              fontSize={9}
              fill="var(--muted-foreground)"
              fontFamily="var(--font-mono)"
            >
              {n.id}
            </text>
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
          <span className="size-2 rounded-full" style={{ backgroundColor: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
