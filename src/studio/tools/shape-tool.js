/**
 * Pagelens — Shape Tool
 * Interactively draws rectangles, ellipses, lines, and directional arrows.
 */

import { ToolInterface } from './tool-interface.js';
import { history } from '../core/history.js';
import { AddShapeCommand } from '../core/commands/add-shape-command.js';

export class ShapeTool extends ToolInterface {
  constructor() {
    super('shape', 'crosshair');
    this.startPoint = null;
    this.currentAnnotation = null;
  }

  onPointerDown(e, point, store, docModel) {
    this.startPoint = { ...point };
    const { toolOptions } = store.getState();

    this.currentAnnotation = {
      id: `shape_${Date.now()}`,
      type: 'shape',
      shapeType: toolOptions.shapeType || 'rect',
      color: toolOptions.color || '#6D63E6',
      strokeWidth: toolOptions.strokeWidth || 3,
      fill: toolOptions.fill || false,
      fillColor: toolOptions.fillColor || 'rgba(109, 99, 230, 0.15)',
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    };

    docModel.addAnnotation(this.currentAnnotation);
  }

  onPointerMove(e, point, store, docModel) {
    if (!this.startPoint || !this.currentAnnotation) return;

    const width = point.x - this.startPoint.x;
    const height = point.y - this.startPoint.y;

    docModel.updateAnnotation(this.currentAnnotation.id, {
      width,
      height,
    });
  }

  onPointerUp(e, point, store, docModel) {
    if (!this.startPoint || !this.currentAnnotation) return;

    const minSize = 4;
    const finalW = Math.abs(this.currentAnnotation.width);
    const finalH = Math.abs(this.currentAnnotation.height);

    if (finalW < minSize && finalH < minSize) {
      // Discard accidental clicks
      docModel.removeAnnotation(this.currentAnnotation.id);
    } else {
      // Remove temporary object and commit via History Command
      docModel.removeAnnotation(this.currentAnnotation.id);
      history.execute(new AddShapeCommand(this.currentAnnotation));
    }

    this.startPoint = null;
    this.currentAnnotation = null;
  }
}
