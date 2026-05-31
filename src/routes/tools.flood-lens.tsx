import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import { getTool } from "@/lib/tools/registry";
import { ComputeSeam, KpiTile, Panel, ToolPageHeader } from "@/components/tool-kit";
import {
  hazardColor,
  hazardOrder,
  MOCK_BUILDINGS,
  summarize,
  type BuildingAssessment,
  type HazardRating,
} from "@/lib/flood-lens/engine";
import { getProvider } from "@/lib/swmm/provider";
import { toast } from "sonner";

const tool = getTool("flood-lens");

export const Route = createFileRoute("/tools/flood-lens")({
  head: () => ({
    meta: [
      { title: "FloodLensAI — BlueSky-ICM" },
      {
        name: "description",
        content:
          "Per-building flood depth, duration, hazard rating and damage estimates from 2D ICM mesh results.",
      },
      { property: "og:title", content: "FloodLensAI — BlueSky-ICM" },
      {
        property: "og:description",
        content: "Lens a 2D flood result through a building footprint layer.",
      },
    ],
  }),
  component: FloodLensPage,
});

const HAZARDS: HazardRating[] = ["low", "moderate", "significant", "extreme"];

function FloodLensPage() {
  const [activeHazards, setActiveHazards] = useState<Set<HazardRating>>(new Set(HAZARDS));
  const [selected, setSelected] = useState<BuildingAssessment | null>(null);

  const filtered = useMemo(
    () => MOCK_BUILDINGS.filter((b) => activeHazards.has(b.hazard)),
    [activeHazards]
  );
  const summary = useMemo(() => summarize(filtered), [filtered]);

  function toggle(h: HazardRating) {
    setActiveHazards((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next.size === 0 ? new Set(HAZARDS) : next;
    });
  }

  function exportCsv() {
    const header = "id,use,area_m2,depth_m,duration_min,velocity_ms,hazard,damage_gbp\n";
    const rows = filtered
      .map(
        (b) =>
          `${b.id},${b.use},${b.area},${b.maxDepthM},${b.durationMin},${b.velocityMs},${b.hazard},${b.damageGbp}`
      )
      .join("\n");
    navigator.clipboard?.writeText(header + rows);
    toast("Copied CSV to clipboard", { description: `${filtered.length} buildings` });
  }

  return (
    <>
      <ToolPageHeader index={tool.index} tag={tool.tag} name={tool.name} pitch={tool.description} />

      <section className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiTile label="Buildings in extent" value={String(summary.total)} delta={`of ${MOCK_BUILDINGS.length} total`} />
          <KpiTile
            label="Significant or worse"
            value={String(summary.byHazard.significant + summary.byHazard.extreme)}
            tone="bad"
          />
          <KpiTile
            label="Direct damages"
            value={`£${(summary.totalDamageGbp / 1000).toFixed(0)}k`}
            tone="primary"
            delta="depth-damage curve · indicative"
          />
          <KpiTile label="Critical assets hit" value={String(filtered.filter((b) => b.use === "critical").length)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Panel title="Hazard map" meta={`${filtered.length} buildings`} className="lg:col-span-7">
            <FloodMap buildings={filtered} selected={selected} onSelect={setSelected} />
            <div className="mt-3 flex flex-wrap gap-2">
              {HAZARDS.map((h) => {
                const on = activeHazards.has(h);
                return (
                  <button
                    key={h}
                    onClick={() => toggle(h)}
                    className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition-opacity ${
                      on ? "" : "opacity-40"
                    }`}
                    style={{ borderColor: hazardColor(h) }}
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: hazardColor(h) }} />
                    {h} · {summary.byHazard[h]}
                  </button>
                );
              })}
              <button
                onClick={exportCsv}
                className="ml-auto inline-flex items-center gap-1.5 rounded border border-border bg-secondary/40 px-2 py-1 text-[10px] font-mono uppercase tracking-wider hover:text-foreground hover:bg-secondary"
              >
                <Download className="size-3" /> CSV
              </button>
            </div>
          </Panel>

          <Panel title="Building list" meta="Sorted by hazard then depth" className="lg:col-span-5">
            <ul className="divide-y divide-border max-h-[460px] overflow-auto rounded border border-border">
              {[...filtered]
                .sort((a, b) => hazardOrder(b.hazard) - hazardOrder(a.hazard) || b.maxDepthM - a.maxDepthM)
                .map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => setSelected(b)}
                      className={`w-full text-left px-3 py-2 hover:bg-secondary/40 transition-colors ${
                        selected?.id === b.id ? "bg-primary/[0.08]" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs">{b.id}</span>
                        <HazardPill h={b.hazard} />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-muted-foreground">
                        <span className="uppercase">{b.use}</span>
                        <span>
                          {b.maxDepthM.toFixed(2)} m · {b.durationMin}min · £{(b.damageGbp / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
            </ul>
          </Panel>
        </div>

        {selected && (
          <Panel title={`Asset detail · ${selected.id}`} meta={selected.use.toUpperCase()}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Field label="Max depth" value={`${selected.maxDepthM.toFixed(2)} m`} />
              <Field label="Duration" value={`${selected.durationMin} min`} />
              <Field label="Peak velocity" value={`${selected.velocityMs.toFixed(2)} m/s`} />
              <Field label="Floor area" value={`${selected.area} m²`} />
              <Field label="Damage" value={`£${selected.damageGbp.toLocaleString()}`} tone="primary" />
            </div>
          </Panel>
        )}
      </section>

      <ComputeSeam note={tool.computeSeam} />
    </>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <div className="rounded border border-border bg-background p-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={`font-mono text-sm ${tone === "primary" ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function HazardPill({ h }: { h: HazardRating }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider"
      style={{ color: hazardColor(h), borderColor: hazardColor(h), backgroundColor: `color-mix(in oklab, ${hazardColor(h)} 12%, transparent)` }}
    >
      {h}
    </span>
  );
}

function FloodMap({
  buildings,
  selected,
  onSelect,
}: {
  buildings: BuildingAssessment[];
  selected: BuildingAssessment | null;
  onSelect: (b: BuildingAssessment) => void;
}) {
  return (
    <div className="rounded border border-border bg-background overflow-hidden">
      <svg viewBox="0 0 100 90" className="w-full h-[360px] bg-grid">
        {/* River sketch */}
        <path
          d="M -2 78 C 20 70, 35 82, 55 72 S 88 60, 110 70"
          stroke="var(--primary)"
          strokeWidth={3}
          fill="none"
          opacity={0.25}
        />
        <path
          d="M -2 78 C 20 70, 35 82, 55 72 S 88 60, 110 70"
          stroke="var(--primary)"
          strokeWidth={1}
          fill="none"
          opacity={0.7}
          strokeDasharray="1 2"
        />
        {buildings.map((b) => {
          const isSel = selected?.id === b.id;
          const r = 1.4 + b.maxDepthM * 0.9;
          return (
            <g key={b.id} onClick={() => onSelect(b)} style={{ cursor: "pointer" }}>
              <circle
                cx={b.x}
                cy={b.y}
                r={r + 0.6}
                fill={hazardColor(b.hazard)}
                opacity={0.18}
              />
              <circle
                cx={b.x}
                cy={b.y}
                r={r}
                fill={hazardColor(b.hazard)}
                stroke={isSel ? "var(--foreground)" : "transparent"}
                strokeWidth={0.4}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
