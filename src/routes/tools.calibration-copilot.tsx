import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { getTool } from "@/lib/tools/registry";
import { ComputeSeam, KpiTile, Panel, StatusPill, ToolPageHeader } from "@/components/tool-kit";
import { MOCK_GAUGES, MOCK_NUDGES, MOCK_SCATTER, type GaugeStat } from "@/lib/calibration-copilot/engine";

const tool = getTool("calibration-copilot");

export const Route = createFileRoute("/tools/calibration-copilot")({
  head: () => ({
    meta: [
      { title: "CalibrationCopilot — BlueSky-ICM" },
      {
        name: "description",
        content:
          "Per-gauge NSE / KGE / PBIAS / R², plus targeted parameter nudges with local sensitivity.",
      },
      { property: "og:title", content: "CalibrationCopilot — BlueSky-ICM" },
      {
        property: "og:description",
        content: "Calibration scoreboard with explainable parameter suggestions for SWMM / ICM.",
      },
    ],
  }),
  component: CalibrationPage,
});

function CalibrationPage() {
  const [selected, setSelected] = useState<GaugeStat>(MOCK_GAUGES[1]); // worst gauge
  const avgNse = MOCK_GAUGES.reduce((a, g) => a + g.nse, 0) / MOCK_GAUGES.length;
  const avgKge = MOCK_GAUGES.reduce((a, g) => a + g.kge, 0) / MOCK_GAUGES.length;
  const worst = [...MOCK_GAUGES].sort((a, b) => a.nse - b.nse)[0];

  return (
    <>
      <ToolPageHeader index={tool.index} tag={tool.tag} name={tool.name} pitch={tool.description} />

      <section className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiTile label="Mean NSE" value={avgNse.toFixed(2)} tone={avgNse > 0.65 ? "good" : "bad"} />
          <KpiTile label="Mean KGE" value={avgKge.toFixed(2)} tone={avgKge > 0.65 ? "good" : "bad"} />
          <KpiTile label="Gauges" value={String(MOCK_GAUGES.length)} delta="3 flow · 2 depth" />
          <KpiTile label="Worst gauge" value={worst.gaugeId} delta={`NSE ${worst.nse.toFixed(2)}`} tone="bad" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Panel title="Gauges" meta="Click a row to focus" className="lg:col-span-7">
            <div className="overflow-hidden rounded border border-border">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-secondary/40">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Gauge</th>
                    <th className="px-3 py-2 font-medium">Var</th>
                    <th className="px-3 py-2 font-medium text-right">NSE</th>
                    <th className="px-3 py-2 font-medium text-right">KGE</th>
                    <th className="px-3 py-2 font-medium text-right">PBIAS</th>
                    <th className="px-3 py-2 font-medium text-right">R²</th>
                    <th className="px-3 py-2 font-medium text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_GAUGES.map((g) => {
                    const ok = g.nse > 0.65;
                    const active = selected.gaugeId === g.gaugeId;
                    return (
                      <tr
                        key={g.gaugeId}
                        onClick={() => setSelected(g)}
                        className={`cursor-pointer transition-colors ${active ? "bg-primary/[0.08]" : "hover:bg-secondary/30"}`}
                      >
                        <td className="px-3 py-2 text-foreground">{g.gaugeId}</td>
                        <td className="px-3 py-2 text-muted-foreground uppercase">{g.variable}</td>
                        <td className="px-3 py-2 text-right">{g.nse.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{g.kge.toFixed(2)}</td>
                        <td className={`px-3 py-2 text-right ${Math.abs(g.pbias) > 10 ? "text-accent" : ""}`}>
                          {g.pbias > 0 ? "+" : ""}
                          {g.pbias.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-right">{g.r2.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          <StatusPill tone={ok ? "good" : "bad"}>{ok ? "good" : "weak"}</StatusPill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={`Obs vs Sim · ${selected.gaugeId}`} meta={`${selected.nObs} obs`} className="lg:col-span-5">
            <Scatter />
          </Panel>
        </div>

        <Panel title="Copilot suggestions" meta="Ranked by local sensitivity">
          <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Targeting the worst gauge ({worst.gaugeId}). Applying these nudges would lift mean
            NSE by an estimated <span className="text-primary font-mono">+0.11</span>.
          </div>
          <ul className="space-y-3">
            {MOCK_NUDGES.map((n) => (
              <li key={n.paramId} className="rounded border border-border bg-background p-4">
                <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                  <div>
                    <span className="font-mono text-sm text-primary">{n.paramId}</span>
                    <span className="text-xs text-muted-foreground"> · {n.scope}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-muted-foreground">
                      {n.current}
                      {n.unit ?? ""}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-foreground">
                      {n.suggested}
                      {n.unit ?? ""}
                    </span>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4 items-center">
                  <div className="md:col-span-2 text-xs text-foreground/80 leading-relaxed">
                    {n.rationale}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
                      <span>SENSITIVITY · ΔNSE</span>
                      <span className="text-foreground">+{n.sensitivity.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, n.sensitivity * 400)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <ComputeSeam note={tool.computeSeam} />
    </>
  );
}

function Scatter() {
  const W = 360;
  const H = 240;
  const pad = 30;
  const maxV = Math.max(...MOCK_SCATTER.flatMap((p) => [p.obs, p.sim])) * 1.1;
  const sx = (v: number) => pad + ((W - pad * 1.5) * v) / maxV;
  const sy = (v: number) => H - pad - ((H - pad * 1.5) * v) / maxV;
  return (
    <div className="rounded border border-border bg-background p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[240px]">
        {/* 1:1 line */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(maxV)} y2={sy(maxV)} stroke="var(--border)" strokeDasharray="3 4" />
        {MOCK_SCATTER.map((p, i) => (
          <circle key={i} cx={sx(p.obs)} cy={sy(p.sim)} r={2.5} fill="var(--primary)" opacity={0.7} />
        ))}
        <text x={W - 4} y={H - 4} fontSize={9} textAnchor="end" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
          Observed (m³/s)
        </text>
        <text x={4} y={12} fontSize={9} fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
          Simulated (m³/s)
        </text>
      </svg>
    </div>
  );
}
