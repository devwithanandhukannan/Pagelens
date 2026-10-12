/**
 * Pagelens — Select Tool
 * Selects, repositions, and drags to resize annotations (including emoji, shapes, text).
 * Supports 4 corner resize handles with visual cursor feedback and undo/redo history.
 */

import { ToolInterface } from './tool-interface.js';
import { pointInRect } from '../../shared/geometry-utils.js';
import { history } from '../core/history.js';
import { MoveCommand, DeleteCommand } from '../core/commands/move-command.js';

export class SelectTool extends ToolInterface {
  constructor() {
    super('select', 'default');
    this.selectedObject = null;
    this.isDragging = false;
    this.isResizing = false;
    this.activeHandle = null;
    this.dragStart = null;
    this.resizeStart = null;
    this.initialProps = null;
  }

  getHandles(a) {
    if (!a) return {};
    let x = a.x;
    let y = a.y;
    let w = a.width || 30;
    let h = a.height || 30;

    if (a.type === 'emoji') {
      const s = a.size || 36;
      x = a.x - s / 2;
      y = a.y - s / 2;
      w = s;
      h = s;
    } else if (a.type === 'text' && a.align === 'center') {
      x = a.x - w / 2;
    }

    return {
      nw: { x: x - 4, y: y - 4 },
      ne: { x: x + w + 4, y: y - 4 },
      se: { x: x + w + 4, y: y + h + 4 },
      sw: { x: x - 4, y: y + h + 4 },
    };
  }

  hitTestHandle(point, a, radius = 10) {
    if (!a) return null;
    const handles = this.getHandles(a);
    for (const [key, pos] of Object.entries(handles)) {
      if (Math.hypot(point.x - pos.x, point.y - pos.y) <= radius) {
        return key;
      }
    }
    return null;
  }

  onPointerDown(e, point, store, docModel) {
    // 1. Check if clicking an active selection handle to resize
    if (this.selectedObject) {
      const handle = this.hitTestHandle(point, this.selectedObject);
      if (handle) {
        this.isResizing = true;
        this.isDragging = false;
        this.activeHandle = handle;
        this.resizeStart = { ...point };
        this.initialProps = { ...this.selectedObject };
        return;
      }
    }

    // 2. Search top-to-bottom for annotation click
    const { annotations } = docModel;
    let hit = null;

    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      let bounds;
      if (a.type === 'emoji') {
        const s = a.size || 36;
        bounds = { x: a.x - s / 2 - 8, y: a.y - s / 2 - 8, width: s + 16, height: s + 16 };
      } else if (a.type === 'text' && a.align === 'center') {
        const w = a.width || 60;
        bounds = { x: a.x - w / 2 - 6, y: a.y - 6, width: w + 12, height: (a.height || 30) + 12 };
      } else {
        bounds = {
          x: a.x - 6,
          y: a.y - 6,
          width: (a.width || 30) + 12,
          height: (a.height || 30) + 12,
        };
      }
      if (pointInRect(point.x, point.y, bounds)) {
        hit = a;
        break;
      }
    }

    if (hit) {
      this.selectedObject = hit;
      store.setSelectedObject(hit.id);
      this.isDragging = true;
      this.isResizing = false;
      this.dragStart = { ...point };
      this.initialProps = { ...hit };
    } else {
      this.selectedObject = null;
      store.setSelectedObject(null);
      this.isDragging = false;
      this.isResizing = false;
      this.activeHandle = null;
    }
  }

  onPointerMove(e, point, store, docModel) {
    // Handle Resizing
    if (this.isResizing && this.selectedObject && this.resizeStart && this.initialProps) {
      if (this.selectedObject.type === 'emoji') {
        // Dragging handle scales emoji proportionally around its center
        const centerX = this.initialProps.x;
        const centerY = this.initialProps.y;
        const initialDist = Math.hypot(this.resizeStart.x - centerX, this.resizeStart.y - centerY);
        const currentDist = Math.hypot(point.x - centerX, point.y - centerY);
        const ratio = initialDist > 0 ? (currentDist / initialDist) : 1;
        const newSize = Math.max(16, Math.min(260, Math.round((this.initialProps.size || 36) * ratio)));

        docModel.updateAnnotation(this.selectedObject.id, {
          size: newSize,
          width: newSize,
          height: newSize,
        });

        // Keep slider synchronized in inspector
        store.setToolOption('emojiSize', newSize);
      } else {
        // Regular rectangular shapes resize
        let { x, y, width, height } = this.initialProps;
        const dx = point.x - this.resizeStart.x;
        const dy = point.y - this.resizeStart.y;

        if (this.activeHandle === 'se') {
          width = Math.max(10, width + dx);
          height = Math.max(10, height + dy);
        } else if (this.activeHandle === 'sw') {
          width = Math.max(10, width - dx);
          height = Math.max(10, height + dy);
          x = this.initialProps.x + dx;
        } else if (this.activeHandle === 'ne') {
          width = Math.max(10, width + dx);
          height = Math.max(10, height - dy);
          y = this.initialProps.y + dy;
        } else if (this.activeHandle === 'nw') {
          width = Math.max(10, width - dx);
          height = Math.max(10, height - dy);
          x = this.initialProps.x + dx;
          y = this.initialProps.y + dy;
        }

        docModel.updateAnnotation(this.selectedObject.id, { x, y, width, height });
      }
      return;
    }

    // Handle Moving
    if (this.isDragging && this.selectedObject && this.dragStart && this.initialProps) {
      const dx = point.x - this.dragStart.x;
      const dy = point.y - this.dragStart.y;
      const newX = this.initialProps.x + dx;
      const newY = this.initialProps.y + dy;
      docModel.updateAnnotation(this.selectedObject.id, { x: newX, y: newY });
      return;
    }

    // Update dynamic hover cursor based on resize handles
    const container = document.getElementById('studio-canvas-container');
    if (!container) return;

    if (this.selectedObject) {
      const hoverHandle = this.hitTestHandle(point, this.selectedObject);
      if (hoverHandle === 'nw' || hoverHandle === 'se') {
        container.style.cursor = 'nwse-resize';
      } else if (hoverHandle === 'ne' || hoverHandle === 'sw') {
        container.style.cursor = 'nesw-resize';
      } else {
        container.style.cursor = 'default';
      }
    } else {
      container.style.cursor = 'default';
    }
  }

  onPointerUp(e, point, store, docModel) {
    if (this.isResizing && this.selectedObject && this.initialProps) {
      const currentProps = { ...this.selectedObject };
      const changed = currentProps.size !== this.initialProps.size ||
                      currentProps.width !== this.initialProps.width ||
                      currentProps.height !== this.initialProps.height;
      if (changed) {
        history.execute(new MoveCommand(this.selectedObject.id, this.initialProps, currentProps));
      }
    } else if (this.isDragging && this.selectedObject && this.initialProps) {
      const currentProps = { ...this.selectedObject };
      const moved = Math.abs(currentProps.x - this.initialProps.x) > 2 ||
                    Math.abs(currentProps.y - this.initialProps.y) > 2;
      if (moved) {
        history.execute(new MoveCommand(this.selectedObject.id, this.initialProps, currentProps));
      }
    }

    this.isDragging = false;
    this.isResizing = false;
    this.activeHandle = null;
    this.dragStart = null;
    this.resizeStart = null;
  }

  onKeyDown(e, store, docModel) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedObject) {
      history.execute(new DeleteCommand(this.selectedObject));
      this.selectedObject = null;
      store.setSelectedObject(null);
    }
  }
}
