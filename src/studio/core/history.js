/**
 * Pagelens — Command History (Undo/Redo Engine)
 * Robust Command Pattern implementation with bounded depth (100) and delta tracking.
 */

import { EDITOR_CONSTANTS } from '../../shared/constants.js';
import { eventBus } from './event-bus.js';

export class History {
  constructor(maxDepth = EDITOR_CONSTANTS.MAX_UNDO_DEPTH) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxDepth = maxDepth;
  }

  execute(command) {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    // Any new action clears the redo stack
    this.redoStack = [];
    this.notifyState();
  }

  undo() {
    if (this.undoStack.length === 0) return null;
    const command = this.undoStack.pop();
    command.undo();
    this.redoStack.push(command);
    this.notifyState();
    return command;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const command = this.redoStack.pop();
    command.execute();
    this.undoStack.push(command);
    this.notifyState();
    return command;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyState();
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  notifyState() {
    eventBus.emit('history-changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    });
  }
}

export const history = new History();
