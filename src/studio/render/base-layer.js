/**
 * Pagelens — Base Render Layer
 * Draws the master captured screenshot, handling crop masks and tiled segments.
 */

export class BaseLayer {
  render(ctx, documentModel) {
    const { baseImage, width, height, crop } = documentModel;
    if (!baseImage) return;

    ctx.save();

    // If crop mask exists, apply clipping region
    if (crop) {
      ctx.beginPath();
      ctx.rect(crop.x, crop.y, crop.width, crop.height);
      ctx.clip();
    }

    ctx.drawImage(baseImage, 0, 0, width, height);

    ctx.restore();
  }
}

export const baseLayer = new BaseLayer();
