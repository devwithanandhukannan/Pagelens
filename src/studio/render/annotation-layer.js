/**
 * Pagelens — Annotation Render Layer
 * Renders vector shapes, smoothed pen paths, highlighters, text, bug stamps, and selection handles.
 */

import { smoothPathPoints } from '../../shared/geometry-utils.js';

export class AnnotationLayer {
  render(ctx, documentModel, selectedId = null) {
    const { annotations, crop } = documentModel;

    ctx.save();
    if (crop) {
      ctx.beginPath();
      ctx.rect(crop.x, crop.y, crop.width, crop.height);
      ctx.clip();
    }

    for (const item of annotations) {
      // Blur, pixelate, and redact are handled in effectsLayer
      if (item.type === 'blur' || item.type === 'pixelate' || item.type === 'redact') {
        continue;
      }

      ctx.save();

      switch (item.type) {
        case 'shape':
          this.renderShape(ctx, item);
          break;

        case 'pen':
          this.renderPen(ctx, item);
          break;

        case 'highlighter':
          this.renderHighlighter(ctx, item);
          break;

        case 'text':
          this.renderText(ctx, item);
          break;

        case 'stamp':
          this.renderStamp(ctx, item);
          break;

        case 'emoji':
          this.renderEmoji(ctx, item);
          break;
      }

      // Draw selection bounding box and handles if currently selected
      if (selectedId && item.id === selectedId) {
        this.renderSelectionHandles(ctx, item);
      }

      ctx.restore();
    }

    ctx.restore();

    // Render active Crop Preview Overlay with dark veil, white boundary, and grid
    if (documentModel.cropPreview && documentModel.cropPreview.width > 0 && documentModel.cropPreview.height > 0) {
      const cp = documentModel.cropPreview;
      ctx.save();

      // Semi-transparent dark mask covering areas outside the crop box
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, documentModel.width, cp.y);
      ctx.fillRect(0, cp.y + cp.height, documentModel.width, Math.max(0, documentModel.height - (cp.y + cp.height)));
      ctx.fillRect(0, cp.y, cp.x, cp.height);
      ctx.fillRect(cp.x + cp.width, cp.y, Math.max(0, documentModel.width - (cp.x + cp.width)), cp.height);

      // Clean white boundary
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(cp.x, cp.y, cp.width, cp.height);

      // Rule of thirds grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cp.x + cp.width / 3, cp.y);
      ctx.lineTo(cp.x + cp.width / 3, cp.y + cp.height);
      ctx.moveTo(cp.x + (cp.width * 2) / 3, cp.y);
      ctx.lineTo(cp.x + (cp.width * 2) / 3, cp.y + cp.height);
      ctx.moveTo(cp.x, cp.y + cp.height / 3);
      ctx.lineTo(cp.x + cp.width, cp.y + cp.height / 3);
      ctx.moveTo(cp.x, cp.y + (cp.height * 2) / 3);
      ctx.lineTo(cp.x + cp.width, cp.y + (cp.height * 2) / 3);
      ctx.stroke();

      ctx.restore();
    }
  }

  renderShape(ctx, item) {
    ctx.strokeStyle = item.color || '#6D63E6';
    ctx.lineWidth = item.strokeWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const { x, y, width, height, shapeType } = item;

    ctx.beginPath();

    if (shapeType === 'rect') {
      const radius = 6;
      ctx.roundRect ? ctx.roundRect(x, y, width, height, radius) : ctx.rect(x, y, width, height);
      if (item.fill) {
        ctx.fillStyle = item.fillColor || 'rgba(109, 99, 230, 0.15)';
        ctx.fill();
      }
      ctx.stroke();
    } else if (shapeType === 'ellipse') {
      const rx = Math.abs(width) / 2;
      const ry = Math.abs(height) / 2;
      const cx = x + width / 2;
      const cy = y + height / 2;
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
      if (item.fill) {
        ctx.fillStyle = item.fillColor || 'rgba(109, 99, 230, 0.15)';
        ctx.fill();
      }
      ctx.stroke();
    } else if (shapeType === 'line') {
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
      ctx.stroke();
    } else if (shapeType === 'arrow') {
      this.drawArrow(ctx, x, y, x + width, y + height, item.strokeWidth || 3);
    }
  }

  drawArrow(ctx, fromX, fromY, toX, toY, strokeWidth) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.hypot(dx, dy);
    if (length < 2) return;

    const angle = Math.atan2(dy, dx);

    // Sleek acute angle (~17 degrees each side) for needle-sharp Apple-grade arrowheads
    const headLen = Math.max(20, Math.min(length * 0.45, strokeWidth * 3.8 + 14));
    const barbAngle = 0.30; // ~17.2 degrees — razor-sharp needle point
    const indent = headLen * 0.28; // Crisp swept-back chevron notch

    const tipX = toX;
    const tipY = toY;
    const leftX = tipX - headLen * Math.cos(angle - barbAngle);
    const leftY = tipY - headLen * Math.sin(angle - barbAngle);
    const rightX = tipX - headLen * Math.cos(angle + barbAngle);
    const rightY = tipY - headLen * Math.sin(angle + barbAngle);
    const notchX = tipX - (headLen - indent) * Math.cos(angle);
    const notchY = tipY - (headLen - indent) * Math.sin(angle);

    ctx.save();

    // 1. Draw shaft from starting point up to the recessed notch
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(notchX, notchY);
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'butt';
    ctx.stroke();

    // Start cap if desired
    ctx.beginPath();
    ctx.arc(fromX, fromY, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();

    // 2. Draw razor-sharp arrowhead with miter join
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(notchX, notchY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();

    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();

    // Sharp mitered outline ensuring needle-point apex
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 10;
    ctx.lineWidth = Math.max(1, strokeWidth * 0.35);
    ctx.stroke();

    ctx.restore();
  }

  renderPen(ctx, item) {
    if (!item.points || item.points.length === 0) return;
    ctx.strokeStyle = item.color || '#6D63E6';
    ctx.fillStyle = item.color || '#6D63E6';
    ctx.lineWidth = item.strokeWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (item.points.length === 1) {
      ctx.beginPath();
      ctx.arc(item.points[0].x, item.points[0].y, (item.strokeWidth || 3) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const points = item.points.length > 2 ? smoothPathPoints(item.points) : item.points;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }

  renderHighlighter(ctx, item) {
    if (!item.points || item.points.length === 0) return;
    const points = item.points;

    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = item.color || '#FACC15';
    ctx.fillStyle = item.color || '#FACC15';
    ctx.lineWidth = item.strokeWidth || 18;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'bevel';

    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, (item.strokeWidth || 18) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  renderText(ctx, item) {
    const fontSize = item.fontSize || 16;
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
    ctx.fillStyle = item.color || '#F8FAFC';
    const isCenter = item.align === 'center';
    ctx.textAlign = isCenter ? 'center' : 'left';
    ctx.textBaseline = 'top';

    const text = item.text || 'Text';
    const lines = text.split('\n');

    // Soft backdrop capsule if configured
    if (item.showBackground !== false) {
      const padding = 8;
      let maxLineWidth = 0;
      for (const line of lines) {
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
      }
      const totalTextH = lines.length * (fontSize * 1.3);
      const bgX = isCenter ? item.x - maxLineWidth / 2 - padding : item.x - padding;

      ctx.save();
      ctx.fillStyle = 'rgba(18, 19, 23, 0.88)';
      const radius = 6;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(bgX, item.y - padding, maxLineWidth + padding * 2, totalTextH + padding * 2, radius);
        ctx.fill();
      } else {
        ctx.fillRect(bgX, item.y - padding, maxLineWidth + padding * 2, totalTextH + padding * 2);
      }
      ctx.restore();
    }

    lines.forEach((line, i) => {
      ctx.fillText(line, item.x, item.y + i * (fontSize * 1.3));
    });
  }

  renderEmoji(ctx, item) {
    const size = item.size || 36;
    ctx.save();
    ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 6;
    ctx.fillText(item.emoji || '🔥', item.x, item.y);
    ctx.restore();
  }

  renderStamp(ctx, item) {
    const radius = 14;
    const cx = item.x;
    const cy = item.y;

    // Outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = item.color || '#6D63E6';
    ctx.fill();

    // Soft outer shadow/glow
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Number text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px "SF Pro Text", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(item.number || '1'), cx, cy);
  }

  renderSelectionHandles(ctx, item) {
    let x = item.x;
    let y = item.y;
    let w = item.width || 30;
    let h = item.height || 30;

    if (item.type === 'emoji') {
      const s = item.size || 36;
      x = item.x - s / 2;
      y = item.y - s / 2;
      w = s;
      h = s;
    } else if (item.type === 'text' && item.align === 'center') {
      x = item.x - w / 2;
    }

    ctx.save();
    ctx.strokeStyle = '#6D63E6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
    ctx.setLineDash([]);

    // Corner handle knobs
    const corners = [
      { x: x - 4, y: y - 4 },
      { x: x + w + 4, y: y - 4 },
      { x: x + w + 4, y: y + h + 4 },
      { x: x - 4, y: y + h + 4 },
    ];

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#6D63E6';
    ctx.lineWidth = 2;

    for (const pt of corners) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

export const annotationLayer = new AnnotationLayer();
