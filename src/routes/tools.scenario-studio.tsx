import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getTool } from "@/lib/tools/registry";
import { ComputeSeam, KpiTile, Panel, StatusPill, ToolPageHeader } from "@/components/tool-kit";
import { MOCK_SCENARIOS, type Scenario } from "@/lib/scenario-studio/engine";

const tool = getTool("scenario-studio");

export const Route = createFileRoute("/tools/scenario-studio")({
  head: () => ({
    meta: [
      { title: "ScenarioStudio — BlueSky-ICM" },
      {
        name: "description",
        content:
          "Compare baseline, SUDS retrofit, pipe upsize and climate-2050 scenarios on peak flow, flood volume, CSO spills and cost per m³ avoided.",
      },
      { property: "og:title", content: "ScenarioStudio — BlueSky-ICM" },
      { property: "og:description", content: "Multi-scenario comparison dashboard for SWMM / ICM runs." },
    ],
  }),
  component: ScenarioStudioPage,
});

const baseline = MOCK_SCENARIOS[0];

function ScenarioStudioPage() {
  const [activeIds, setActiveIds] = useState<Set<string>>(
    new Set(MOCK_SCENARIOS.map((s) => s.id))
  );
  const active = MOCK_SCENARIOS.filter((s) => activeIds.has(s.id));

  const aggregate = useMemo(() => {
    const nonBase = active.filter((s) => s.id !== baseline.id);
    const avgPeak = nonBase.length ? nonBase.reduce((a, s) => a + s.peakFlowM3s, 0) / nonBase.length : baseline.peakFlowM3s;
    const totalVolReduction = nonBase.reduce((a, s) => a + Math.max(0, baseline.floodVolumeMl - s.floodVolumeMl), 0);
    const totalSpillReduction = nonBase.reduce((a, s) => a + Math.max(0, baseline.csoSpills - s.csoSpills), 0);
    const best = [...nonBase].sort((a, b) => (a.costPerM3Avoided ?? 99) - (b.costPerM3Avoided ?? 99))[0];
    return { avgPeak, totalVolReduction, totalSpillReduction, best };
  }, [active]);

  function toggle(id: string) {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <ToolPageHeader index={tool.index} tag={tool.tag} name={tool.name} pitch={tool.description} />

      <section className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Scenario chips */}
        <div className="flex flex-wrap gap-2">
          {MOCK_SCENARIOS.map((s) => {
            const on = activeIds.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`rounded border px-3 py-1.5 text-xs font-mono transition-colors ${
                  on
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <span className="opacity-60 mr-1">[{s.label}]</span>
                {s.name}
              </button>
            );
          })}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiTile
            label="Avg peak flow (non-base)"
            value={aggregate.avgPeak.toFixed(1)}
            unit="m³/s"
            delta={`vs base ${baseline.peakFlowM3s.toFixed(1)}`}
            tone={aggregate.avgPeak < baseline.peakFlowM3s ? "good" : "bad"}
          />
          <KpiTile
            label="Flood vol. avoided"
            value={aggregate.totalVolReduction.toFixed(1)}
            unit="ML"
            tone="good"
            delta="summed across active scenarios"
          />
          <KpiTile
            label="CSO spills avoided"
            value={String(aggregate.totalSpillReduction)}
            unit="events"
            tone="good"
          />
          <KpiTile
            label="Best £ / m³ avoided"
            value={aggregate.best ? `£${aggregate.best.costPerM3Avoided?.toFixed(2)}` : "—"}
            delta={aggregate.best?.name}
            tone="primary"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Panel title="Hydrograph · node J-104" meta="24-hr simulation window" className="lg:col-span-8">
            <Hydrograph scenarios={active} />
          </Panel>
          <Panel title="Trade-off · peak vs cost" className="lg:col-span-4">
            <TradeoffChart scenarios={active} />
          </Panel>
        </div>

        <Panel title="Scenario table" meta={`${active.length} active`}>
          <div className="overflow-hidden rounded border border-border">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-secondary/40">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Scenario</th>
                  <th className="px-3 py-2 font-medium text-right">Peak Q (m³/s)</th>
                  <th className="px-3 py-2 font-medium text-right">Flood vol (ML)</th>
                  <th className="px-3 py-2 font-medium text-right">CSO spills</th>
                  <th className="px-3 py-2 font-medium text-right">Capex (£M)</th>
                  <th className="px-3 py-2 font-medium text-right">£ / m³ avoided</th>
                  <th className="px-3 py-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {active.map((s) => {
                  const isBase = s.id === baseline.id;
                  return (
                    <tr key={s.id} className={isBase ? "" : "hover:bg-secondary/30"}>
                      <td className="px-3 py-2 text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="opacity-60">[{s.label}]</span> {s.name}
                          {isBase && <StatusPill tone="neutral">BASE</StatusPill>}
                        </div>
                      </td>
                      <td className={`px-3 py-2 text-right ${s.peakFlowM3s < baseline.peakFlowM3s ? "text-success" : isBase ? "" : "text-accent"}`}>
                        {s.peakFlowM3s.toFixed(2)}
                      </td>
                      <td className={`px-3 py-2 text-right ${s.floodVolumeMl < baseline.floodVolumeMl ? "text-success" : isBase ? "" : "text-accent"}`}>
                        {s.floodVolumeMl.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">{s.csoSpills}</td>
                      <td className="px-3 py-2 text-right">£{s.costMgbp.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">
                        {s.costPerM3Avoided != null ? `£${s.costPerM3Avoided.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <StatusPill
                          tone={s.status === "verified" ? "good" : s.status === "active" ? "primary" : "warn"}
                        >
                          {s.status}
                        </StatusPill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <ComputeSeam note={tool.computeSeam} />
    </>
  );
}

const SCEN_COLORS = ["var(--muted-foreground)", "var(--primary)", "var(--warning)", "var(--accent)"];

function colorFor(s: Scenario, i: number) {
  if (s.tag === "BASELINE") return "var(--muted-foreground)";
  return SCEN_COLORS[i % SCEN_COLORS.length];
}

function Hydrograph({ scenarios }: { scenarios: Scenario[] }) {
  const W = 640;
  const H = 280;
  const padL = 36;
  const padR = 16;
  const padT = 12;
  const padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const allMax = Math.max(1, ...scenarios.flatMap((s) => s.hydrograph));
  const N = scenarios[0]?.hydrograph.length ?? 24;

  return (
    <div className="rounded border border-border bg-background p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[280px]">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={padL}
            x2={W - padR}
            y1={padT + innerH * (1 - f)}
            y2={padT + innerH * (1 - f)}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}
        {scenarios.map((s, idx) => {
          const points = s.hydrograph
            .map((v, i) => {
              const x = padL + (i / (N - 1)) * innerW;
              const y = padT + innerH - (v / allMax) * innerH;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ");
          return (
            <polyline
              key={s.id}
              points={points}
              fill="none"
              stroke={colorFor(s, idx)}
              strokeWidth={s.tag === "BASELINE" ? 1.4 : 2}
              opacity={s.tag === "BASELINE" ? 0.7 : 0.95}
              strokeDasharray={s.tag === "BASELINE" ? "4 3" : undefined}
            />
          );
        })}
        <text x={4} y={padT + 6} fontSize={9} fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
          {allMax.toFixed(0)} m³/s
        </text>
        <text x={4} y={H - 6} fontSize={9} fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
          0
        </text>
        {[0, 6, 12, 18, 23].map((h) => {
          const x = padL + (h / (N - 1)) * innerW;
          return (
            <text
              key={h}
              x={x}
              y={H - 6}
              fontSize={9}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontFamily="var(--font-mono)"
            >
              {String(h).padStart(2, "0")}:00
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-mono text-muted-foreground">
        {scenarios.map((s, i) => (
          <span key={s.id} className="inline-flex items-center gap-1.5">
            <span className="block w-3 h-[2px]" style={{ backgroundColor: colorFor(s, i) }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TradeoffChart({ scenarios }: { scenarios: Scenario[] }) {
  const W = 320;
  const H = 240;
  const pad = 32;
  const maxCost = Math.max(1, ...scenarios.map((s) => s.costMgbp)) * 1.15;
  const maxPeak = Math.max(...scenarios.map((s) => s.peakFlowM3s)) * 1.05;
  const minPeak = Math.min(...scenarios.map((s) => s.peakFlowM3s)) * 0.9;
  const sx = (c: number) => pad + ((W - pad * 1.4) * c) / maxCost;
  const sy = (p: number) => H - pad - ((H - pad * 1.5) * (p - minPeak)) / (maxPeak - minPeak);
  return (
    <div className="rounded border border-border bg-background p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[240px]">
        {scenarios.map((s, i) => (
          <g key={s.id}>
            <circle cx={sx(s.costMgbp)} cy={sy(s.peakFlowM3s)} r={6} fill={colorFor(s, i)} opacity={0.85} />
            <text
              x={sx(s.costMgbp) + 8}
              y={sy(s.peakFlowM3s) + 3}
              fontSize={9}
              fill="var(--muted-foreground)"
              fontFamily="var(--font-mono)"
            >
              {s.label}
            </text>
          </g>
        ))}
        <text x={W - 4} y={H - 4} fontSize={9} textAnchor="end" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
          Capex £M →
        </text>
        <text x={4} y={12} fontSize={9} fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
          ↑ Peak m³/s
        </text>
      </svg>
      <p className="text-[10px] font-mono text-muted-foreground mt-2">
        Bottom-left is good: low peak, low cost.
      </p>
    </div>
  );
}
