
# BlueSky-ICM — Plan

A hub for 5 speculative tools that wrap around SWMM5 / InfoWorks ICM workflows. Audience: hydraulic modelers. Each tool is a real route with a working UI and mock data; the solver / file-format adapters are stubbed behind a clear seam so real compute can drop in later.

## The 5 tools

1. **ModelDiff** — Visual diff between two SWMM `.inp` (or ICM IEDB export) versions. Side-by-side network map, change list (conduits, subcatchments, controls), and a "what would this change to the hydraulics" summary. Modelers waste hours doing this in text editors today.

2. **RainLab** — Design-storm + ensemble rainfall generator. Build Chicago / NRCS / Huff / user-defined hyetographs, layer climate-change uplift factors, export as SWMM time series or ICM rainfall events. Live hyetograph + cumulative depth chart.

3. **CalibrationCopilot** — Loads observed gauge data (flow / depth / level) alongside a simulated run, computes NSE / KGE / PBIAS / R² per gauge, and suggests parameter nudges (roughness, % imperv, initial losses) with sensitivity bars. Think "Copilot for calibration", not a black-box optimizer.

4. **FloodLensAI** — Upload a 2D results raster (or ICM mesh result) + a building footprint layer, get per-building depth, duration, hazard rating (DEFRA / FEMA) and a damage curve estimate. Map view with filter chips and a CSV/GeoJSON export.

5. **ScenarioStudio** — Compare N model scenarios (baseline vs. SUDS retrofit vs. pipe upsize vs. climate 2050) on one dashboard: peak flows, flood volume, CSO spills, cost per m³ avoided. Drag scenarios in, pick KPIs, get a shareable report.

## App shape

```
/                       Hub: hero + 5 tool cards + "why blue-sky" note
/tools/model-diff
/tools/rain-lab
/tools/calibration-copilot
/tools/flood-lens
/tools/scenario-studio
```

Shared shell: top nav with logo + Tools dropdown + GitHub-style "Concept" badge. Each tool route has: header (name, one-line pitch, status pill "Concept"), main interactive panel with mock data, and a "How this would plug into SWMM/ICM" footer block describing the real-compute seam.

## Build sequence

1. **Design directions** — run `design--create_directions` for the hub + a representative tool screen (ScenarioStudio, since it's the most visually loaded). User picks one direction; tokens get copied into `src/styles.css` verbatim. All 5 tools inherit those tokens.
2. **Shell + hub** — `__root.tsx` gets the top nav; `routes/index.tsx` becomes the hub with 5 tool cards, each linking to its route. SEO `head()` per route.
3. **Scaffold all 5 tool routes** in parallel — each with realistic mock data, working interactions (charts, maps, tables, filters), and a stubbed `lib/<tool>/engine.ts` module exporting typed functions like `runDiff(inpA, inpB)` that currently return mock results. This is the seam.
4. **Polish pass** — slop-sweep (remove default CTAs, generic icons, etc.), verify every route renders, check console.

## Technical details

- Routing: TanStack Start file routes under `src/routes/tools/*.tsx`, hub at `src/routes/index.tsx`. Per-route `head()` with unique title/description/og:title/og:description.
- Charts: Recharts (already in shadcn chart wrapper) for hyetographs, KPI bars, calibration scatter.
- Maps: lightweight SVG mock "network map" for ModelDiff and FloodLens — no real GIS dep yet. Real Leaflet/Maplibre swap is a later step; engine seam includes a `getMapData()` shape.
- Mock data: hand-authored JSON in `src/lib/<tool>/mock.ts` that matches the shape the real adapter will return — so swapping in a real `.inp` parser later is a drop-in.
- File upload UI: real `<input type="file">` with a parser stub that currently ignores the file and returns mock data; toast says "Concept build — using sample data."
- No backend in this pass. No Lovable Cloud. Compute hooks documented inline so a future pass can add server functions for parsing/solving.
- Tokens / theme: chosen design direction's CSS variables go into `src/styles.css`. No hard-coded colors in components.

## Out of scope (intentionally)

- Real SWMM5 binary execution or `.inp` parsing
- Real raster / mesh ingestion
- Auth, persistence, sharing
- Mobile layouts beyond "doesn't break"
