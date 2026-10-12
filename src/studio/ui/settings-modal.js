/**
 * Pagelens — Studio Settings Popup Modal Component
 * Modern 2-column popup modal card that opens smoothly from bottom to top.
 * Fully self-contained inside the studio (no external options page redirect).
 */

import { eventBus } from '../core/event-bus.js';
import { BlobStore } from '../services/blob-store.js';
import { DirectoryPickerService } from '../services/directory-picker.js';

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
      pickedFolderName: '',
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
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const stored = await chrome.storage.local.get(['pagelens_settings', 'theme']);
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

      // Check if a directory handle is already stored
      const storedHandle = await DirectoryPickerService.getStoredHandle();
      if (storedHandle && storedHandle.name) {
        this.settings.pickedFolderName = storedHandle.name;
      }
    } catch (e) {
      console.warn('[SettingsModal] Failed to load settings:', e);
    }
  }

  async saveSettings() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({
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
    const isJpeg = this.settings.defaultFormat === 'jpeg';

    this.container.innerHTML = `
      <div class="settings-modal-backdrop" id="settings-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
        <div class="settings-modal-card bottom-card" id="settings-modal-card">
          <!-- Modal Header -->
          <div class="settings-modal-header">
            <div class="settings-header-title-box">
              <div class="settings-header-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              <div>
                <h2 class="settings-modal-title" id="settings-modal-title">Studio Settings</h2>
                <span class="settings-modal-subtitle">Customize editor behavior, download formats, and storage</span>
              </div>
            </div>
            <button class="icon-btn spring-btn" id="settings-modal-close" aria-label="Close Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <!-- Two-Column Body Content -->
          <div class="settings-modal-body two-col-grid">
            <!-- COLUMN 1: Editor, Theme & Capture -->
            <div class="settings-col">
              <div class="settings-group">
                <span class="settings-group-heading">Appearance & Editor</span>

                <div class="settings-item-row">
                  <div class="settings-item-label">
                    <strong>Theme Mode</strong>
                    <span>Obsidian dark or Porcelain light</span>
                  </div>
                  <div class="settings-segmented-control" id="settings-theme-control">
                    <button type="button" class="segment-btn ${this.settings.theme === 'obsidian' ? 'active' : ''}" data-val="obsidian">Dark</button>
                    <button type="button" class="segment-btn ${this.settings.theme === 'porcelain' ? 'active' : ''}" data-val="porcelain">Light</button>
                  </div>
                </div>

                <div class="settings-item-row">
                  <div class="settings-item-label">
                    <strong>Auto-Open Studio</strong>
                    <span>Launch editor automatically after capture</span>
                  </div>
                  <label class="apple-toggle">
                    <input type="checkbox" id="settings-auto-open" ${this.settings.autoOpen ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div class="settings-group">
                <span class="settings-group-heading">Capture History (Last 10)</span>

                <div class="settings-item-row">
                  <div class="settings-item-label">
                    <strong>Save Previous Screenshots</strong>
                    <span>Retain up to 10 previous captures locally</span>
                  </div>
                  <label class="apple-toggle">
                    <input type="checkbox" id="settings-save-history" ${this.settings.saveHistory ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                </div>

                <div class="settings-item-row" style="background: transparent; border: none; padding: 4px 0;">
                  <div class="settings-item-label">
                    <span style="font-size: 11.5px; color: var(--text-muted);">Clear cached captures from browser database</span>
                  </div>
                  <button type="button" class="spring-btn icon-btn" id="btn-clear-history-now" style="width: auto; height: 30px; padding: 0 12px; font-size: 11.5px; gap: 6px; color: var(--accent-crimson); border-color: rgba(239, 68, 68, 0.3);">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    Clear History
                  </button>
                </div>
              </div>

              <div class="settings-group">
                <span class="settings-group-heading">Reliability & Stability</span>
                <div class="settings-item-row">
                  <div class="settings-item-label">
                    <strong>Slice Settle Delay</strong>
                    <span>Settle time for lazy content & sticky bars</span>
                  </div>
                  <select id="settings-capture-delay" class="settings-select">
                    <option value="350" ${this.settings.captureDelay === 350 ? 'selected' : ''}>Fast (350ms)</option>
                    <option value="560" ${this.settings.captureDelay === 560 ? 'selected' : ''}>Standard (560ms)</option>
                    <option value="800" ${this.settings.captureDelay === 800 ? 'selected' : ''}>Heavy Web (800ms)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- COLUMN 2: Export Formats & Save Location -->
            <div class="settings-col">
              <div class="settings-group">
                <span class="settings-group-heading">Download & Export Format</span>

                <div class="settings-item-row">
                  <div class="settings-item-label">
                    <strong>Default Download Format</strong>
                    <span>Format shown on the red Download button</span>
                  </div>
                  <select id="settings-default-format" class="settings-select">
                    <option value="png" ${this.settings.defaultFormat === 'png' ? 'selected' : ''}>PNG (Lossless)</option>
                    <option value="jpeg" ${this.settings.defaultFormat === 'jpeg' ? 'selected' : ''}>JPEG (Compressed)</option>
                    <option value="pdf" ${this.settings.defaultFormat === 'pdf' ? 'selected' : ''}>PDF (Paginated Document)</option>
                  </select>
                </div>

                <div class="settings-item-row" id="settings-jpeg-quality-row" style="display: ${isJpeg ? 'flex' : 'none'};">
                  <div class="settings-item-label">
                    <strong>JPEG Quality (${this.settings.jpegQuality}%)</strong>
                    <span>Compression level for JPEG exports</span>
                  </div>
                  <input type="range" id="settings-jpeg-quality" min="50" max="100" value="${this.settings.jpegQuality}" style="width: 100px; accent-color: var(--accent-violet);" />
                </div>
              </div>

              <div class="settings-group">
                <span class="settings-group-heading">Save Destination</span>

                <div class="settings-item-row">
                  <div class="settings-item-label">
                    <strong>Default Save Location</strong>
                    <span>Target directory on your computer</span>
                  </div>
                  <div class="settings-save-loc-wrapper" style="display: flex; align-items: center; gap: 8px;">
                    <select id="settings-save-location" class="settings-select">
                      <option value="Desktop" ${this.settings.defaultSaveLocation === 'Desktop' ? 'selected' : ''}>Desktop (Default)</option>
                      <option value="Downloads" ${this.settings.defaultSaveLocation === 'Downloads' ? 'selected' : ''}>Downloads Root</option>
                      <option value="Pagelens" ${this.settings.defaultSaveLocation === 'Pagelens' ? 'selected' : ''}>Downloads/Pagelens</option>
                      ${this.settings.pickedFolderName ? `<option value="picked" ${this.settings.defaultSaveLocation === 'picked' ? 'selected' : ''}>📁 ${this.escapeHtml(this.settings.pickedFolderName)} (Active)</option>` : ''}
                      <option value="pick_new">📁 Pick Folder (System Picker)...</option>
                      <option value="custom" ${isCustom ? 'selected' : ''}>Custom Subfolder...</option>
                    </select>
                    <button type="button" class="spring-btn icon-btn" id="btn-browse-folder" title="Pick directory on your computer using native file picker" style="width: auto; height: 32px; padding: 0 10px; font-size: 11.5px; gap: 5px; flex-shrink: 0;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      Browse...
                    </button>
                  </div>
                </div>

                <div id="settings-picked-folder-row" class="settings-item-row" style="display: ${this.settings.defaultSaveLocation === 'picked' ? 'flex' : 'none'};">
                  <div class="settings-item-label">
                    <strong style="color: var(--accent-violet);">Active: 📁 <span id="settings-picked-folder-name">${this.escapeHtml(this.settings.pickedFolderName || 'Selected Folder')}</span></strong>
                    <span>Screenshots save directly to this chosen directory</span>
                  </div>
                  <button type="button" class="spring-btn icon-btn" id="btn-change-folder-link" style="width: auto; height: 28px; padding: 0 10px; font-size: 11.5px; gap: 5px; color: var(--accent-violet); border-color: rgba(139, 92, 246, 0.4);">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Change Folder
                  </button>
                </div>

                <div id="settings-custom-folder-row" class="settings-item-row" style="display: ${isCustom ? 'flex' : 'none'};">
                  <div class="settings-item-label">
                    <strong>Custom Folder Name</strong>
                    <span>Directory relative to user Downloads</span>
                  </div>
                  <input type="text" id="settings-custom-folder-input" class="settings-select" style="min-width: 140px;" value="${this.escapeHtml(this.settings.customFolder || '')}" placeholder="e.g. Screenshots" />
                </div>
              </div>


              <div class="settings-group">
                <span class="settings-group-heading">Privacy & Security</span>

                <div class="settings-item-row">
                  <div class="settings-item-label">
                    <strong>Strip Metadata</strong>
                    <span>Scrub EXIF, timestamps, and origin tags</span>
                  </div>
                  <label class="apple-toggle">
                    <input type="checkbox" id="settings-strip-meta" ${this.settings.stripMeta ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer (Clean Done button only, no external settings page) -->
          <div class="settings-modal-footer">
            <span style="font-size: 11.5px; color: var(--text-muted);">Settings saved automatically to local storage</span>
            <button type="button" class="action-btn primary spring-btn" id="settings-modal-done" style="min-width: 110px; justify-content: center;">
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

    // Save history toggle
    const saveHistoryInput = document.getElementById('settings-save-history');
    if (saveHistoryInput) {
      saveHistoryInput.addEventListener('change', () => {
        this.settings.saveHistory = saveHistoryInput.checked;
        this.saveSettings();
      });
    }

    // Clear history button
    const clearHistoryBtn = document.getElementById('btn-clear-history-now');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', async () => {
        await BlobStore.clearAllCaptures();
        eventBus.emit('history-updated');
        eventBus.emit('show-toast', { message: 'Capture history cleared', options: { icon: 'check' } });
      });
    }

    // Capture settle delay
    const delaySelect = document.getElementById('settings-capture-delay');
    if (delaySelect) {
      delaySelect.addEventListener('change', () => {
        this.settings.captureDelay = parseInt(delaySelect.value, 10);
        this.saveSettings();
      });
    }

    // Default download format
    const formatSelect = document.getElementById('settings-default-format');
    const jpegQualityRow = document.getElementById('settings-jpeg-quality-row');
    if (formatSelect) {
      formatSelect.addEventListener('change', () => {
        const val = formatSelect.value;
        this.settings.defaultFormat = val;
        if (jpegQualityRow) {
          jpegQualityRow.style.display = val === 'jpeg' ? 'flex' : 'none';
        }
        this.saveSettings();
      });
    }

    // JPEG quality slider
    const jpegQualityInput = document.getElementById('settings-jpeg-quality');
    if (jpegQualityInput) {
      jpegQualityInput.addEventListener('input', () => {
        this.settings.jpegQuality = parseInt(jpegQualityInput.value, 10);
        this.saveSettings();
      });
    }

    // Save location select
    const saveLocSelect = document.getElementById('settings-save-location');
    const customRow = document.getElementById('settings-custom-folder-row');
    const customInput = document.getElementById('settings-custom-folder-input');
    const browseBtn = document.getElementById('btn-browse-folder');
    const changeFolderBtn = document.getElementById('btn-change-folder-link');
    const pickedRow = document.getElementById('settings-picked-folder-row');

    if (browseBtn) {
      browseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handlePickDirectory();
      });
    }

    if (changeFolderBtn) {
      changeFolderBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handlePickDirectory();
      });
    }

    if (saveLocSelect) {
      saveLocSelect.addEventListener('change', () => {
        const val = saveLocSelect.value;
        if (val === 'pick_new') {
          this.handlePickDirectory();
          return;
        }

        this.settings.defaultSaveLocation = val;
        if (customRow) {
          customRow.style.display = val === 'custom' ? 'flex' : 'none';
        }
        if (pickedRow) {
          pickedRow.style.display = val === 'picked' ? 'flex' : 'none';
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
  }

  async handlePickDirectory() {
    try {
      const handle = await DirectoryPickerService.pickDirectory();
      if (handle) {
        this.settings.defaultSaveLocation = 'picked';
        this.settings.pickedFolderName = handle.name;
        await this.saveSettings();
        this.render();
        this.bindEvents();
        eventBus.emit('show-toast', {
          message: `Default save location set to 📁 ${handle.name}`,
          options: { icon: 'check' },
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[SettingsModal] Directory picker warning:', err);
        eventBus.emit('show-toast', {
          message: 'Folder picker canceled or not supported',
          options: { icon: 'alert' },
        });
      }
      const select = document.getElementById('settings-save-location');
      if (select) select.value = this.settings.defaultSaveLocation;
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
