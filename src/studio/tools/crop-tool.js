/**
 * Pagelens — Crop Tool
 * Non-destructive viewport crop frame with aspect presets.
 */

import { ToolInterface } from './tool-interface.js';
import { history } from '../core/history.js';
import { CropCommand } from '../core/commands/crop-command.js';

export class CropTool extends ToolInterface {
  constructor() {
    super('crop', 'crosshair');
    this.startPoint = null;
    this.tempCrop = null;
  }

  onPointerDown(e, point, store, docModel) {
    this.startPoint = { ...point };
    this.tempCrop = {
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    };
    docModel.setCrop(this.tempCrop);
  }

  onPointerMove(e, point, store, docModel) {
    if (!this.startPoint || !this.tempCrop) return;

    let width = point.x - this.startPoint.x;
    let height = point.y - this.startPoint.y;

    const { toolOptions } = store.getState();
    const preset = toolOptions.aspectPreset || 'free';

    if (preset === '16:9') {
      height = (Math.abs(width) * 9) / 16 * (height >= 0 ? 1 : -1);
    } else if (preset === '4:3') {
      height = (Math.abs(width) * 3) / 4 * (height >= 0 ? 1 : -1);
    } else if (preset === '1:1') {
      height = Math.abs(width) * (height >= 0 ? 1 : -1);
    }

    const rx = width < 0 ? point.x : this.startPoint.x;
    const ry = height < 0 ? point.y : this.startPoint.y;
    const rw = Math.abs(width);
    const rh = Math.abs(height);

    this.tempCrop = { x: rx, y: ry, width: rw, height: rh };
    docModel.setCrop(this.tempCrop);
  }

  onPointerUp(e, point, store, docModel) {
    if (!this.startPoint || !this.tempCrop) return;

    if (this.tempCrop.width < 20 || this.tempCrop.height < 20) {
      docModel.setCrop(null); // Reset tiny accidental drags
    } else {
      const prevCrop = null;
      history.execute(new CropCommand(this.tempCrop, prevCrop));
    }

    this.startPoint = null;
    this.tempCrop = null;
    store.setActiveTool('select');
  }
}
