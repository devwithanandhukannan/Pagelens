/**
 * Pagelens — Stitch Worker / Engine
 * Assembles screenshot slices into one seamless master image using exact measured Y-offsets.
 */

export async function stitchSlices({ slices, totalWidth, totalHeight, dpr = 1 }) {
  const canvasWidth = Math.round(totalWidth * dpr);
  const canvasHeight = Math.round(totalHeight * dpr);

  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  } else {
    throw new Error('No canvas implementation available in current runtime.');
  }

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Concurrently decode all slices across background threads
  const bitmaps = await Promise.all(
    slices.map(async (slice) => {
      try {
        if (slice.bitmap) return slice.bitmap;
        if (slice.dataUrl && typeof createImageBitmap !== 'undefined') {
          const res = await fetch(slice.dataUrl);
          const blob = await res.blob();
          return await createImageBitmap(blob);
        }
      } catch (e) {
        console.warn('[StitchWorker] Failed to decode slice bitmap:', e);
      }
      return null;
    })
  );

  // 2. Blit all slices onto composite canvas
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    const imgBitmap = bitmaps[i];
    if (!imgBitmap) continue;

    const destX = 0;
    const destY = Math.round(slice.y * dpr);
    const sliceHeight = slice.height * dpr;

    // For the last slice, crop bottom overlap if remaining height is less than viewport
    if (i === slices.length - 1 && destY + sliceHeight > canvasHeight) {
      const remainingHeight = canvasHeight - destY;
      const sourceY = imgBitmap.height - remainingHeight;
      ctx.drawImage(
        imgBitmap,
        0, Math.max(0, sourceY), imgBitmap.width, remainingHeight,
        destX, destY, imgBitmap.width, remainingHeight
      );
    } else {
      ctx.drawImage(imgBitmap, destX, destY);
    }

    // Immediately free GPU memory
    if (imgBitmap.close) {
      imgBitmap.close();
    }
  }

  // Convert canvas to Blob
  let blob;
  if (canvas.convertToBlob) {
    blob = await canvas.convertToBlob({ type: 'image/png' });
  } else {
    blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  }

  return { blob, width: canvasWidth, height: canvasHeight };
}

// Dedicated Web Worker message listener (guarded against ServiceWorkerGlobalScope collision)
if (typeof DedicatedWorkerGlobalScope !== 'undefined' && self instanceof DedicatedWorkerGlobalScope) {
  self.onmessage = async (e) => {
    try {
      const { slices, totalWidth, totalHeight, dpr } = e.data;
      const result = await stitchSlices({ slices, totalWidth, totalHeight, dpr });
      self.postMessage({ success: true, ...result });
    } catch (err) {
      self.postMessage({ success: false, error: err.message });
    }
  };
}
