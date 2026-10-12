/**
 * Pagelens — Top Bar UI Component
 * Top bar housing Pagelens brand, undo/redo, dynamic markup delete button,
 * editable file name, zoom controls, theme toggle, and fast high-visibility red download.
 */

import { eventBus } from '../core/event-bus.js';
import { history } from '../core/history.js';
import { viewport } from '../core/viewport.js';
import { ExportService } from '../services/export-service.js';
import { DeleteCommand } from '../core/commands/move-command.js';

export class TopBar {
  constructor(container, store, documentModel) {
    this.container = container;
    this.store = store;
    this.documentModel = documentModel;
    this.render();
    this.bindEvents();
    this.updateDeleteButtonState();
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
          <!-- Zoom Controls -->
          <div class="zoom-controls-cluster">
            <button class="icon-btn spring-btn" id="topbar-zoom-out" title="Zoom Out (-)" aria-label="Zoom Out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <span id="zoom-level-label" style="font-size: 12px; font-family: var(--font-mono); color: var(--text-muted); min-width: 40px; text-align: center;">100%</span>
            <button class="icon-btn spring-btn" id="topbar-zoom-in" title="Zoom In (+)" aria-label="Zoom In">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <button class="icon-btn spring-btn" id="topbar-zoom-fit" title="Fit to Screen" aria-label="Fit to Screen">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
            </button>
          </div>

          <!-- Theme Toggle (Obsidian / Porcelain) -->
          <button class="icon-btn spring-btn" id="topbar-theme-toggle" title="Toggle Theme (Obsidian / Porcelain)" aria-label="Toggle Theme">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          </button>

          <!-- Settings Button -->
          <button class="icon-btn spring-btn" id="topbar-settings-btn" title="Studio & Capture Settings" aria-label="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>

          <!-- Primary Red Download Action Button (High-Visibility Rapid Call To Action) -->
          <div class="download-cluster">
            <button class="action-btn primary spring-btn download-btn-red" id="topbar-download-btn" title="Download Screenshot Now">
              <svg class="download-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span class="download-label">Download</span>
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

    // Editable Title Input
    const commitTitle = () => {
      const cleanTitle = (titleInput.value || '').trim() || 'Screenshot';
      this.documentModel.title = cleanTitle;
      titleInput.value = cleanTitle;
    };

    titleInput.addEventListener('input', () => {
      this.documentModel.title = (titleInput.value || '').trim() || 'Screenshot';
    });

    titleInput.addEventListener('change', commitTitle);
    titleInput.addEventListener('blur', commitTitle);
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        commitTitle();
        titleInput.blur();
      }
    });

    // Zoom buttons
    document.getElementById('topbar-zoom-in').addEventListener('click', () => viewport.zoomIn());
    document.getElementById('topbar-zoom-out').addEventListener('click', () => viewport.zoomOut());
    document.getElementById('topbar-zoom-fit').addEventListener('click', () => {
      viewport.fitToScreen(this.documentModel.width, this.documentModel.height);
    });

    eventBus.on('viewport-changed', (vp) => {
      const label = document.getElementById('zoom-level-label');
      if (label) {
        label.textContent = `${Math.round(vp.zoom * 100)}%`;
      }
    });

    // Theme toggle
    document.getElementById('topbar-theme-toggle').addEventListener('click', () => {
      const current = this.store.getState().theme;
      const next = current === 'obsidian' ? 'porcelain' : 'obsidian';
      this.store.setTheme(next);
    });

    // Settings modal trigger
    const settingsBtn = document.getElementById('topbar-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        eventBus.emit('open-settings-modal');
      });
    }

    // Document loaded updates title & dimensions & delete button state
    eventBus.on('document-loaded', (doc) => {
      if (titleInput) titleInput.value = doc.title || 'Current Screenshot';
      const dimEl = document.getElementById('doc-dimensions-display');
      if (dimEl) dimEl.textContent = `${doc.width.toLocaleString()} × ${doc.height.toLocaleString()} px`;
      this.updateDeleteButtonState();
    });

    // Fast Red Download Button execution
    downloadBtn.addEventListener('click', async () => {
      downloadBtn.classList.add('downloading');
      try {
        const title = (this.documentModel.title || 'Screenshot').trim();
        await ExportService.exportDocument(this.documentModel, {
          format: 'png',
          quality: 0.95,
          destination: 'download',
          title,
        });

        eventBus.emit('show-toast', {
          message: `Saved ${title}.png to Downloads`,
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

    // Standard Undo/Redo/Delete keyboard shortcuts
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
  }
}
