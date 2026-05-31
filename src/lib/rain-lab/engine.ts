/**
 * RainLab — engine seam.
 * Pure-JS synthetic hyetograph generator. No solver dependency.
 */

export type StormShape = "chicago" | "nrcs-typeII" | "huff-2" | "uniform";

export type StormConfig = {
  shape: StormShape;
  durationMin: number;
  depthMm: number;
  /** Climate uplift multiplier on rainfall depth. 1.0 = present-day. */
  uplift: number;
  /** Time-step minutes for the discretized hyetograph. */
  stepMin: number;
};

export type HyetogramPoint = {
  /** Minutes since start of storm. */
  t: number;
  /** Intensity mm/hr in the interval starting at t. */
  i: number;
  /** Cumulative depth (mm) at end of interval. */
  cum: number;
};

/**
 * Distribute a total depth across N steps using a named storm shape.
 * Returns a normalized weight array (sums to 1).
 */
function shapeWeights(shape: StormShape, n: number): number[] {
  const xs = Array.from({ length: n }, (_, i) => (i + 0.5) / n); // 0..1 centered
  let raw: number[];
  switch (shape) {
    case "chicago": {
      // Peak at r = 0.4 (typical Chicago r). Use simple intensity envelope.
      const r = 0.4;
      raw = xs.map((x) => {
        const dx = Math.abs(x - r);
        // Sharper than uniform; peaks near r, decays toward edges.
        return 1 / Math.pow(0.05 + dx, 0.85);
      });
      break;
    }
    case "nrcs-typeII": {
      // Front-loaded peak near 0.5, narrow.
      raw = xs.map((x) => Math.exp(-Math.pow((x - 0.5) / 0.12, 2)));
      break;
    }
    case "huff-2": {
      // Second-quartile peak near 0.35, broader.
      raw = xs.map((x) => Math.exp(-Math.pow((x - 0.35) / 0.18, 2)));
      break;
    }
    case "uniform":
    default:
      raw = xs.map(() => 1);
  }
  const s = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / s);
}

export function buildHyetogram(cfg: StormConfig): HyetogramPoint[] {
  const n = Math.max(1, Math.round(cfg.durationMin / cfg.stepMin));
  const weights = shapeWeights(cfg.shape, n);
  const totalDepth = cfg.depthMm * cfg.uplift;
  const dtHr = cfg.stepMin / 60;
  let cum = 0;
  return weights.map((w, k) => {
    const depth = w * totalDepth;
    cum += depth;
    return {
      t: k * cfg.stepMin,
      i: depth / dtHr,
      cum,
    };
  });
}

/** Render a hyetogram as a SWMM TIMESERIES block. */
export function toSwmmTimeSeries(name: string, series: HyetogramPoint[]): string {
  const head = `;; RainLab synthetic series\n[TIMESERIES]\n;;Name            Date       Time       Value\n`;
  const rows = series
    .map((p) => {
      const hh = String(Math.floor(p.t / 60)).padStart(2, "0");
      const mm = String(p.t % 60).padStart(2, "0");
      return `${name.padEnd(16)} 01/01/2025 ${hh}:${mm}      ${p.i.toFixed(3)}`;
    })
    .join("\n");
  return head + rows + "\n";
}
