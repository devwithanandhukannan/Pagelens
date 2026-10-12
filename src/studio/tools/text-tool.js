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
    // Position text horizontally centered on the page
    const centerX = Math.round(docModel.width / 2);
    const targetY = point ? point.y : Math.round(docModel.height / 2);

    // Trigger in-app HUD prompt toast on center of page
    eventBus.emit('prompt-text-annotation', {
      point: { x: centerX, y: targetY },
      color: toolOptions.color || '#F8FAFC',
      fontSize: toolOptions.fontSize || 18,
      align: 'center',
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
