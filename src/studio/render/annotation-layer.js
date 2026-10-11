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
      }

      // Draw selection bounding box and handles if currently selected
      if (selectedId && item.id === selectedId) {
        this.renderSelectionHandles(ctx, item);
      }

      ctx.restore();
    }

    ctx.restore();
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
    const headLen = Math.max(14, strokeWidth * 3.5);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Shaft
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLen * Math.cos(angle - Math.PI / 6),
      toY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLen * Math.cos(angle + Math.PI / 6),
      toY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }

  renderPen(ctx, item) {
    if (!item.points || item.points.length < 2) return;
    const points = smoothPathPoints(item.points);

    ctx.strokeStyle = item.color || '#6D63E6';
    ctx.lineWidth = item.strokeWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }

  renderHighlighter(ctx, item) {
    if (!item.points || item.points.length < 2) return;
    const points = item.points;

    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = item.color || '#FACC15'; // Neon yellow or mint
    ctx.lineWidth = item.strokeWidth || 18;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'bevel';

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
    ctx.textBaseline = 'top';

    const text = item.text || 'Text';
    const lines = text.split('\n');

    // Soft backdrop capsule if configured
    if (item.showBackground !== false) {
      const padding = 6;
      let maxLineWidth = 0;
      for (const line of lines) {
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
      }
      const totalTextH = lines.length * (fontSize * 1.3);

      ctx.save();
      ctx.fillStyle = 'rgba(18, 19, 23, 0.85)';
      const radius = 6;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(item.x - padding, item.y - padding, maxLineWidth + padding * 2, totalTextH + padding * 2, radius);
        ctx.fill();
      } else {
        ctx.fillRect(item.x - padding, item.y - padding, maxLineWidth + padding * 2, totalTextH + padding * 2);
      }
      ctx.restore();
    }

    lines.forEach((line, i) => {
      ctx.fillText(line, item.x, item.y + i * (fontSize * 1.3));
    });
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
    const x = item.x;
    const y = item.y;
    const w = item.width || 30;
    const h = item.height || 30;

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
