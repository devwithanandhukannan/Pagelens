/**
 * Pagelens — Tool Interface
 * Common contract that every drawing, editing, and privacy tool implements.
 */

export class ToolInterface {
  constructor(name, cursor = 'crosshair') {
    this.name = name;
    this.cursor = cursor;
    this.isActive = false;
  }

  activate() {
    this.isActive = true;
  }

  deactivate() {
    this.isActive = false;
  }

  onPointerDown(e, point, store, docModel) {}
  onPointerMove(e, point, store, docModel) {}
  onPointerUp(e, point, store, docModel) {}
  onKeyDown(e, store, docModel) {}
}
