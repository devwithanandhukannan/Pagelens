/**
 * Pagelens — Effects Render Layer
 * Applies visual pixelate/blur and irreversible solid-fill redactions to specific document regions.
 */

export class EffectsLayer {
  render(ctx, documentModel, isExport = false) {
    const { annotations, crop } = documentModel;
    const effectObjects = annotations.filter(
      (a) => a.type === 'blur' || a.type === 'pixelate' || a.type === 'redact'
    );

    if (effectObjects.length === 0) return;

    ctx.save();
    if (crop) {
      ctx.beginPath();
      ctx.rect(crop.x, crop.y, crop.width, crop.height);
      ctx.clip();
    }

    for (const item of effectObjects) {
      const rx = Math.round(item.x);
      const ry = Math.round(item.y);
      const rw = Math.round(item.width);
      const rh = Math.round(item.height);

      if (rw <= 0 || rh <= 0) continue;

      if (item.type === 'redact') {
        // Solid-fill irreversible redaction
        ctx.save();
        ctx.fillStyle = item.color || '#000000';
        ctx.fillRect(rx, ry, rw, rh);

        // Subtly render security badge label in editor view (omitted in final export if desired, or styled cleanly)
        if (!isExport && rw > 60 && rh > 24) {
          ctx.fillStyle = '#EF4444';
          ctx.font = '10px "SF Mono", Menlo, monospace';
          ctx.fillText('REDACTED', rx + 6, ry + 15);
        }
        ctx.restore();
      } else if (item.type === 'pixelate' || item.type === 'blur') {
        // High-performance Pixelation Filter
        const blockSize = Math.max(6, item.strength || 12);
        try {
          // Extract sub-region
          const imgData = ctx.getImageData(rx, ry, rw, rh);
          const data = imgData.data;

          for (let y = 0; y < rh; y += blockSize) {
            for (let x = 0; x < rw; x += blockSize) {
              const pixelIndex = (y * rw + x) * 4;
              const r = data[pixelIndex];
              const g = data[pixelIndex + 1];
              const b = data[pixelIndex + 2];
              const a = data[pixelIndex + 3];

              // Fill block with average/sampled color
              for (let by = 0; by < blockSize && y + by < rh; by++) {
                for (let bx = 0; bx < blockSize && x + bx < rw; bx++) {
                  const targetIdx = ((y + by) * rw + (x + bx)) * 4;
                  data[targetIdx] = r;
                  data[targetIdx + 1] = g;
                  data[targetIdx + 2] = b;
                  data[targetIdx + 3] = a;
                }
              }
            }
          }

          ctx.putImageData(imgData, rx, ry);
        } catch (e) {
          // Fallback if cross-origin tainted canvas
          ctx.fillStyle = 'rgba(128, 128, 128, 0.9)';
          ctx.fillRect(rx, ry, rw, rh);
        }
      }
    }

    ctx.restore();
  }
}

export const effectsLayer = new EffectsLayer();
