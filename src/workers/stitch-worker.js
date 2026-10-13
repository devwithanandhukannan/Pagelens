/**
 * Pagelens — Stitch Worker / Engine
 * Assembles screenshot slices into one seamless master image using exact measured Y-offsets.
 */

export const MAX_SAFE_CANVAS_DIMENSION = 16384;

export async function stitchSlices({
  slices,
  totalWidth,
  totalHeight,
  dpr = 1,
  isElementScroll = false,
  topOffset = 0,
  bottomOffset = 0,
  scrollStep = 0,
  rectLeft = 0,
  rectWidth = 0,
  bgColor = '#111b21',
}) {
  if (!slices || slices.length === 0) {
    throw new Error('No screenshot slices were provided for stitching.');
  }

  // 1. Concurrently decode all slices across background threads FIRST so we know physical dimensions
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

  const firstValidBitmap = bitmaps.find((b) => b != null);
  if (!firstValidBitmap) {
    throw new Error('Failed to decode captured slice images.');
  }

  const bmpWidth = firstValidBitmap.width;
  const bmpHeight = firstValidBitmap.height;

  // 2. Compute unconstrained dimensions
  const safeDpr = Math.max(0.1, Number(dpr) || 1);
  const unconstrainedWidth = Math.max(1, Math.round((totalWidth || bmpWidth / safeDpr) * safeDpr) || bmpWidth);
  let unconstrainedHeight = isElementScroll
    ? Math.round(((topOffset || 0) + (totalHeight || (bmpHeight / safeDpr)) + (bottomOffset || 0)) * safeDpr)
    : Math.round((totalHeight || ((slices.length * bmpHeight) / safeDpr)) * safeDpr);

  if (!unconstrainedHeight || unconstrainedHeight <= 0 || isNaN(unconstrainedHeight)) {
    unconstrainedHeight = Math.max(1, slices.length * bmpHeight);
  }

  // 3. Clamp dimensions to browser maximum safe canvas limit (16,384px) to prevent Chromium 0x0 buffer allocation failure
  let scaleFactor = 1;
  const maxRequestedDim = Math.max(unconstrainedWidth, unconstrainedHeight);
  if (maxRequestedDim > MAX_SAFE_CANVAS_DIMENSION) {
    scaleFactor = MAX_SAFE_CANVAS_DIMENSION / maxRequestedDim;
  }

  const canvasWidth = Math.max(1, Math.min(MAX_SAFE_CANVAS_DIMENSION, Math.round(unconstrainedWidth * scaleFactor)));
  const canvasHeight = Math.max(1, Math.min(MAX_SAFE_CANVAS_DIMENSION, Math.round(unconstrainedHeight * scaleFactor)));

  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    } catch (allocErr) {
      console.warn('[StitchWorker] Failed to allocate OffscreenCanvas at full dimension, falling back to safe bounds:', allocErr);
      const safeW = Math.max(1, Math.min(8192, canvasWidth));
      const safeH = Math.max(1, Math.min(8192, canvasHeight));
      canvas = new OffscreenCanvas(safeW, safeH);
    }
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  } else {
    throw new Error('No canvas implementation available in current runtime.');
  }

  // Double check canvas dimensions are non-zero
  if (canvas.width === 0 || canvas.height === 0) {
    canvas.width = Math.max(1, canvasWidth);
    canvas.height = Math.max(1, canvasHeight);
  }

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Apply downscale transformation if image exceeds safe browser canvas size
  if (scaleFactor < 1) {
    ctx.scale(scaleFactor, scaleFactor);
  }

  // 4. Stitch slices
  if (isElementScroll && slices.length > 1) {
    // --- SPAs & Inner Scroll Containers (WhatsApp Web, Claude, ChatGPT) ---
    const topPx = Math.round((topOffset || 0) * safeDpr);
    const bottomPx = Math.round((bottomOffset || 0) * safeDpr);
    const stepPx = Math.round((scrollStep || slices[0]?.height || (bmpHeight / safeDpr)) * safeDpr);
    const isPartialWidth = rectWidth > 0 && rectWidth < (unconstrainedWidth / safeDpr - 30);
    const colSx = Math.round((rectLeft || 0) * safeDpr);
    const colSw = Math.round((rectWidth || (bmpWidth / safeDpr)) * safeDpr);
    let filledY = 0;
    let sampledColor = bgColor || '#111b21';

    for (let i = 0; i < slices.length; i++) {
      const imgBitmap = bitmaps[i];
      if (!imgBitmap) continue;

      if (i === 0) {
        // Slice 0: Draw top header + first slice content across full width
        const sourceH = Math.min(imgBitmap.height, topPx + stepPx);
        ctx.drawImage(imgBitmap, 0, 0, imgBitmap.width, sourceH, 0, 0, unconstrainedWidth, sourceH);
        filledY = sourceH;

        // Sample background color directly from the non-scrolling side to guarantee seamless fill
        if (isPartialWidth) {
          try {
            const sampleX = (rectLeft || 0) > 50
              ? Math.round(20 * safeDpr)
              : Math.min(unconstrainedWidth - 10, Math.round(((rectLeft || 0) + (rectWidth || 0) + 30) * safeDpr));
            const sampleY = Math.min(imgBitmap.height - 10, Math.max(10, Math.round(((topOffset || 0) + 30) * safeDpr)));
            const pixel = ctx.getImageData(Math.round(sampleX * scaleFactor), Math.round(sampleY * scaleFactor), 1, 1).data;
            if (pixel && pixel[3] > 0) {
              sampledColor = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
            }
          } catch (_) {}
        }
      } else if (i < slices.length - 1) {
        // Intermediate slices: Draw only the newly scrolled container content (exclude duplicate top header)
        const sourceY = topPx;
        const sourceH = Math.min(stepPx, imgBitmap.height - sourceY);
        if (sourceH > 0) {
          if (isPartialWidth) {
            // Fill static background to prevent repeating static sidebars or placeholders ("Voice and video calling")
            ctx.fillStyle = sampledColor;
            ctx.fillRect(0, filledY, unconstrainedWidth, sourceH);

            // Draw only the column that actually scrolled
            ctx.drawImage(imgBitmap, colSx, sourceY, colSw, sourceH, colSx, filledY, colSw, sourceH);
          } else {
            ctx.drawImage(imgBitmap, 0, sourceY, imgBitmap.width, sourceH, 0, filledY, unconstrainedWidth, sourceH);
          }
          filledY += sourceH;
        }
      } else {
        // Final slice: Draw the remaining content of the container + the bottom bar (input box)
        const remainingContentH = Math.max(0, (topPx + Math.round((totalHeight || 0) * safeDpr)) - filledY);
        if (remainingContentH > 0) {
          const sourceContentY = Math.max(topPx, (topPx + stepPx) - remainingContentH);
          if (isPartialWidth) {
            ctx.fillStyle = sampledColor;
            ctx.fillRect(0, filledY, unconstrainedWidth, remainingContentH);
            ctx.drawImage(imgBitmap, colSx, sourceContentY, colSw, remainingContentH, colSx, filledY, colSw, remainingContentH);
          } else {
            ctx.drawImage(imgBitmap, 0, sourceContentY, imgBitmap.width, remainingContentH, 0, filledY, unconstrainedWidth, remainingContentH);
          }
          filledY += remainingContentH;
        }

        // Draw the bottom bar (e.g. WhatsApp message input bar)
        if (bottomPx > 0) {
          const sourceBottomY = Math.max(0, imgBitmap.height - bottomPx);
          const sourceBottomH = Math.min(bottomPx, imgBitmap.height - sourceBottomY);
          if (isPartialWidth) {
            ctx.fillStyle = sampledColor;
            ctx.fillRect(0, filledY, unconstrainedWidth, sourceBottomH);
            ctx.drawImage(imgBitmap, colSx, sourceBottomY, colSw, sourceBottomH, colSx, filledY, colSw, sourceBottomH);
          } else {
            ctx.drawImage(imgBitmap, 0, sourceBottomY, imgBitmap.width, sourceBottomH, 0, filledY, unconstrainedWidth, sourceBottomH);
          }
          filledY += sourceBottomH;
        }
      }

      if (imgBitmap.close) {
        imgBitmap.close();
      }
    }
  } else {
    // --- Standard Window Scroll Slices (GoFullPage stitching algorithm) ---
    const sliceHeightPx = Math.round((slices[0]?.height || (bmpHeight / safeDpr)) * safeDpr) || bmpHeight;

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
        ctx.drawImage(imgBitmap, 0, 0, Math.min(imgBitmap.width, unconstrainedWidth), Math.min(imgBitmap.height, unconstrainedHeight));
      } else {
        // Last slice: crop only the non-overlapping bottom remainder to eliminate any duplicate seams
        const filledY = Math.round((slices.length - 1) * sliceHeightPx);
        const remainingHeight = Math.max(0, unconstrainedHeight - filledY);
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

  // Guard against zero size canvas right before convertToBlob
  if (canvas.width === 0 || canvas.height === 0) {
    canvas.width = Math.max(1, canvasWidth);
    canvas.height = Math.max(1, canvasHeight);
  }

  // Convert canvas to Blob
  let blob;
  if (canvas.convertToBlob) {
    try {
      blob = await canvas.convertToBlob({ type: 'image/png' });
    } catch (blobErr) {
      console.warn('[StitchWorker] Primary convertToBlob failed, enforcing dimensions and retrying:', blobErr);
      canvas.width = Math.max(1, Math.min(canvas.width || canvasWidth, 8192));
      canvas.height = Math.max(1, Math.min(canvas.height || canvasHeight, 8192));
      blob = await canvas.convertToBlob({ type: 'image/png' });
    }
  } else {
    blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  }

  return { blob, width: canvasWidth, height: canvasHeight };
}

// Dedicated Web Worker message listener (guarded against ServiceWorkerGlobalScope collision)
if (typeof DedicatedWorkerGlobalScope !== 'undefined' && self instanceof DedicatedWorkerGlobalScope) {
  self.onmessage = async (e) => {
    try {
      const {
        slices,
        totalWidth,
        totalHeight,
        dpr,
        isElementScroll,
        topOffset,
        bottomOffset,
        scrollStep,
        rectLeft,
        rectWidth,
        bgColor,
      } = e.data;
      const result = await stitchSlices({
        slices,
        totalWidth,
        totalHeight,
        dpr,
        isElementScroll,
        topOffset,
        bottomOffset,
        scrollStep,
        rectLeft,
        rectWidth,
        bgColor,
      });
      self.postMessage({ success: true, ...result });
    } catch (err) {
      self.postMessage({ success: false, error: err.message });
    }
  };
}
