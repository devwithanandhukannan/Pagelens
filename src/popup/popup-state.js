/**
 * Pagelens — Popup State Manager
 */

export class PopupState {
  constructor() {
    this.status = 'idle'; // 'idle' | 'capturing' | 'stitching' | 'done' | 'error'
    this.message = '';
    this.progress = 0;
    this.subscribers = new Set();
  }

  setState(partial) {
    Object.assign(this, partial);
    this.subscribers.forEach((cb) => cb(this));
  }

  subscribe(cb) {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }
}

export const popupState = new PopupState();
