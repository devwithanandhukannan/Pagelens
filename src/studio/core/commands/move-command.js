/**
 * Pagelens — Text, Move, and Delete Commands
 */

import { documentModel } from '../document-model.js';

export class TextCommand {
  constructor(textAnnotation) {
    this.annotation = textAnnotation;
  }

  execute() {
    documentModel.addAnnotation(this.annotation);
  }

  undo() {
    documentModel.removeAnnotation(this.annotation.id);
  }
}

export class MoveCommand {
  constructor(annotationId, prevProps, newProps) {
    this.annotationId = annotationId;
    this.prevProps = prevProps;
    this.newProps = newProps;
  }

  execute() {
    documentModel.updateAnnotation(this.annotationId, this.newProps);
  }

  undo() {
    documentModel.updateAnnotation(this.annotationId, this.prevProps);
  }
}

export class DeleteCommand {
  constructor(annotation) {
    this.annotation = annotation;
  }

  execute() {
    documentModel.removeAnnotation(this.annotation.id);
  }

  undo() {
    documentModel.addAnnotation(this.annotation);
  }
}
