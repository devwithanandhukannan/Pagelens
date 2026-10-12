/**
 * Pagelens — Text Tool & Stamp Tool
 */

import { ToolInterface } from './tool-interface.js';
import { history } from '../core/history.js';
import { AddShapeCommand } from '../core/commands/add-shape-command.js';
import { eventBus } from '../core/event-bus.js';

export class TextTool extends ToolInterface {
  constructor() {
    super('text', 'text');
  }

  onPointerDown(e, point, store, docModel) {
    const { toolOptions } = store.getState();

    // Trigger in-app HUD prompt toast instead of browser native blocking prompt()
    eventBus.emit('prompt-text-annotation', {
      point,
      color: toolOptions.color || '#F8FAFC',
      fontSize: toolOptions.fontSize || 16,
    });
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
