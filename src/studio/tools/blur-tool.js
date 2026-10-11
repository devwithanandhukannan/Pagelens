/**
 * Pagelens — Blur Tool & Redact Tool
 * Privacy tools for sensitive information masking and irreversible redaction.
 */

import { ToolInterface } from './tool-interface.js';
import { history } from '../core/history.js';
import { BlurCommand } from '../core/commands/blur-command.js';
import { eventBus } from '../core/event-bus.js';

export class BlurTool extends ToolInterface {
  constructor() {
    super('blur', 'crosshair');
    this.startPoint = null;
    this.currentAnnotation = null;
  }

  onPointerDown(e, point, store, docModel) {
    this.startPoint = { ...point };
    const { toolOptions } = store.getState();

    this.currentAnnotation = {
      id: `blur_${Date.now()}`,
      type: toolOptions.blurType || 'pixelate',
      strength: toolOptions.blurStrength || 12,
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
      x: width < 0 ? point.x : this.startPoint.x,
      y: height < 0 ? point.y : this.startPoint.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  }

  onPointerUp(e, point, store, docModel) {
    if (!this.startPoint || !this.currentAnnotation) return;

    if (this.currentAnnotation.width < 8 || this.currentAnnotation.height < 8) {
      docModel.removeAnnotation(this.currentAnnotation.id);
    } else {
      docModel.removeAnnotation(this.currentAnnotation.id);
      history.execute(new BlurCommand(this.currentAnnotation));
    }

    this.startPoint = null;
    this.currentAnnotation = null;
  }
}

export class RedactTool extends ToolInterface {
  constructor() {
    super('redact', 'crosshair');
    this.startPoint = null;
    this.currentAnnotation = null;
  }

  onPointerDown(e, point, store, docModel) {
    this.startPoint = { ...point };

    this.currentAnnotation = {
      id: `redact_${Date.now()}`,
      type: 'redact',
      color: '#000000',
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
      x: width < 0 ? point.x : this.startPoint.x,
      y: height < 0 ? point.y : this.startPoint.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  }

  onPointerUp(e, point, store, docModel) {
    if (!this.startPoint || !this.currentAnnotation) return;

    if (this.currentAnnotation.width < 8 || this.currentAnnotation.height < 8) {
      docModel.removeAnnotation(this.currentAnnotation.id);
    } else {
      docModel.removeAnnotation(this.currentAnnotation.id);
      history.execute(new BlurCommand(this.currentAnnotation));
      eventBus.emit('redaction-applied');
    }

    this.startPoint = null;
    this.currentAnnotation = null;
  }
}
