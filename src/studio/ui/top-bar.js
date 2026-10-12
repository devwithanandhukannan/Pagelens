/**
 * Pagelens — Top Bar UI Component
 * Top bar housing Pagelens brand, Files manager button, undo/redo, markup delete button,
 * spacious editable file name, dimensions, and high-visibility red download action.
 * (Zoom, recenter, theme, and settings are moved to the right-side ViewportDock to prevent crowding).
 */

import { eventBus } from '../core/event-bus.js';
import { history } from '../core/history.js';
import { viewport } from '../core/viewport.js';
import { ExportService } from '../services/export-service.js';
import { DeleteCommand } from '../core/commands/move-command.js';
import { BlobStore } from '../services/blob-store.js';

export class TopBar {
  constructor(container, store, documentModel) {
    this.container = container;
    this.store = store;
    this.documentModel = documentModel;
    this.currentFormat = 'png';
    this.render();
    this.bindEvents();
    this.updateDeleteButtonState();
    this.refreshHistoryBadge();
    this.loadCurrentFormat();
  }

  render() {
    this.container.innerHTML = `
      <header class="studio-topbar" role="banner">
        <div class="topbar-left">
          <!-- Brand Badge -->
          <div class="topbar-brand" title="Pagelens Screenshot Studio">
            <div class="brand-icon-wrapper">
              <img src="../assets/icons/icon-48.png" width="22" height="22" alt="Pagelens Logo" class="brand-logo-img">
            </div>
            <span class="brand-text">Pagelens</span>
          </div>

          <div class="topbar-divider"></div>

          <!-- Files Manager Trigger (Previous Screenshots) -->
          <button class="topbar-files-btn spring-btn" id="topbar-files-btn" title="View & Manage Previous Screenshots (Files)" aria-label="View Previous Screenshots">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span class="files-btn-text">Files</span>
            <span class="history-count-badge" id="history-count-badge" style="display: none;">0</span>
          </button>

          <!-- Retake Action Trigger -->
          <button class="topbar-retake-btn spring-btn" id="topbar-retake-btn" title="Retake Screenshot of this webpage (R)" aria-label="Retake Screenshot">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            <span class="retake-btn-text">Retake</span>
          </button>

          <div class="topbar-divider"></div>

          <!-- History Actions -->
          <button class="icon-btn spring-btn" id="topbar-undo" title="Undo (Cmd+Z)" disabled aria-label="Undo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </button>

          <button class="icon-btn spring-btn" id="topbar-redo" title="Redo (Cmd+Shift+Z)" disabled aria-label="Redo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
          </button>

          <!-- Dynamic Delete / Clear Markup Action -->
          <button class="icon-btn spring-btn delete-markup-btn disabled" id="topbar-delete-btn" title="No markups to delete" disabled aria-label="Delete Markup">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>

        <div class="topbar-center">
          <!-- Editable File Name Input -->
          <div class="doc-title-wrapper" title="Click to edit file name">
            <input 
              type="text" 
              id="doc-title-input" 
              class="doc-title-input" 
              value="${this.documentModel.title || 'Current Screenshot'}" 
              placeholder="Enter file name" 
              spellcheck="false" 
              autocomplete="off" 
              aria-label="Screenshot File Name"
            />
            <svg class="edit-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>

          <div class="doc-pill" id="doc-dimensions-pill" title="Image Dimensions">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/></svg>
            <span id="doc-dimensions-display">0 × 0 px</span>
          </div>
        </div>

        <div class="topbar-right">
          <!-- Primary Red Download Action Button (Displays format e.g. PNG / JPEG / PDF) -->
          <div class="download-cluster">
            <button class="action-btn primary spring-btn download-btn-red" id="topbar-download-btn" title="Download Screenshot">
              <svg class="download-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span class="download-label">Download</span>
              <span class="download-format-badge" id="topbar-format-badge">PNG</span>
            </button>

            <!-- Export Formats & Sharing Options Dropdown/Sheet Trigger -->
            <button class="icon-btn spring-btn export-options-btn" id="topbar-export-options-btn" title="More Export Options (PDF, JPEG, Clipboard)" aria-label="More Export Options">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>
        </div>
      </header>
    `;
  }

  updateDeleteButtonState() {
    const deleteBtn = document.getElementById('topbar-delete-btn');
    if (!deleteBtn) return;

    const hasAnnotations = (this.documentModel.annotations && this.documentModel.annotations.length > 0) || !!this.documentModel.crop;
    const selectedId = this.store.getState().selectedObjectId;
    const hasSelection = !!selectedId;

    if (hasSelection) {
      deleteBtn.disabled = false;
      deleteBtn.classList.remove('disabled');
      deleteBtn.classList.add('active', 'has-selection');
      deleteBtn.setAttribute('aria-disabled', 'false');
      deleteBtn.title = 'Delete selected markup (Del / Backspace)';
    } else if (hasAnnotations) {
      deleteBtn.disabled = false;
      deleteBtn.classList.remove('disabled');
      deleteBtn.classList.remove('has-selection');
      deleteBtn.classList.add('active');
      deleteBtn.setAttribute('aria-disabled', 'false');
      deleteBtn.title = 'Clear all markups';
    } else {
      deleteBtn.disabled = true;
      deleteBtn.classList.add('disabled');
      deleteBtn.classList.remove('active', 'has-selection');
      deleteBtn.setAttribute('aria-disabled', 'true');
      deleteBtn.title = 'No markup to delete';
    }
  }

  bindEvents() {
    const undoBtn = document.getElementById('topbar-undo');
    const redoBtn = document.getElementById('topbar-redo');
    const deleteBtn = document.getElementById('topbar-delete-btn');
    const titleInput = document.getElementById('doc-title-input');
    const downloadBtn = document.getElementById('topbar-download-btn');
    const exportOptionsBtn = document.getElementById('topbar-export-options-btn');
    const filesBtn = document.getElementById('topbar-files-btn');
    const retakeBtn = document.getElementById('topbar-retake-btn');

    // Open Files modal
    if (filesBtn) {
      filesBtn.addEventListener('click', () => {
        eventBus.emit('open-files-modal');
      });
    }

    // Retake current screenshot
    if (retakeBtn) {
      retakeBtn.addEventListener('click', () => {
        retakeBtn.classList.add('loading');
        eventBus.emit('retake-current-capture');
        setTimeout(() => retakeBtn.classList.remove('loading'), 3500);
      });
    }

    // Undo / Redo
    undoBtn.addEventListener('click', () => history.undo());
    redoBtn.addEventListener('click', () => history.redo());

    eventBus.on('history-changed', ({ canUndo, canRedo }) => {
      undoBtn.disabled = !canUndo;
      redoBtn.disabled = !canRedo;
      this.updateDeleteButtonState();
    });

    // Delete / Clear Markup Action
    deleteBtn.addEventListener('click', () => {
      const selectedId = this.store.getState().selectedObjectId;
      if (selectedId) {
        const obj = this.documentModel.getAnnotation(selectedId);
        if (obj) {
          history.execute(new DeleteCommand(obj));
        } else {
          this.documentModel.removeAnnotation(selectedId);
        }
        this.store.setSelectedObject(null);
        eventBus.emit('show-toast', { message: 'Markup deleted', options: { icon: 'check' } });
      } else if (this.documentModel.annotations.length > 0 || this.documentModel.crop) {
        eventBus.emit('clear-annotations');
      }
      this.updateDeleteButtonState();
    });

    // Reactive listeners for delete button state
    eventBus.on('annotation-added', () => this.updateDeleteButtonState());
    eventBus.on('annotation-removed', () => this.updateDeleteButtonState());
    eventBus.on('selection-changed', () => this.updateDeleteButtonState());
    eventBus.on('document-changed', () => this.updateDeleteButtonState());
    eventBus.on('crop-changed', () => this.updateDeleteButtonState());

    // Dynamic Title Input sizing and committing
    const updateTitleInputWidth = () => {
      if (!titleInput) return;
      const val = titleInput.value || '';
      const charLen = Math.max(14, val.length + 2);
      titleInput.style.width = `min(680px, max(140px, ${charLen}ch))`;
      titleInput.title = val ? `File name: ${val}` : 'Screenshot File Name';
    };

    const commitTitle = () => {
      const cleanTitle = (titleInput.value || '').trim() || 'Screenshot';
      this.documentModel.title = cleanTitle;
      titleInput.value = cleanTitle;
      updateTitleInputWidth();
    };

    titleInput.addEventListener('input', () => {
      this.documentModel.title = (titleInput.value || '').trim() || 'Screenshot';
      updateTitleInputWidth();
    });

    titleInput.addEventListener('change', commitTitle);
    titleInput.addEventListener('blur', commitTitle);
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        commitTitle();
        titleInput.blur();
      }
    });

    eventBus.on('history-updated', () => {
      this.refreshHistoryBadge();
    });

    // Document loaded updates title & dimensions & delete button state
    eventBus.on('document-loaded', (doc) => {
      if (titleInput) {
        titleInput.value = doc.title || 'Current Screenshot';
        updateTitleInputWidth();
      }
      const dimEl = document.getElementById('doc-dimensions-display');
      if (dimEl) dimEl.textContent = `${doc.width.toLocaleString()} × ${doc.height.toLocaleString()} px`;
      this.updateDeleteButtonState();
    });

    // Listen for settings changes to update format badge
    eventBus.on('settings-changed', (newSettings) => {
      if (newSettings && newSettings.defaultFormat) {
        this.updateFormatBadge(newSettings.defaultFormat);
      }
    });

    // Fast Red Download Button execution using selected format (PNG, JPEG, PDF)
    downloadBtn.addEventListener('click', async () => {
      downloadBtn.classList.add('downloading');
      try {
        const title = (this.documentModel.title || 'Screenshot').trim();
        const fmt = (this.currentFormat || 'png').toLowerCase();
        const res = await ExportService.exportDocument(this.documentModel, {
          format: fmt,
          quality: 0.95,
          destination: 'download',
          title,
        });

        const destMsg = res?.destination === 'directory'
          ? `Saved ${res.filename} to 📁 ${res.folder}`
          : `Saved ${title}.${fmt}`;

        eventBus.emit('show-toast', {
          message: destMsg,
          options: { icon: 'check', duration: 3600 }
        });
      } catch (err) {
        console.error('[Download error]', err);
        eventBus.emit('show-toast', { message: `Download failed: ${err.message}` });
      } finally {
        setTimeout(() => downloadBtn.classList.remove('downloading'), 400);
      }
    });

    // Export options sheet trigger
    exportOptionsBtn.addEventListener('click', () => {
      eventBus.emit('open-export-sheet');
    });

    // Keyboard shortcuts (Undo, Redo, Recenter '0', Delete)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          history.redo();
        } else {
          history.undo();
        }
        e.preventDefault();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        history.redo();
        e.preventDefault();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        const selectedId = this.store.getState().selectedObjectId;
        if (!selectedId && this.documentModel.baseImage) {
          eventBus.emit('copy-to-clipboard');
          e.preventDefault();
        }
      } else if (e.key === '0') {
        viewport.recenter(this.documentModel.width, this.documentModel.height);
        eventBus.emit('viewport-changed', viewport);
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const retakeBtn = document.getElementById('topbar-retake-btn');
        if (retakeBtn) {
          retakeBtn.classList.add('loading');
          setTimeout(() => retakeBtn.classList.remove('loading'), 3500);
        }
        eventBus.emit('retake-current-capture');
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedId = this.store.getState().selectedObjectId;
        if (selectedId) {
          const obj = this.documentModel.getAnnotation(selectedId);
          if (obj) {
            history.execute(new DeleteCommand(obj));
            this.store.setSelectedObject(null);
            this.updateDeleteButtonState();
            eventBus.emit('show-toast', { message: 'Markup deleted', options: { icon: 'check' } });
            e.preventDefault();
          }
        }
      }
    });

    updateTitleInputWidth();
  }

  async loadCurrentFormat() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const stored = await chrome.storage.local.get('pagelens_settings');
        if (stored?.pagelens_settings?.defaultFormat) {
          this.updateFormatBadge(stored.pagelens_settings.defaultFormat);
          return;
        }
      }
      const local = localStorage.getItem('pagelens_settings');
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.defaultFormat) {
          this.updateFormatBadge(parsed.defaultFormat);
          return;
        }
      }
    } catch (_) {}
    this.updateFormatBadge('png');
  }

  updateFormatBadge(fmt) {
    this.currentFormat = (fmt || 'png').toLowerCase();
    const badge = document.getElementById('topbar-format-badge');
    if (badge) {
      badge.textContent = this.currentFormat.toUpperCase();
    }
  }

  async refreshHistoryBadge() {
    try {
      const captures = await BlobStore.getRecentCaptures(10);
      const badge = document.getElementById('history-count-badge');
      if (badge) {
        if (captures.length > 0) {
          badge.textContent = captures.length;
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (_) {}
  }
}
