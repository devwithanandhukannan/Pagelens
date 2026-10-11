/**
 * Pagelens — Settings Store
 * Persists extension preferences in chrome.storage.local with defaults and migration.
 */

import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/constants.js';

export class SettingsStore {
  static async getSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      return { ...DEFAULT_SETTINGS, ...(res[STORAGE_KEYS.SETTINGS] || {}) };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  static async saveSettings(newSettings) {
    const current = await this.getSettings();
    const merged = { ...current, ...newSettings };

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: merged });
    }
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    } catch (e) {}

    return merged;
  }
}
