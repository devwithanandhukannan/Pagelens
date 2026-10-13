/**
 * Pagelens — Editor State Store
 * Single source of truth for Studio workspace state.
 */

import { eventBus } from './event-bus.js';

export class Store {
  constructor(initialState = {}) {
    this.state = {
      activeTool: 'select',
      toolOptions: {
        color: '#6D63E6', // Electric violet default
        strokeWidth: 3,
        fontSize: 16,
        fontFamily: 'Inter',
        shapeType: 'rect', // 'rect' | 'ellipse' | 'line' | 'arrow'
        blurType: 'pixelate', // 'pixelate' | 'blur'
        blurStrength: 10,
        stampCounter: 1,
        stampSize: 36,
        aspectPreset: 'free', // 'free' | '16:9' | '4:3' | '1:1'
      },
      selectedObjectId: null,
      cropBox: null,
      sidebarCollapsed: false,
      theme: 'obsidian',
      canUndo: false,
      canRedo: false,
      zoomLevel: 1.0,
      documentLoaded: false,
      ...initialState,
    };

    this.subscribers = new Set();
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    this.notify();
  }

  setToolOption(key, value) {
    this.state.toolOptions = {
      ...this.state.toolOptions,
      [key]: value,
    };
    this.notify();
    eventBus.emit('tool-option-changed', { key, value });
  }

  setActiveTool(toolName) {
    this.state.activeTool = toolName;
    if (toolName !== 'select') {
      this.state.selectedObjectId = null;
    }
    this.notify();
    eventBus.emit('tool-changed', toolName);
  }

  setSelectedObject(id) {
    this.state.selectedObjectId = id;
    this.notify();
    eventBus.emit('selection-changed', id);
  }

  setTheme(theme) {
    this.state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    this.notify();
    eventBus.emit('theme-changed', theme);
  }

  toggleSidebar() {
    this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    for (const callback of this.subscribers) {
      try {
        callback(this.state);
      } catch (e) {
        console.error('[Store] Subscriber error:', e);
      }
    }
  }
}

export const store = new Store();
