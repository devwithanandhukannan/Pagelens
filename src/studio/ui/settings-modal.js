/**
 * Pagelens — Studio Settings Modal Component
 * Apple Sonoma-grade floating preferences modal sheet with capture controls,
 * export defaults, appearance switcher, and shortcuts cheatsheet.
 */

import { eventBus } from '../core/event-bus.js';

export class SettingsModal {
  constructor(container, store) {
    this.container = container;
    this.store = store;
    this.isOpen = false;
    this.settings = {
      theme: 'obsidian',
      autoOpen: true,
      captureDelay: 560,
      saveHistory: true,
      defaultSaveLocation: 'Desktop',
      customFolder: '',
      defaultFormat: 'png',
      jpegQuality: 92,
      stripMeta: true,
    };
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.render();
    this.bindEvents();
  }

  async loadSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const stored = await chrome.storage.sync.get(['pagelens_settings', 'theme']);
        if (stored.pagelens_settings) {
          this.settings = { ...this.settings, ...stored.pagelens_settings };
        }
        if (stored.theme) {
          this.settings.theme = stored.theme;
        }
      } else {
        const local = localStorage.getItem('pagelens_settings');
        if (local) {
          this.settings = { ...this.settings, ...JSON.parse(local) };
        }
      }
    } catch (e) {
      console.warn('[SettingsModal] Failed to load settings:', e);
    }
  }

  async saveSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        await chrome.storage.sync.set({
          pagelens_settings: this.settings,
          theme: this.settings.theme,
        });
      } else {
        localStorage.setItem('pagelens_settings', JSON.stringify(this.settings));
      }
      eventBus.emit('settings-changed', this.settings);
    } catch (e) {
      console.warn('[SettingsModal] Failed to save settings:', e);
    }
  }

  render() {
    const isCustom = this.settings.defaultSaveLocation === 'custom';
    this.container.innerHTML = `
      <div class="settings-modal-backdrop" id="settings-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
        <div class="settings-modal-card">
          <!-- Modal Header -->
          <div class="settings-modal-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="settings-header-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              <div>
                <h2 class="settings-modal-title" id="settings-modal-title">Studio Settings</h2>
                <span class="settings-modal-subtitle">Capture, history, export & shortcut preferences</span>
              </div>
            </div>
            <button class="icon-btn spring-btn" id="settings-modal-close" aria-label="Close Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <!-- Modal Body Content -->
          <div class="settings-modal-body">
            <!-- Section 1: Appearance & Editor -->
            <div class="settings-group">
              <span class="settings-group-heading">Appearance & Editor</span>

              <div class="settings-item-row">
                <div class="settings-item-label">
                  <strong>Color Theme</strong>
                  <span>Switch between Obsidian dark and Porcelain light theme</span>
                </div>
                <div class="settings-segmented-control" id="settings-theme-control">
                  <button type="button" class="segment-btn ${this.settings.theme === 'obsidian' ? 'active' : ''}" data-val="obsidian">Dark</button>
                  <button type="button" class="segment-btn ${this.settings.theme === 'porcelain' ? 'active' : ''}" data-val="porcelain">Light</button>
                </div>
              </div>

              <div class="settings-item-row">
                <div class="settings-item-label">
                  <strong>Auto-Open Studio</strong>
                  <span>Automatically open editor upon capturing a webpage</span>
                </div>
                <label class="apple-toggle">
                  <input type="checkbox" id="settings-auto-open" ${this.settings.autoOpen ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <!-- Section 2: Screenshot History (10 captures retention) -->
            <div class="settings-group">
              <span class="settings-group-heading">Screenshot History (Last 10 Captures)</span>

              <div class="settings-item-row">
                <div class="settings-item-label">
                  <strong>Save Previous Screenshots</strong>
                  <span>Automatically retain up to 10 previous captures for instant switching</span>
                </div>
                <label class="apple-toggle">
                  <input type="checkbox" id="settings-save-history" ${this.settings.saveHistory ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <div class="settings-item-row" style="background: transparent; border: none; padding: 4px 0;">
                <div class="settings-item-label">
                  <span style="font-size: 11.5px; color: var(--text-muted);">Manage or clear stored screenshots from local database</span>
                </div>
                <button type="button" class="spring-btn icon-btn" id="btn-clear-history-now" style="width: auto; height: 30px; padding: 0 12px; font-size: 11.5px; gap: 6px; color: var(--accent-crimson); border-color: rgba(239, 68, 68, 0.3);">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                  Clear History
                </button>
              </div>
            </div>

            <!-- Section 3: Capture Engine & Reliability -->
            <div class="settings-group">
              <span class="settings-group-heading">Capture Engine & Reliability</span>

              <div class="settings-item-row">
                <div class="settings-item-label">
                  <strong>Capture Settle Delay</strong>
                  <span>Wait time per slice to let sticky bars & animations settle reliably</span>
                </div>
                <select id="settings-capture-delay" class="settings-select">
                  <option value="350" ${this.settings.captureDelay === 350 ? 'selected' : ''}>Fast (350ms)</option>
                  <option value="560" ${this.settings.captureDelay === 560 ? 'selected' : ''}>Recommended (560ms)</option>
                  <option value="800" ${this.settings.captureDelay === 800 ? 'selected' : ''}>Slow Processor / Heavy Web (800ms)</option>
                  <option value="1200" ${this.settings.captureDelay === 1200 ? 'selected' : ''}>Maximum Stability (1.2s)</option>
                </select>
              </div>
            </div>

            <!-- Section 4: Save Location & Export Defaults -->
            <div class="settings-group">
              <span class="settings-group-heading">Save Location & Export Defaults</span>

              <div class="settings-item-row">
                <div class="settings-item-label">
                  <strong>Default Save Location</strong>
                  <span>Directory where screenshots are downloaded (Desktop default or custom)</span>
                </div>
                <select id="settings-save-location" class="settings-select">
                  <option value="Desktop" ${this.settings.defaultSaveLocation === 'Desktop' ? 'selected' : ''}>Desktop (Default)</option>
                  <option value="Downloads" ${this.settings.defaultSaveLocation === 'Downloads' ? 'selected' : ''}>Downloads Root</option>
                  <option value="Pagelens" ${this.settings.defaultSaveLocation === 'Pagelens' ? 'selected' : ''}>Downloads/Pagelens</option>
                  <option value="custom" ${isCustom ? 'selected' : ''}>Custom Folder...</option>
                </select>
              </div>

              <!-- Custom folder row -->
              <div id="settings-custom-folder-row" class="settings-item-row" style="display: ${isCustom ? 'flex' : 'none'};">
                <div class="settings-item-label">
                  <strong>Custom Folder Name</strong>
                  <span>Folder relative to user Downloads</span>
                </div>
                <input type="text" id="settings-custom-folder-input" class="settings-select" style="min-width: 160px;" value="${this.settings.customFolder || ''}" placeholder="e.g. MyScreenshots" />
              </div>

              <div class="settings-item-row">
                <div class="settings-item-label">
                  <strong>Default Download Format</strong>
                  <span>Preferred file format for one-click red download button</span>
                </div>
                <select id="settings-default-format" class="settings-select">
                  <option value="png" ${this.settings.defaultFormat === 'png' ? 'selected' : ''}>PNG (Lossless)</option>
                  <option value="jpeg" ${this.settings.defaultFormat === 'jpeg' ? 'selected' : ''}>JPEG (Compressed)</option>
                  <option value="pdf" ${this.settings.defaultFormat === 'pdf' ? 'selected' : ''}>PDF (Paginated Document)</option>
                </select>
              </div>

              <div class="settings-item-row">
                <div class="settings-item-label">
                  <strong>Strip Metadata Automatically</strong>
                  <span>Scrub all EXIF, system tags, and timestamps from exported images</span>
                </div>
                <label class="apple-toggle">
                  <input type="checkbox" id="settings-strip-meta" ${this.settings.stripMeta ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <!-- Section 5: Keyboard Shortcuts Quick Reference -->
            <div class="settings-group">
              <span class="settings-group-heading">Keyboard Shortcuts</span>
              <div class="shortcuts-grid">
                <div class="shortcut-pill-row">
                  <span>Eraser Tool</span>
                  <kbd>E</kbd>
                </div>
                <div class="shortcut-pill-row">
                  <span>Emoji Stickers</span>
                  <kbd>M</kbd>
                </div>
                <div class="shortcut-pill-row">
                  <span>Recenter Canvas</span>
                  <kbd>0</kbd>
                </div>
                <div class="shortcut-pill-row">
                  <span>Delete Selected / Clear</span>
                  <kbd>Delete / Backspace</kbd>
                </div>
                <div class="shortcut-pill-row">
                  <span>Select & Move</span>
                  <kbd>V</kbd>
                </div>
                <div class="shortcut-pill-row">
                  <span>Freehand Pen</span>
                  <kbd>P</kbd>
                </div>
                <div class="shortcut-pill-row">
                  <span>Shapes & Rectangles</span>
                  <kbd>U</kbd>
                </div>
                <div class="shortcut-pill-row">
                  <span>Text Annotation</span>
                  <kbd>T</kbd>
                </div>
                <div class="shortcut-pill-row">
                  <span>Undo / Redo</span>
                  <kbd>⌘Z / ⌘⇧Z</kbd>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="settings-modal-footer">
            <button type="button" class="action-btn secondary spring-btn" id="btn-open-options-page" style="font-size: 12px; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Full Extension Options
            </button>
            <button type="button" class="action-btn primary spring-btn" id="settings-modal-done" style="min-width: 90px; justify-content: center;">
              Done
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const backdrop = document.getElementById('settings-modal-backdrop');
    const closeBtn = document.getElementById('settings-modal-close');
    const doneBtn = document.getElementById('settings-modal-done');
    const optionsPageBtn = document.getElementById('btn-open-options-page');

    eventBus.on('open-settings-modal', () => this.show());

    const closeModal = () => this.hide();

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (doneBtn) doneBtn.addEventListener('click', closeModal);
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
      });
    }

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        closeModal();
      }
    });

    // Theme selector
    const themeBtns = backdrop.querySelectorAll('#settings-theme-control .segment-btn');
    themeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        themeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.val;
        this.settings.theme = theme;
        this.store.setTheme(theme);
        this.saveSettings();
      });
    });

    // Auto open toggle
    const autoOpenInput = document.getElementById('settings-auto-open');
    if (autoOpenInput) {
      autoOpenInput.addEventListener('change', () => {
        this.settings.autoOpen = autoOpenInput.checked;
        this.saveSettings();
      });
    }

    // Capture Delay select
    const delaySelect = document.getElementById('settings-capture-delay');
    if (delaySelect) {
      delaySelect.addEventListener('change', () => {
        this.settings.captureDelay = parseInt(delaySelect.value, 10);
        this.saveSettings();
      });
    }

    // Default Format select
    const formatSelect = document.getElementById('settings-default-format');
    if (formatSelect) {
      formatSelect.addEventListener('change', () => {
        this.settings.defaultFormat = formatSelect.value;
        this.saveSettings();
      });
    }

    // Save History toggle (10 captures retention)
    const saveHistoryInput = document.getElementById('settings-save-history');
    if (saveHistoryInput) {
      saveHistoryInput.addEventListener('change', () => {
        this.settings.saveHistory = saveHistoryInput.checked;
        this.saveSettings();
        eventBus.emit('show-toast', {
          message: this.settings.saveHistory ? 'Capture history enabled (saves last 10)' : 'Capture history disabled',
          options: { icon: 'check', duration: 2000 }
        });
      });
    }

    // Clear history now button
    const clearHistoryBtn = document.getElementById('btn-clear-history-now');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', async () => {
        try {
          const { BlobStore } = await import('../services/blob-store.js');
          await BlobStore.clearAllCaptures();
          eventBus.emit('history-cleared');
          eventBus.emit('show-toast', { message: 'Previous screenshot history cleared', options: { icon: 'check' } });
        } catch (e) {
          eventBus.emit('show-toast', { message: 'Failed to clear history' });
        }
      });
    }

    // Default Save Location select
    const locationSelect = document.getElementById('settings-save-location');
    const customRow = document.getElementById('settings-custom-folder-row');
    const customInput = document.getElementById('settings-custom-folder-input');

    if (locationSelect) {
      locationSelect.addEventListener('change', () => {
        this.settings.defaultSaveLocation = locationSelect.value;
        if (customRow) {
          customRow.style.display = locationSelect.value === 'custom' ? 'flex' : 'none';
        }
        this.saveSettings();
      });
    }

    if (customInput) {
      customInput.addEventListener('input', () => {
        this.settings.customFolder = customInput.value.trim();
        this.saveSettings();
      });
    }

    // Strip metadata toggle
    const stripMetaInput = document.getElementById('settings-strip-meta');
    if (stripMetaInput) {
      stripMetaInput.addEventListener('change', () => {
        this.settings.stripMeta = stripMetaInput.checked;
        this.saveSettings();
      });
    }

    // Open chrome extension options page
    if (optionsPageBtn) {
      optionsPageBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open('../options/options.html', '_blank');
        }
      });
    }
  }

  show() {
    this.isOpen = true;
    const backdrop = document.getElementById('settings-modal-backdrop');
    if (backdrop) {
      backdrop.classList.add('open');
    }
  }

  hide() {
    this.isOpen = false;
    const backdrop = document.getElementById('settings-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
    }
  }
}
