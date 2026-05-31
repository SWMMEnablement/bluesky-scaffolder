import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

const tools = [
  { slug: "model-diff", label: "ModelDiff" },
  { slug: "rain-lab", label: "RainLab" },
  { slug: "calibration-copilot", label: "CalibrationCopilot" },
  { slug: "flood-lens", label: "FloodLensAI" },
  { slug: "scenario-studio", label: "ScenarioStudio" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="size-6 rounded-sm bg-primary text-primary-foreground grid place-items-center font-display font-black text-xs italic">
                B
              </div>
              <span className="font-display font-bold text-lg tracking-tight group-hover:text-primary transition-colors">
                BlueSky-ICM
              </span>
            </Link>
            <div className="hidden md:flex h-4 w-px bg-border" />
            <nav className="hidden md:flex items-center gap-1">
              {tools.map((t) => {
                const to = `/tools/${t.slug}`;
                const active = pathname === to;
                return (
                  <Link
                    key={t.slug}
                    to={to}
                    className={`rounded px-2.5 py-1 text-xs font-mono uppercase tracking-wider transition-colors ${
                      active
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded border border-border bg-secondary/40 px-2 py-1">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Engine · SWMM 5.2
              </span>
            </div>
            <span className="rounded bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border border-accent/30">
              Concept
            </span>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-4 rounded-sm bg-primary" />
            <span className="font-display font-bold text-sm">BlueSky-ICM</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Speculative tooling for SWMM5 / InfoWorks ICM
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            v0.1 · concept build · no real solver attached
          </span>
        </div>
      </footer>
    </div>
  );
}

export type { ReactNode };
