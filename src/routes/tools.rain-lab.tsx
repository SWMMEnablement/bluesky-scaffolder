import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { getTool } from "@/lib/tools/registry";
import { ComputeSeam, KpiTile, Panel, ToolPageHeader } from "@/components/tool-kit";
import { buildHyetogram, toSwmmTimeSeries, type StormShape } from "@/lib/rain-lab/engine";
import { toast } from "sonner";

const tool = getTool("rain-lab");

export const Route = createFileRoute("/tools/rain-lab")({
  head: () => ({
    meta: [
      { title: "RainLab — BlueSky-ICM" },
      {
        name: "description",
        content:
          "Design-storm synthesis with Chicago, NRCS Type II, Huff and uniform shapes plus climate uplift. Export as SWMM TIMESERIES.",
      },
      { property: "og:title", content: "RainLab — BlueSky-ICM" },
      { property: "og:description", content: "Synthetic hyetographs for SWMM / ICM stress testing." },
    ],
  }),
  component: RainLabPage,
});

const SHAPES: { id: StormShape; label: string }[] = [
  { id: "chicago", label: "Chicago r=0.4" },
  { id: "nrcs-typeII", label: "NRCS Type II" },
  { id: "huff-2", label: "Huff 2nd quartile" },
  { id: "uniform", label: "Uniform" },
];

function RainLabPage() {
  const [shape, setShape] = useState<StormShape>("chicago");
  const [durationMin, setDurationMin] = useState(180);
  const [depthMm, setDepthMm] = useState(48);
  const [uplift, setUplift] = useState(1.2);
  const stepMin = 5;

  const series = useMemo(
    () => buildHyetogram({ shape, durationMin, depthMm, uplift, stepMin }),
    [shape, durationMin, depthMm, uplift]
  );

  const peakI = Math.max(...series.map((p) => p.i));
  const totalDepth = series.at(-1)?.cum ?? 0;
  const peakIdx = series.findIndex((p) => p.i === peakI);
  const peakTime = series[peakIdx]?.t ?? 0;

  function copyExport() {
    const txt = toSwmmTimeSeries("TS_RAIN_SYN", series);
    navigator.clipboard?.writeText(txt);
    toast("Copied SWMM TIMESERIES block", {
      description: `${series.length} rows · paste into your .inp under [TIMESERIES]`,
    });
  }

  return (
    <>
      <ToolPageHeader index={tool.index} tag={tool.tag} name={tool.name} pitch={tool.description} />

      <section className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiTile label="Total depth" value={totalDepth.toFixed(1)} unit="mm" tone="primary" />
          <KpiTile label="Peak intensity" value={peakI.toFixed(1)} unit="mm/hr" />
          <KpiTile label="Time to peak" value={String(peakTime)} unit="min" />
          <KpiTile
            label="Climate uplift"
            value={`×${uplift.toFixed(2)}`}
            delta={uplift > 1 ? `+${((uplift - 1) * 100).toFixed(0)}% on baseline` : "Present-day"}
            tone={uplift > 1 ? "bad" : "neutral"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Panel title="Storm parameters" className="lg:col-span-4">
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                  Distribution shape
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {SHAPES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setShape(s.id)}
                      className={`rounded border px-2 py-1.5 text-[11px] font-mono text-left transition-colors ${
                        shape === s.id
                          ? "bg-primary/15 text-primary border-primary/40"
                          : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <Slider
                label="Duration"
                value={durationMin}
                min={30}
                max={720}
                step={15}
                unit="min"
                onChange={setDurationMin}
              />
              <Slider
                label="Total depth (present-day)"
                value={depthMm}
                min={5}
                max={200}
                step={1}
                unit="mm"
                onChange={setDepthMm}
              />
              <Slider
                label="Climate uplift factor"
                value={uplift}
                min={1}
                max={1.6}
                step={0.05}
                unit="×"
                onChange={setUplift}
                format={(v) => v.toFixed(2)}
              />

              <button
                onClick={copyExport}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:brightness-110 transition"
              >
                <Download className="size-4" /> Copy SWMM TIMESERIES
              </button>
            </div>
          </Panel>

          <Panel
            title="Hyetograph + cumulative depth"
            meta={`${series.length} steps · Δt ${stepMin} min`}
            className="lg:col-span-8"
          >
            <Chart series={series} />
          </Panel>
        </div>
      </section>

      <ComputeSeam note={tool.computeSeam} />
    </>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-sm text-foreground">
          {(format ? format(value) : value.toString())}
          <span className="text-muted-foreground"> {unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function Chart({ series }: { series: ReturnType<typeof buildHyetogram> }) {
  const W = 600;
  const H = 260;
  const padL = 36;
  const padB = 22;
  const padR = 32;
  const padT = 10;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxI = Math.max(...series.map((p) => p.i)) * 1.1 || 1;
  const maxCum = (series.at(-1)?.cum ?? 1) * 1.05;
  const barW = innerW / series.length;
  const totalMin = series.at(-1)?.t ?? 1;

  const linePoints = series
    .map((p, i) => {
      const x = padL + (i + 0.5) * barW;
      const y = padT + innerH - (p.cum / maxCum) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="rounded border border-border bg-background p-3 overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[260px]">
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
        {series.map((p, i) => {
          const x = padL + i * barW + 1;
          const h = (p.i / maxI) * innerH;
          const y = padT + innerH - h;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.max(1, barW - 2)}
              height={h}
              fill="var(--primary)"
              opacity={0.55}
            />
          );
        })}
        <polyline points={linePoints} fill="none" stroke="var(--accent)" strokeWidth={1.6} />
        {/* y-axis labels */}
        <text x={4} y={padT + 4} fontSize={9} fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
          {maxI.toFixed(0)} mm/hr
        </text>
        <text x={4} y={H - padB} fontSize={9} fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
          0
        </text>
        <text
          x={W - 4}
          y={padT + 4}
          fontSize={9}
          textAnchor="end"
          fill="var(--accent)"
          fontFamily="var(--font-mono)"
        >
          {maxCum.toFixed(0)} mm cum
        </text>
        {/* x-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const x = padL + innerW * f;
          const t = Math.round(totalMin * f);
          return (
            <text
              key={f}
              x={x}
              y={H - 4}
              fontSize={9}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontFamily="var(--font-mono)"
            >
              {t}m
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-[10px] font-mono text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-primary/60" /> Intensity
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-accent" /> Cumulative depth
        </span>
      </div>
    </div>
  );
}
