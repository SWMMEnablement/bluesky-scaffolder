import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { TOOLS } from "@/lib/tools/registry";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlueSky-ICM — Blue-sky tools for SWMM & InfoWorks ICM" },
      {
        name: "description",
        content:
          "A hub of five speculative tools wrapping SWMM5 and InfoWorks ICM: model diffing, design-storm synthesis, calibration copilot, rapid flood lensing, and multi-scenario comparison.",
      },
      { property: "og:title", content: "BlueSky-ICM" },
      {
        property: "og:description",
        content: "Five speculative tools for hydraulic modelers using SWMM5 / InfoWorks ICM.",
      },
    ],
  }),
  component: Hub,
});

function Hub() {
  return (
    <>
      <section className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16">
          <div className="flex items-center gap-2 mb-6">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Concept · 5 tools · No solver attached yet
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-extrabold tracking-tighter mb-5 max-w-3xl text-balance">
            Blue-sky tools for <span className="text-primary">SWMM &amp; ICM</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl text-pretty leading-relaxed">
            Five speculative interfaces around the workflows hydraulic modelers actually do:
            diffing networks, building storms, calibrating against gauges, lensing flood
            results, and comparing scenarios. UI is real, compute is mocked, the seams are
            obvious.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <span className="rounded border border-border bg-surface px-2 py-1">
              EPA SWMM 5.2
            </span>
            <span className="rounded border border-border bg-surface px-2 py-1">
              InfoWorks ICM
            </span>
            <span className="rounded border border-border bg-surface px-2 py-1">
              .inp · .out · .rpt
            </span>
            <span className="rounded border border-border bg-surface px-2 py-1">
              IEDB export
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight">The five tools</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            REGISTRY · /lib/tools/registry.ts
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-lg overflow-hidden">
          {TOOLS.map((tool, i) => {
            const featured = i === TOOLS.length - 1; // ScenarioStudio takes the wide slot
            return (
              <Link
                key={tool.slug}
                to={`/tools/${tool.slug}`}
                className={`group relative bg-background p-7 transition-colors hover:bg-surface ${
                  featured ? "md:col-span-2 lg:col-span-2 bg-primary/[0.04]" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">
                    {tool.tag}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {tool.index}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {tool.name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                  {tool.description}
                </p>
                <div className="mt-5 flex items-center gap-2 text-[11px] font-mono text-foreground/70 group-hover:text-primary transition-colors">
                  Open tool <ArrowUpRight className="size-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-12 grid md:grid-cols-3 gap-8">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Why "blue sky"
            </span>
            <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
              Each tool is a deliberate sketch of what could exist if the surrounding
              ecosystem caught up with the solver. Not roadmap. Not product. A provocation.
            </p>
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              How real is it
            </span>
            <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
              Every screen runs on typed mock data shaped exactly like the real adapter
              would return — so swapping in a SWMM .out parser or an ICM IEDB reader is a
              drop-in, not a rewrite.
            </p>
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Built for
            </span>
            <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
              Hydraulic modelers who already live in EPA SWMM and InfoWorks ICM and want a
              second pair of hands.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
