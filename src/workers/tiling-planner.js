/**
 * Pagelens — Tiling Planner Worker
 * Calculates layout slices for oversized pages exceeding browser canvas limits.
 */

export const MAX_SAFE_CANVAS_DIMENSION = 16384;

export function planTiles(totalWidth, totalHeight, maxTileDimension = 4096) {
  const tiles = [];
  const cols = Math.ceil(totalWidth / maxTileDimension);
  const rows = Math.ceil(totalHeight / maxTileDimension);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * maxTileDimension;
      const y = r * maxTileDimension;
      const width = Math.min(maxTileDimension, totalWidth - x);
      const height = Math.min(maxTileDimension, totalHeight - y);

      tiles.push({
        id: `tile_${r}_${c}`,
        row: r,
        col: c,
        x,
        y,
        width,
        height,
      });
    }
  }

  return {
    cols,
    rows,
    tiles,
    needsTiling: totalHeight > MAX_SAFE_CANVAS_DIMENSION || totalWidth > MAX_SAFE_CANVAS_DIMENSION,
  };
}

// Worker message listener if running in dedicated Web Worker
if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined') {
  self.onmessage = (e) => {
    const { totalWidth, totalHeight, maxTileDimension } = e.data;
    const plan = planTiles(totalWidth, totalHeight, maxTileDimension);
    self.postMessage(plan);
  };
}
