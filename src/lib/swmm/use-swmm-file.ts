import { useState } from "react";
import { toast } from "sonner";
import { getProvider } from "./provider";
import type { InpModel, OutTimeseries, RptSummary } from "./types";

type Kind = "inp" | "rpt" | "out";

type Loaded =
  | { kind: "inp"; name: string; model: InpModel }
  | { kind: "rpt"; name: string; rpt: RptSummary }
  | { kind: "out"; name: string; out: OutTimeseries };

/**
 * Centralized file-pick + parse helper. Browser-only.
 * Files never leave the user's machine.
 */
export function useSwmmFile() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(file: File, kind: Kind) {
    setLoading(true);
    try {
      const provider = getProvider();
      if (kind === "inp") {
        const model = await provider.parseInp(file);
        setLoaded({ kind, name: file.name, model });
        toast(`Parsed ${file.name}`, {
          description: `${model.subcatchments.size} subcatchments · ${model.junctions.size} junctions · ${model.conduits.size} conduits`,
        });
      } else if (kind === "rpt") {
        const text = await file.text();
        const rpt = provider.readRpt(text);
        setLoaded({ kind, name: file.name, rpt });
        toast(`Parsed ${file.name}`, {
          description: `${rpt.nodes.length} nodes · ${rpt.links.length} links · ${rpt.subcatchments.length} subs · continuity ${rpt.continuityErrorPct.toFixed(2)}%`,
        });
      } else {
        const buf = await file.arrayBuffer();
        const out = provider.readOut(buf);
        setLoaded({ kind, name: file.name, out });
        toast(`Parsed ${file.name}`, {
          description: `${out.nPeriods} periods · ${out.nodes.length} nodes · ${out.links.length} links`,
        });
      }
    } catch (err) {
      console.error(err);
      toast(`Failed to parse ${file.name}`, {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  return { loaded, loading, load, reset: () => setLoaded(null) };
}
