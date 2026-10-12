/**
 * Pagelens — Document Model
 * Encapsulates the immutable base capture image and the non-destructive annotation layer list.
 */

import { eventBus } from './event-bus.js';

export class DocumentModel {
  constructor() {
    this.title = 'Untitled Capture';
    this.url = '';
    this.timestamp = Date.now();
    this.baseImage = null; // HTMLImageElement or ImageBitmap
    this.width = 0;
    this.height = 0;
    this.annotations = [];
    this.crop = null; // { x, y, width, height } or null
  }

  setBaseImage(image, meta = {}) {
    this.baseImage = image;
    this.width = image.width || image.naturalWidth || 800;
    this.height = image.height || image.naturalHeight || 600;
    this.title = meta.title || this.title;
    this.url = meta.url || this.url;
    this.tabId = meta.tabId || this.tabId;
    this.captureType = meta.type || meta.captureType || this.captureType || 'full-page';
    this.sessionId = meta.sessionId || this.sessionId;
    this.timestamp = meta.timestamp || Date.now();
    this.crop = null;
    this.annotations = [];
    eventBus.emit('document-loaded', this);
  }

  addAnnotation(annotation) {
    if (!annotation.id) {
      annotation.id = `anno_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }
    this.annotations.push(annotation);
    eventBus.emit('annotation-added', annotation);
    eventBus.emit('document-changed');
    return annotation;
  }

  removeAnnotation(id) {
    const idx = this.annotations.findIndex(a => a.id === id);
    if (idx !== -1) {
      const removed = this.annotations.splice(idx, 1)[0];
      eventBus.emit('annotation-removed', removed);
      eventBus.emit('document-changed');
      return removed;
    }
    return null;
  }

  updateAnnotation(id, updates) {
    const obj = this.annotations.find(a => a.id === id);
    if (obj) {
      Object.assign(obj, updates);
      eventBus.emit('annotation-updated', obj);
      eventBus.emit('document-changed');
      return obj;
    }
    return null;
  }

  getAnnotation(id) {
    return this.annotations.find(a => a.id === id) || null;
  }

  setCrop(cropRect) {
    this.crop = cropRect ? { ...cropRect } : null;
    eventBus.emit('crop-changed', this.crop);
    eventBus.emit('document-changed');
  }

  toJSON() {
    return {
      title: this.title,
      url: this.url,
      timestamp: this.timestamp,
      width: this.width,
      height: this.height,
      annotations: this.annotations,
      crop: this.crop,
    };
  }

  fromJSON(json, image) {
    this.baseImage = image;
    this.title = json.title || 'Untitled Capture';
    this.url = json.url || '';
    this.timestamp = json.timestamp || Date.now();
    this.width = json.width || image.width;
    this.height = json.height || image.height;
    this.annotations = json.annotations || [];
    this.crop = json.crop || null;
    eventBus.emit('document-loaded', this);
  }
}

export const documentModel = new DocumentModel();
