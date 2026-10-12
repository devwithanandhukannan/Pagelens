/**
 * Pagelens — Emoji Sticker Tool
 * Stamps rich reaction emojis and status indicators onto screenshots.
 */

import { ToolInterface } from './tool-interface.js';
import { history } from '../core/history.js';
import { AddShapeCommand } from '../core/commands/add-shape-command.js';
import { eventBus } from '../core/event-bus.js';

export class EmojiTool extends ToolInterface {
  constructor() {
    super('emoji', 'crosshair');
  }

  onPointerDown(e, point, store, docModel) {
    const { toolOptions } = store.getState();
    const emojiChar = toolOptions.emoji || '🔥';
    const size = toolOptions.emojiSize || 36;

    const annotation = {
      id: `emoji_${Date.now()}`,
      type: 'emoji',
      emoji: emojiChar,
      size,
      x: point.x,
      y: point.y,
      width: size,
      height: size,
    };

    history.execute(new AddShapeCommand(annotation));
    store.setActiveTool('select');
    store.setSelectedObject(annotation.id);
    eventBus.emit('show-toast', { message: `Added ${emojiChar} emoji sticker`, options: { icon: 'check', duration: 1500 } });
  }
}
