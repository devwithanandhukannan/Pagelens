/**
 * Pagelens — Autosave Service
 * Automatically persists document state so working drafts survive tab reloads.
 */

import { eventBus } from '../core/event-bus.js';
import { STORAGE_KEYS, EDITOR_CONSTANTS } from '../../shared/constants.js';

export class AutosaveService {
  constructor(documentModel) {
    this.documentModel = documentModel;
    this.timer = null;
    this.init();
  }

  init() {
    eventBus.on('document-changed', () => this.scheduleSave());
  }

  scheduleSave() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), EDITOR_CONSTANTS.AUTOSAVE_DEBOUNCE_MS);
  }

  save() {
    try {
      const data = this.documentModel.toJSON();
      localStorage.setItem(STORAGE_KEYS.RESTORE_BACKUP, JSON.stringify(data));
      eventBus.emit('autosave-complete');
    } catch (e) {
      console.warn('[Autosave] Failed to persist draft to localStorage:', e);
    }
  }

  static getBackup() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RESTORE_BACKUP);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
}
