/**
 * Pagelens — Blur / Redact Command
 */

import { documentModel } from '../document-model.js';

export class BlurCommand {
  constructor(effectRegion) {
    this.region = effectRegion;
  }

  execute() {
    documentModel.addAnnotation(this.region);
  }

  undo() {
    documentModel.removeAnnotation(this.region.id);
  }
}
