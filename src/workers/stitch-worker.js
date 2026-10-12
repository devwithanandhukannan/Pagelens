/**
 * Pagelens — Stitch Worker / Engine
 * Assembles screenshot slices into one seamless master image using exact measured Y-offsets.
 */

export async function stitchSlices({
  slices,
  totalWidth,
  totalHeight,
  dpr = 1,
  isElementScroll = false,
  topOffset = 0,
  bottomOffset = 0,
  scrollStep = 0,
}) {
  const canvasWidth = Math.round(totalWidth * dpr);
  const canvasHeight = isElementScroll
    ? Math.round((topOffset + totalHeight + bottomOffset) * dpr)
    : Math.round(totalHeight * dpr);

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

  // 2. Stitch slices
  if (isElementScroll && slices.length > 1) {
    // --- SPAs & Inner Scroll Containers (WhatsApp Web, Claude, ChatGPT) ---
    const topPx = Math.round(topOffset * dpr);
    const bottomPx = Math.round(bottomOffset * dpr);
    const stepPx = Math.round((scrollStep || slices[0]?.height || totalHeight) * dpr);
    let filledY = 0;

    for (let i = 0; i < slices.length; i++) {
      const imgBitmap = bitmaps[i];
      if (!imgBitmap) continue;

      if (i === 0) {
        // Slice 0: Draw top header + first slice content
        const sourceH = Math.min(imgBitmap.height, topPx + stepPx);
        ctx.drawImage(imgBitmap, 0, 0, imgBitmap.width, sourceH, 0, 0, canvasWidth, sourceH);
        filledY = sourceH;
      } else if (i < slices.length - 1) {
        // Intermediate slices: Draw only the newly scrolled container content (exclude duplicate top header)
        const sourceY = topPx;
        const sourceH = Math.min(stepPx, imgBitmap.height - sourceY);
        if (sourceH > 0) {
          ctx.drawImage(imgBitmap, 0, sourceY, imgBitmap.width, sourceH, 0, filledY, canvasWidth, sourceH);
          filledY += sourceH;
        }
      } else {
        // Final slice: Draw the remaining content of the container + the bottom bar (input box)
        const remainingContentH = Math.max(0, (topPx + Math.round(totalHeight * dpr)) - filledY);
        if (remainingContentH > 0) {
          const sourceContentY = Math.max(topPx, (topPx + stepPx) - remainingContentH);
          ctx.drawImage(imgBitmap, 0, sourceContentY, imgBitmap.width, remainingContentH, 0, filledY, canvasWidth, remainingContentH);
          filledY += remainingContentH;
        }

        // Draw the bottom bar (e.g. WhatsApp message input bar)
        if (bottomPx > 0) {
          const sourceBottomY = Math.max(0, imgBitmap.height - bottomPx);
          const sourceBottomH = Math.min(bottomPx, imgBitmap.height - sourceBottomY);
          ctx.drawImage(imgBitmap, 0, sourceBottomY, imgBitmap.width, sourceBottomH, 0, filledY, canvasWidth, sourceBottomH);
          filledY += sourceBottomH;
        }
      }

      if (imgBitmap.close) {
        imgBitmap.close();
      }
    }
  } else {
    // --- Standard Window Scroll Slices (GoFullPage stitching algorithm) ---
    const sliceHeightPx = Math.round((slices[0]?.height || totalHeight) * dpr);

    for (let i = 0; i < slices.length; i++) {
      const imgBitmap = bitmaps[i];
      if (!imgBitmap) continue;

      const destX = 0;

      if (i < slices.length - 1) {
        // Standard full slice
        const destY = Math.round(i * sliceHeightPx);
        ctx.drawImage(imgBitmap, destX, destY);
      } else if (slices.length === 1) {
        // Single slice (page fits in viewport)
        ctx.drawImage(imgBitmap, 0, 0, Math.min(imgBitmap.width, canvasWidth), Math.min(imgBitmap.height, canvasHeight));
      } else {
        // Last slice: crop only the non-overlapping bottom remainder to eliminate any duplicate seams
        const filledY = Math.round((slices.length - 1) * sliceHeightPx);
        const remainingHeight = Math.max(0, canvasHeight - filledY);
        const sourceY = Math.max(0, imgBitmap.height - remainingHeight);

        if (remainingHeight > 0) {
          ctx.drawImage(
            imgBitmap,
            0, sourceY, imgBitmap.width, remainingHeight,
            destX, filledY, imgBitmap.width, remainingHeight
          );
        }
      }

      if (imgBitmap.close) {
        imgBitmap.close();
      }
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
      const { slices, totalWidth, totalHeight, dpr, isElementScroll, topOffset, bottomOffset, scrollStep } = e.data;
      const result = await stitchSlices({ slices, totalWidth, totalHeight, dpr, isElementScroll, topOffset, bottomOffset, scrollStep });
      self.postMessage({ success: true, ...result });
    } catch (err) {
      self.postMessage({ success: false, error: err.message });
    }
  };
}
