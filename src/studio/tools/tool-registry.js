/**
 * Pagelens — Tool Registry
 * Manages tool registration and switching.
 */

import { SelectTool } from './select-tool.js';
import { CropTool } from './crop-tool.js';
import { ShapeTool } from './shape-tool.js';
import { PenTool, HighlighterTool } from './pen-tool.js';
import { TextTool, StampTool } from './text-tool.js';
import { BlurTool, RedactTool } from './blur-tool.js';
import { EraserTool } from './eraser-tool.js';

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.activeTool = null;

    this.register(new SelectTool());
    this.register(new CropTool());
    this.register(new ShapeTool());
    this.register(new PenTool());
    this.register(new HighlighterTool());
    this.register(new TextTool());
    this.register(new EraserTool());
    this.register(new BlurTool());
    this.register(new RedactTool());
    this.register(new StampTool());
  }

  register(tool) {
    this.tools.set(tool.name, tool);
  }

  getTool(name) {
    return this.tools.get(name) || null;
  }

  setActiveTool(name) {
    if (this.activeTool) {
      this.activeTool.deactivate();
    }
    const nextTool = this.getTool(name);
    if (nextTool) {
      this.activeTool = nextTool;
      this.activeTool.activate();
    }
    return this.activeTool;
  }
}

export const toolRegistry = new ToolRegistry();
