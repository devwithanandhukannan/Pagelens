/**
 * Pagelens — Select Tool
 * Selects, repositions, and deletes annotation objects with burst action history merging.
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
    this.dragStart = null;
    this.initialProps = null;
  }

  onPointerDown(e, point, store, docModel) {
    const { annotations } = docModel;
    let hit = null;

    // Search top-to-bottom (reverse of draw order)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      let bounds;
      if (a.type === 'emoji') {
        const s = a.size || 36;
        bounds = { x: a.x - s / 2 - 6, y: a.y - s / 2 - 6, width: s + 12, height: s + 12 };
      } else if (a.type === 'text' && a.align === 'center') {
        const w = a.width || 60;
        bounds = { x: a.x - w / 2 - 6, y: a.y - 6, width: w + 12, height: (a.height || 30) + 12 };
      } else {
        bounds = {
          x: a.x - 4,
          y: a.y - 4,
          width: (a.width || 30) + 8,
          height: (a.height || 30) + 8,
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
      this.dragStart = { ...point };
      this.initialProps = { x: hit.x, y: hit.y };
    } else {
      this.selectedObject = null;
      store.setSelectedObject(null);
      this.isDragging = false;
    }
  }

  onPointerMove(e, point, store, docModel) {
    if (!this.isDragging || !this.selectedObject || !this.dragStart) return;

    const dx = point.x - this.dragStart.x;
    const dy = point.y - this.dragStart.y;

    const newX = this.initialProps.x + dx;
    const newY = this.initialProps.y + dy;

    docModel.updateAnnotation(this.selectedObject.id, { x: newX, y: newY });
  }

  onPointerUp(e, point, store, docModel) {
    if (this.isDragging && this.selectedObject && this.initialProps) {
      const currentProps = { x: this.selectedObject.x, y: this.selectedObject.y };
      const moved = Math.abs(currentProps.x - this.initialProps.x) > 2 ||
                    Math.abs(currentProps.y - this.initialProps.y) > 2;

      if (moved) {
        history.execute(new MoveCommand(this.selectedObject.id, this.initialProps, currentProps));
      }
    }
    this.isDragging = false;
    this.dragStart = null;
  }

  onKeyDown(e, store, docModel) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedObject) {
      history.execute(new DeleteCommand(this.selectedObject));
      this.selectedObject = null;
      store.setSelectedObject(null);
    }
  }
}
