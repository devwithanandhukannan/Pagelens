/**
 * Pagelens — Add Shape Command
 */

import { documentModel } from '../document-model.js';

export class AddShapeCommand {
  constructor(annotation) {
    this.annotation = annotation;
  }

  execute() {
    documentModel.addAnnotation(this.annotation);
  }

  undo() {
    documentModel.removeAnnotation(this.annotation.id);
  }
}
