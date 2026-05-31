# Real SWMM5 Engine Integration

Move every tool off hand-authored mocks and onto a single, swappable
`SwmmProvider` interface. ModelDiff and RainLab get **real compute now**
(pure JS parsing + a SWMM5 WASM run). Calibration, FloodLens, and
ScenarioStudio sit behind the same interface returning typed stub results
until the WASM run loop is wired through them.

All compute runs **in the browser**. No backend, no Cloudflare Worker
involvement, no uploads. `.inp` / `.rpt` / `.out` files are picked from
disk and never leave the user's machine.

## 1. Provider interface (single seam)

New file `src/lib/swmm/provider.ts` defines the contract every tool calls:

```ts
interface SwmmProvider {
  parseInp(file: File): Promise<InpModel>          // pure JS
  runSimulation(inp: InpModel, opts?): Promise<SwmmRun>  // WASM
  readRpt(rpt: ArrayBuffer): RptSummary            // pure JS
  readOut(out: ArrayBuffer): OutTimeseries         // pure JS (binary)
  capabilities: { calibration: boolean; flood2D: boolean; scenarios: boolean }
}
```

Two implementations:
- `WasmSwmmProvider` — loads `/wasm/swmm5_bg.wasm` lazily on first call.
- `StubSwmmProvider` — current mock data, used as fallback + for the
  three heavier tools until their pipelines are real.

A tiny `getProvider()` factory returns Wasm when available, else stub.
Tools never import either directly.

## 2. WASM runtime

- Vendor an existing emscripten build of SWMM5 (e.g. `swmm5-js` /
  `pyswmm-wasm`-style artifact). Binary goes to `public/wasm/swmm5.wasm`,
  glue JS to `src/lib/swmm/wasm/` per the WASM rules (client-only, never
  imported from route loaders or server fns).
- Tiny TS wrapper exposing `runFromInpString(text): { rpt, out }` via
  Emscripten MEMFS — we write the `.inp` to a virtual FS, call
  `swmm_run`, then read back `report.rpt` and `output.out`.
- Lazy-loaded on the first `runSimulation` call so the hub page stays
  light.

## 3. Pure-JS parsers

`src/lib/swmm/inp.ts` — section-aware `.inp` parser producing `InpModel`
(subcatchments, junctions, conduits, options, timeseries, raingages,
inflows). Used by ModelDiff and as input to the WASM runner.

`src/lib/swmm/rpt.ts` — `.rpt` text parser for continuity errors,
node/link summaries, runoff totals.

`src/lib/swmm/out.ts` — binary `.out` reader using a `DataView` over
`ArrayBuffer` (SWMM5 binary spec: ID table → object properties →
reporting variables → computed results → closing records). Streams
node/link/subcatchment timeseries on demand.

## 4. Per-tool wiring

| Tool | Real compute now | Source of truth |
|---|---|---|
| **ModelDiff** | yes | `parseInp(A)` + `parseInp(B)` → structural diff (added/removed/modified elements, parameter deltas). Replaces `lib/model-diff/engine.ts` mock entirely. |
| **RainLab** | yes (already pure math) | Move synthetic hyetograph generators behind the provider's `buildHyetogram` so the SWMM `[TIMESERIES]` export round-trips through `inp.ts`. Adds a "Run in SWMM" button that pipes the storm into `runSimulation` against a tiny demo `.inp` and renders the resulting runoff hydrograph from the real `.out`. |
| **CalibrationCopilot** | stub (interface-real) | Accepts observed CSV + model `.inp`, but `runCalibration` returns mock NSE/KGE with a banner "WASM run loop pending — uses sample run". When user supplies their own `.inp`, we DO run it once via WASM and show the real simulated hydrograph beside observed; the parameter-nudge logic stays mocked. |
| **FloodLensAI** | stub | No raster engine in scope. Tool now consumes real node max-depth/flooded-volume from `readRpt` when a user drops an `.rpt`; building-level damage curves stay synthetic. |
| **ScenarioStudio** | stub | Accepts N `.inp` variants, runs each through `runSimulation` sequentially, and renders real hydrograph overlays from `.out`. Cost/trade-off chart stays mock until users provide cost inputs. |

Each tool route gets a `<ProviderBadge>` (small pill in the header)
showing `WASM` / `Stub` / `Hybrid` so engineers know which numbers are
real.

## 5. File handling

- Native `<input type="file" accept=".inp,.rpt,.out">` everywhere.
- Files are read with `file.arrayBuffer()` / `file.text()` and passed to
  parsers. Nothing is uploaded, persisted, or sent over the network.
- A shared `useSwmmFile()` hook centralizes pick/parse/error handling.

## 6. Compute seam UI

The existing `ComputeSeam` footer is updated to describe what's now
real vs stubbed per tool, with a link to the provider source. The hub
gets a small "Engine: SWMM5 (WASM, in-browser)" status line.

## Technical notes

- WASM file MUST live under `public/wasm/` and load only from
  client-only code; never import `.wasm` in route loaders, server fns,
  or `__root.tsx`.
- `.out` parsing is non-trivial — implement read-by-offset with the
  closing-records pointer table; cache parsed metadata per file.
- Heavy parsers and the WASM module are loaded via dynamic
  `import()` inside `WasmSwmmProvider` to keep the hub bundle small.
- All existing `src/lib/<tool>/engine.ts` mock files stay on disk as
  the `StubSwmmProvider` data source — no duplication.
- Toast on parse/run failure via the existing sonner setup.

## Out of scope

- ICM / Exchange integration.
- Real 2D flood raster / mesh ingestion.
- Backend, uploads, persistence, auth.
- Real calibration optimizer loop and real cost modeling.
- Mobile-specific layout work.
