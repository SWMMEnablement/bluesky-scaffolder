import { type ReactNode } from "react";

export function ToolPageHeader({
  index,
  tag,
  name,
  pitch,
}: {
  index: string;
  tag: string;
  name: string;
  pitch: string;
}) {
  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-mono text-muted-foreground">/ {index}</span>
          <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">
            {tag}
          </span>
          <span className="rounded bg-accent/15 text-accent border border-accent/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">
            Concept
          </span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tighter mb-3">
          {name}
        </h1>
        <p className="max-w-2xl text-muted-foreground text-pretty">{pitch}</p>
      </div>
    </div>
  );
}

export function Panel({
  title,
  meta,
  children,
  className = "",
}: {
  title?: string;
  meta?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-surface ${className}`}>
      {(title || meta) && (
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          {title && (
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
              {title}
            </h3>
          )}
          {meta && (
            <span className="text-[10px] font-mono text-muted-foreground">{meta}</span>
          )}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function ComputeSeam({ note }: { note: string }) {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-16">
      <div className="rounded-lg border border-dashed border-border bg-background p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="size-1.5 rounded-full bg-warning" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            How this plugs into SWMM / ICM
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{note}</p>
        <p className="text-xs font-mono text-muted-foreground mt-3">
          Today this screen runs on hand-crafted mock data — the engine seam lives in
          <code className="mx-1 rounded bg-secondary px-1 py-0.5">src/lib/&lt;tool&gt;/engine.ts</code>.
        </p>
      </div>
    </div>
  );
}

export function KpiTile({
  label,
  value,
  unit,
  delta,
  tone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  tone?: "neutral" | "good" | "bad" | "primary";
}) {
  const deltaColor =
    tone === "good"
      ? "text-success"
      : tone === "bad"
        ? "text-accent"
        : tone === "primary"
          ? "text-primary"
          : "text-muted-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold text-foreground">{value}</span>
        {unit && <span className="text-[11px] font-mono text-muted-foreground">{unit}</span>}
      </div>
      {delta && <p className={`mt-1 text-[10px] font-mono ${deltaColor}`}>{delta}</p>}
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "neutral" | "good" | "bad" | "primary" | "warn";
  children: ReactNode;
}) {
  const cls =
    tone === "good"
      ? "bg-success/15 text-success border-success/30"
      : tone === "bad"
        ? "bg-accent/15 text-accent border-accent/30"
        : tone === "primary"
          ? "bg-primary/15 text-primary border-primary/30"
          : tone === "warn"
            ? "bg-warning/15 text-warning border-warning/30"
            : "bg-secondary text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider ${cls}`}
    >
      {children}
    </span>
  );
}
