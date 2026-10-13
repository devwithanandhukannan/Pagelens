/**
 * Pagelens — Tiling Planner & Encode Worker
 * Splits oversized dimensions into tiles and converts between binary formats off the main thread.
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

export async function encodeCanvas(canvas, format = 'png', quality = 0.92) {
  if (!canvas) {
    throw new Error('Canvas is null or undefined.');
  }
  if (canvas.width === 0 || canvas.height === 0) {
    canvas.width = Math.max(1, canvas.width || 800);
    canvas.height = Math.max(1, canvas.height || 600);
  }
  const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  if (canvas.convertToBlob) {
    return await canvas.convertToBlob({ type: mimeType, quality });
  }
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}
