/**
 * Pagelens — Viewport Controller
 * Coordinates smooth zoom, panning, fit-to-screen, and coordinate transformations.
 */

import { EDITOR_CONSTANTS } from '../../shared/constants.js';
import { eventBus } from './event-bus.js';

export class Viewport {
  constructor() {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.containerWidth = 0;
    this.containerHeight = 0;
  }

  setContainerDimensions(width, height) {
    this.containerWidth = width;
    this.containerHeight = height;
  }

  setZoom(newZoom, originX = null, originY = null) {
    const clampedZoom = Math.max(
      EDITOR_CONSTANTS.MIN_ZOOM,
      Math.min(EDITOR_CONSTANTS.MAX_ZOOM, newZoom)
    );

    if (originX !== null && originY !== null) {
      // Zoom centered on cursor origin
      const ratio = clampedZoom / this.zoom;
      this.panX = originX - (originX - this.panX) * ratio;
      this.panY = originY - (originY - this.panY) * ratio;
    }

    this.zoom = clampedZoom;
    eventBus.emit('viewport-changed', this);
  }

  zoomIn() {
    this.setZoom(this.zoom + EDITOR_CONSTANTS.ZOOM_STEP);
  }

  zoomOut() {
    this.setZoom(this.zoom - EDITOR_CONSTANTS.ZOOM_STEP);
  }

  resetZoom() {
    this.setZoom(1.0);
  }

  panBy(dx, dy) {
    this.panX += dx;
    this.panY += dy;
    eventBus.emit('viewport-changed', this);
  }

  fitToScreen(docWidth, docHeight) {
    if (!docWidth || !docHeight || !this.containerWidth || !this.containerHeight) return;

    const padding = 36;
    const availW = Math.max(100, this.containerWidth - padding * 2);
    const availH = Math.max(100, this.containerHeight - padding * 2);

    const scaleW = availW / docWidth;
    const scaleH = availH / docHeight;

    // For tall full-page documents, fit to width and show top of page
    if (docHeight > docWidth * 1.3) {
      this.zoom = Math.max(0.15, Math.min(1.0, Math.round(scaleW * 100) / 100));
      this.panX = Math.round((this.containerWidth - docWidth * this.zoom) / 2);
      this.panY = padding;
    } else {
      const bestScale = Math.min(1.0, Math.min(scaleW, scaleH));
      this.zoom = Math.max(0.1, Math.round(bestScale * 100) / 100);
      this.panX = Math.round((this.containerWidth - docWidth * this.zoom) / 2);
      this.panY = Math.max(padding, Math.round((this.containerHeight - docHeight * this.zoom) / 2));
    }

    eventBus.emit('viewport-changed', this);
  }

  screenToCanvas(clientX, clientY, containerRect) {
    const localX = clientX - containerRect.left;
    const localY = clientY - containerRect.top;
    return {
      x: (localX - this.panX) / this.zoom,
      y: (localY - this.panY) / this.zoom,
    };
  }

  canvasToScreen(canvasX, canvasY, containerRect) {
    return {
      x: canvasX * this.zoom + this.panX + (containerRect?.left || 0),
      y: canvasY * this.zoom + this.panY + (containerRect?.top || 0),
    };
  }
}

export const viewport = new Viewport();
