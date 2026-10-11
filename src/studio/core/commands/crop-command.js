/**
 * Pagelens — Crop Command
 * Non-destructive viewport mask application
 */

import { documentModel } from '../document-model.js';

export class CropCommand {
  constructor(newCrop, prevCrop = null) {
    this.newCrop = newCrop;
    this.prevCrop = prevCrop;
  }

  execute() {
    documentModel.setCrop(this.newCrop);
  }

  undo() {
    documentModel.setCrop(this.prevCrop);
  }
}
