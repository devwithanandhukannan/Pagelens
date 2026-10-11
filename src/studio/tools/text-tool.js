/**
 * Pagelens — Text Tool & Stamp Tool
 */

import { ToolInterface } from './tool-interface.js';
import { history } from '../core/history.js';
import { AddShapeCommand } from '../core/commands/add-shape-command.js';

export class TextTool extends ToolInterface {
  constructor() {
    super('text', 'text');
  }

  onPointerDown(e, point, store, docModel) {
    const { toolOptions } = store.getState();
    const enteredText = prompt('Enter annotation text:', 'Note');
    if (!enteredText || !enteredText.trim()) return;

    const annotation = {
      id: `text_${Date.now()}`,
      type: 'text',
      x: point.x,
      y: point.y,
      text: enteredText.trim(),
      color: toolOptions.color || '#F8FAFC',
      fontSize: toolOptions.fontSize || 16,
      width: 120,
      height: 28,
    };

    history.execute(new AddShapeCommand(annotation));
    store.setActiveTool('select');
    store.setSelectedObject(annotation.id);
  }
}

export class StampTool extends ToolInterface {
  constructor() {
    super('stamp', 'crosshair');
  }

  onPointerDown(e, point, store, docModel) {
    const { toolOptions } = store.getState();
    const currentNumber = toolOptions.stampCounter || 1;

    const annotation = {
      id: `stamp_${Date.now()}`,
      type: 'stamp',
      x: point.x,
      y: point.y,
      number: currentNumber,
      color: toolOptions.color || '#6D63E6',
      width: 28,
      height: 28,
    };

    history.execute(new AddShapeCommand(annotation));

    // Auto-increment bug report step stamp
    store.setToolOption('stampCounter', currentNumber + 1);
  }
}
