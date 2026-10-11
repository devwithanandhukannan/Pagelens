/**
 * Pagelens — Geometry & Mathematical Utilities
 */

export function pointInRect(px, py, rect) {
  const minX = Math.min(rect.x, rect.x + rect.width);
  const maxX = Math.max(rect.x, rect.x + rect.width);
  const minY = Math.min(rect.y, rect.y + rect.height);
  const maxY = Math.max(rect.y, rect.y + rect.height);
  return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

export function normalizeRect(rect) {
  let { x, y, width, height } = rect;
  if (width < 0) {
    x += width;
    width = Math.abs(width);
  }
  if (height < 0) {
    y += height;
    height = Math.abs(height);
  }
  return { x, y, width, height };
}

export function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function applyAspectRatio(rect, ratio, anchor = 'bottom-right') {
  if (!ratio || ratio <= 0) return { ...rect };
  let { x, y, width, height } = rect;
  const absWidth = Math.abs(width);
  const signW = width >= 0 ? 1 : -1;
  const signH = height >= 0 ? 1 : -1;

  const newHeight = (absWidth / ratio) * signH;
  return { x, y, width, height: newHeight };
}

/**
 * Catmull-Rom or mid-point smoothing for hand-drawn pen paths
 */
export function smoothPathPoints(points) {
  if (!points || points.length < 3) return points || [];
  const smoothed = [];
  smoothed.push(points[0]);

  for (let i = 1; i < points.length - 1; i++) {
    const pPrev = points[i - 1];
    const pCurr = points[i];
    const pNext = points[i + 1];

    const cpX = (pPrev.x + pCurr.x) / 2;
    const cpY = (pPrev.y + pCurr.y) / 2;
    smoothed.push({ x: cpX, y: cpY });
    smoothed.push(pCurr);
  }

  smoothed.push(points[points.length - 1]);
  return smoothed;
}

/**
 * Screen to Canvas coordinate transform considering zoom and pan offsets
 */
export function screenToCanvas(screenX, screenY, viewport) {
  const { zoom, panX, panY } = viewport;
  return {
    x: (screenX - panX) / zoom,
    y: (screenY - panY) / zoom,
  };
}

export function canvasToScreen(canvasX, canvasY, viewport) {
  const { zoom, panX, panY } = viewport;
  return {
    x: canvasX * zoom + panX,
    y: canvasY * zoom + panY,
  };
}

/**
 * Calculate bounding box of array of annotation objects
 */
export function calculateBounds(objects) {
  if (!objects || objects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    const norm = normalizeRect({
      x: obj.x || 0,
      y: obj.y || 0,
      width: obj.width || 0,
      height: obj.height || 0,
    });
    minX = Math.min(minX, norm.x);
    minY = Math.min(minY, norm.y);
    maxX = Math.max(maxX, norm.x + norm.width);
    maxY = Math.max(maxY, norm.y + norm.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
