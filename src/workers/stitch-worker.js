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
  rectLeft = 0,
  rectWidth = 0,
  bgColor = '#111b21',
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
    const isPartialWidth = rectWidth > 0 && rectWidth < (totalWidth - 30);
    const colSx = Math.round(rectLeft * dpr);
    const colSw = Math.round(rectWidth * dpr);
    let filledY = 0;
    let sampledColor = bgColor || '#111b21';

    for (let i = 0; i < slices.length; i++) {
      const imgBitmap = bitmaps[i];
      if (!imgBitmap) continue;

      if (i === 0) {
        // Slice 0: Draw top header + first slice content across full width
        const sourceH = Math.min(imgBitmap.height, topPx + stepPx);
        ctx.drawImage(imgBitmap, 0, 0, imgBitmap.width, sourceH, 0, 0, canvasWidth, sourceH);
        filledY = sourceH;

        // Sample background color directly from the non-scrolling side to guarantee seamless fill
        if (isPartialWidth) {
          try {
            const sampleX = rectLeft > 50
              ? Math.round(20 * dpr)
              : Math.min(canvasWidth - 10, Math.round((rectLeft + rectWidth + 30) * dpr));
            const sampleY = Math.min(imgBitmap.height - 10, Math.max(10, Math.round((topOffset + 30) * dpr)));
            const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;
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
            ctx.fillRect(0, filledY, canvasWidth, sourceH);

            // Draw only the column that actually scrolled
            ctx.drawImage(imgBitmap, colSx, sourceY, colSw, sourceH, colSx, filledY, colSw, sourceH);
          } else {
            ctx.drawImage(imgBitmap, 0, sourceY, imgBitmap.width, sourceH, 0, filledY, canvasWidth, sourceH);
          }
          filledY += sourceH;
        }
      } else {
        // Final slice: Draw the remaining content of the container + the bottom bar (input box)
        const remainingContentH = Math.max(0, (topPx + Math.round(totalHeight * dpr)) - filledY);
        if (remainingContentH > 0) {
          const sourceContentY = Math.max(topPx, (topPx + stepPx) - remainingContentH);
          if (isPartialWidth) {
            ctx.fillStyle = sampledColor;
            ctx.fillRect(0, filledY, canvasWidth, remainingContentH);
            ctx.drawImage(imgBitmap, colSx, sourceContentY, colSw, remainingContentH, colSx, filledY, colSw, remainingContentH);
          } else {
            ctx.drawImage(imgBitmap, 0, sourceContentY, imgBitmap.width, remainingContentH, 0, filledY, canvasWidth, remainingContentH);
          }
          filledY += remainingContentH;
        }

        // Draw the bottom bar (e.g. WhatsApp message input bar)
        if (bottomPx > 0) {
          const sourceBottomY = Math.max(0, imgBitmap.height - bottomPx);
          const sourceBottomH = Math.min(bottomPx, imgBitmap.height - sourceBottomY);
          if (isPartialWidth) {
            ctx.fillStyle = sampledColor;
            ctx.fillRect(0, filledY, canvasWidth, sourceBottomH);
            ctx.drawImage(imgBitmap, colSx, sourceBottomY, colSw, sourceBottomH, colSx, filledY, colSw, sourceBottomH);
          } else {
            ctx.drawImage(imgBitmap, 0, sourceBottomY, imgBitmap.width, sourceBottomH, 0, filledY, canvasWidth, sourceBottomH);
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
