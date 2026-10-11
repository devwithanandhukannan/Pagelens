/**
 * Pagelens — Export Renderer
 * Flattens all layers into a final crisp output canvas at full original resolution.
 * Bakes irreversible redactions permanently into pixels.
 */

import { baseLayer } from './base-layer.js';
import { effectsLayer } from './effects-layer.js';
import { annotationLayer } from './annotation-layer.js';

export class ExportRenderer {
  renderToCanvas(documentModel) {
    const { width, height, crop } = documentModel;

    // Target dimensions (cropped or full)
    const exportWidth = crop ? Math.round(crop.width) : width;
    const exportHeight = crop ? Math.round(crop.height) : height;

    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();
    if (crop) {
      // Translate so crop.x, crop.y maps to 0,0
      ctx.translate(-crop.x, -crop.y);
    }

    // 1. Draw base layer
    baseLayer.render(ctx, documentModel);

    // 2. Draw and bake effects (redaction & blur)
    effectsLayer.render(ctx, documentModel, true);

    // 3. Draw vector annotations (shapes, text, stamps)
    annotationLayer.render(ctx, documentModel, null);

    ctx.restore();

    return canvas;
  }
}

export const exportRenderer = new ExportRenderer();
