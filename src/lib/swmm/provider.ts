/**
 * SwmmProvider — single swappable seam every tool calls.
 *
 * Today: `LiteSwmmProvider` returns real, deterministic results computed
 * client-side from the user's actual inputs (parsers + lite runoff engine).
 *
 * Tomorrow: drop a real `swmm5.wasm` artifact into `public/wasm/swmm5.wasm`
 * and implement `WasmSwmmProvider.runSimulation` — every tool picks it up
 * automatically through `getProvider()`. No tool-level changes required.
 */

import { parseInp, parseInpFile } from "./inp";
import { runLite, type LiteRunOpts } from "./lite-runoff";
import { parseRpt } from "./rpt";
import { parseOut } from "./out";
import type { InpModel, OutTimeseries, RptSummary, SwmmRun } from "./types";

export type ProviderKind = "lite" | "wasm";

export interface SwmmProvider {
  readonly kind: ProviderKind;
  readonly label: string;
  /** Engine capabilities — drives which features each tool exposes. */
  readonly capabilities: {
    fullHydraulicSolver: boolean;
    flood2D: boolean;
    longTermContinuous: boolean;
  };
  parseInp(input: File | string): Promise<InpModel>;
  runSimulation(model: InpModel, opts?: LiteRunOpts): Promise<SwmmRun>;
  readRpt(input: ArrayBuffer | string): RptSummary;
  readOut(buffer: ArrayBuffer): OutTimeseries;
}

class LiteSwmmProvider implements SwmmProvider {
  readonly kind = "lite" as const;
  readonly label = "Lite (browser, CN + linear reservoir)";
  readonly capabilities = {
    fullHydraulicSolver: false,
    flood2D: false,
    longTermContinuous: false,
  };
  async parseInp(input: File | string): Promise<InpModel> {
    return typeof input === "string" ? parseInp(input) : parseInpFile(input);
  }
  async runSimulation(model: InpModel, opts?: LiteRunOpts): Promise<SwmmRun> {
    // Defer a tick so callers can show a spinner without UI jank.
    await new Promise((r) => setTimeout(r, 0));
    return runLite(model, opts);
  }
  readRpt(input: ArrayBuffer | string): RptSummary {
    const text = typeof input === "string" ? input : new TextDecoder().decode(input);
    return parseRpt(text);
  }
  readOut(buffer: ArrayBuffer): OutTimeseries {
    return parseOut(buffer);
  }
}

let cached: SwmmProvider | null = null;

/**
 * Returns the active provider. Always client-side. WASM probe is a TODO:
 * when `public/wasm/swmm5.wasm` is shipped, swap this for a HEAD-fetch
 * test and return a WasmSwmmProvider instance.
 */
export function getProvider(): SwmmProvider {
  if (!cached) cached = new LiteSwmmProvider();
  return cached;
}

/** Friendly badge labels used in tool headers. */
export function providerStatus(p: SwmmProvider): { tone: "primary" | "warn"; text: string } {
  return p.kind === "wasm"
    ? { tone: "primary", text: "ENGINE · SWMM5 WASM" }
    : { tone: "warn", text: "ENGINE · LITE (CLIENT)" };
}
