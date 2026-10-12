/**
 * Pagelens — Eraser Tool
 * Deletes individual markup elements (shapes, pens, highlighters, text, stamps, blurs)
 * with precise geometric hit-testing on click or drag.
 */

import { ToolInterface } from './tool-interface.js';
import { history } from '../core/history.js';
import { DeleteCommand } from '../core/commands/move-command.js';
import { eventBus } from '../core/event-bus.js';

export class EraserTool extends ToolInterface {
  constructor() {
    super('eraser', 'crosshair');
    this.isErasing = false;
    this.erasedInCurrentStroke = new Set();
  }

  onPointerDown(e, point, store, docModel) {
    this.isErasing = true;
    this.erasedInCurrentStroke.clear();
    this.eraseAtPoint(point, store, docModel);
  }

  onPointerMove(e, point, store, docModel) {
    if (!this.isErasing) return;
    this.eraseAtPoint(point, store, docModel);
  }

  onPointerUp(e, point, store, docModel) {
    this.isErasing = false;
    this.erasedInCurrentStroke.clear();
  }

  eraseAtPoint(point, store, docModel) {
    const { annotations } = docModel;
    if (!annotations || annotations.length === 0) return;

    // Search top-to-bottom (newest annotations first)
    const hit = this.hitTest(point, annotations);
    if (hit && !this.erasedInCurrentStroke.has(hit.id)) {
      this.erasedInCurrentStroke.add(hit.id);

      // If selected object is the erased one, deselect
      if (store.getState().selectedObjectId === hit.id) {
        store.setSelectedObject(null);
      }

      // Record in undo history
      history.execute(new DeleteCommand(hit));

      // Visual feedback
      eventBus.emit('show-toast', {
        message: 'Markup erased',
        options: { icon: 'check', duration: 1200 }
      });
    }
  }

  hitTest(point, annotations) {
    const hitRadius = 18; // Hit tolerance radius in canvas units

    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      if (this.isAnnotationHit(point, a, hitRadius)) {
        return a;
      }
    }
    return null;
  }

  isAnnotationHit(pt, a, radius) {
    const r = radius + (a.strokeWidth ? a.strokeWidth / 2 : 0);

    // 1. Pen / Highlighter (Point path)
    if (a.points && a.points.length > 0) {
      const pts = a.points;
      for (let i = 0; i < pts.length - 1; i++) {
        if (this.distToSegment(pt.x, pt.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= r) {
          return true;
        }
      }
      if (pts.length === 1) {
        if (Math.hypot(pt.x - pts[0].x, pt.y - pts[0].y) <= r) return true;
      }
      return false;
    }

    // 2. Lines and Arrows
    if (a.type === 'shape' && (a.shapeType === 'line' || a.shapeType === 'arrow')) {
      const x2 = a.x + (a.width || 0);
      const y2 = a.y + (a.height || 0);
      return this.distToSegment(pt.x, pt.y, a.x, a.y, x2, y2) <= r;
    }

    // 3. Ellipses
    if (a.type === 'shape' && a.shapeType === 'ellipse') {
      const cx = a.x + (a.width || 0) / 2;
      const cy = a.y + (a.height || 0) / 2;
      const rx = Math.max(8, Math.abs(a.width || 0) / 2) + r;
      const ry = Math.max(8, Math.abs(a.height || 0) / 2) + r;
      const normDist = Math.pow((pt.x - cx) / rx, 2) + Math.pow((pt.y - cy) / ry, 2);
      return normDist <= 1.0;
    }

    // 4. Stamps
    if (a.type === 'stamp') {
      const cx = a.x;
      const cy = a.y;
      const stampRadius = 20 + r;
      return Math.hypot(pt.x - cx, pt.y - cy) <= stampRadius;
    }

    // 5. Rectangles, Text, Blurs, Redacts
    const minX = Math.min(a.x, a.x + (a.width || 0)) - r;
    const maxX = Math.max(a.x, a.x + (a.width || 0)) + r;
    const minY = Math.min(a.y, a.y + (a.height || 0)) - r;
    const maxY = Math.max(a.y, a.y + (a.height || 0)) + r;

    // Adjust for text where y is baseline or top
    if (a.type === 'text') {
      const fontSize = a.fontSize || 16;
      const estimatedWidth = Math.max(30, (a.text?.length || 4) * fontSize * 0.65);
      return pt.x >= a.x - r && pt.x <= a.x + estimatedWidth + r &&
             pt.y >= a.y - fontSize - r && pt.y <= a.y + r;
    }

    return pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
  }

  distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }
}
