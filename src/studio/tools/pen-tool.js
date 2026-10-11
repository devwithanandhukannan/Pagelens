/**
 * Pagelens — Pen Tool & Highlighter Tool
 * Freehand drawing with spline smoothing and translucent marker highlighting.
 */

import { ToolInterface } from './tool-interface.js';
import { history } from '../core/history.js';
import { AddShapeCommand } from '../core/commands/add-shape-command.js';

export class PenTool extends ToolInterface {
  constructor() {
    super('pen', 'crosshair');
    this.currentAnnotation = null;
  }

  onPointerDown(e, point, store, docModel) {
    const { toolOptions } = store.getState();
    this.currentAnnotation = {
      id: `pen_${Date.now()}`,
      type: 'pen',
      color: toolOptions.color || '#6D63E6',
      strokeWidth: toolOptions.strokeWidth || 3,
      points: [{ x: point.x, y: point.y }],
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    };
    docModel.addAnnotation(this.currentAnnotation);
  }

  onPointerMove(e, point, store, docModel) {
    if (!this.currentAnnotation) return;
    this.currentAnnotation.points.push({ x: point.x, y: point.y });
    docModel.updateAnnotation(this.currentAnnotation.id, {
      points: [...this.currentAnnotation.points],
    });
  }

  onPointerUp(e, point, store, docModel) {
    if (!this.currentAnnotation) return;

    if (this.currentAnnotation.points.length < 2) {
      docModel.removeAnnotation(this.currentAnnotation.id);
    } else {
      docModel.removeAnnotation(this.currentAnnotation.id);
      history.execute(new AddShapeCommand(this.currentAnnotation));
    }
    this.currentAnnotation = null;
  }
}

export class HighlighterTool extends ToolInterface {
  constructor() {
    super('highlighter', 'crosshair');
    this.currentAnnotation = null;
  }

  onPointerDown(e, point, store, docModel) {
    const { toolOptions } = store.getState();
    this.currentAnnotation = {
      id: `hl_${Date.now()}`,
      type: 'highlighter',
      color: toolOptions.color || '#FACC15',
      strokeWidth: 20,
      points: [{ x: point.x, y: point.y }],
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    };
    docModel.addAnnotation(this.currentAnnotation);
  }

  onPointerMove(e, point, store, docModel) {
    if (!this.currentAnnotation) return;
    this.currentAnnotation.points.push({ x: point.x, y: point.y });
    docModel.updateAnnotation(this.currentAnnotation.id, {
      points: [...this.currentAnnotation.points],
    });
  }

  onPointerUp(e, point, store, docModel) {
    if (!this.currentAnnotation) return;
    if (this.currentAnnotation.points.length < 2) {
      docModel.removeAnnotation(this.currentAnnotation.id);
    } else {
      docModel.removeAnnotation(this.currentAnnotation.id);
      history.execute(new AddShapeCommand(this.currentAnnotation));
    }
    this.currentAnnotation = null;
  }
}
