/**
 * Pagelens — Top Bar UI Component
 * Top bar housing undo/redo, document status, zoom, theme toggle, and export.
 */

import { eventBus } from '../core/event-bus.js';
import { history } from '../core/history.js';
import { viewport } from '../core/viewport.js';

export class TopBar {
  constructor(container, store, documentModel) {
    this.container = container;
    this.store = store;
    this.documentModel = documentModel;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <header class="studio-topbar" role="banner">
        <div class="topbar-left">
          <button class="icon-btn spring-btn" id="topbar-toggle-sidebar" title="Toggle Sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
          </button>

          <button class="icon-btn spring-btn" id="topbar-undo" title="Undo (Cmd+Z)" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </button>

          <button class="icon-btn spring-btn" id="topbar-redo" title="Redo (Cmd+Shift+Z)" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
          </button>
        </div>

        <div class="topbar-center">
          <span id="doc-title-display">Current Screenshot</span>
          <div class="doc-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/></svg>
            <span id="doc-dimensions-display">0 × 0 px</span>
          </div>
        </div>

        <div class="topbar-right">
          <!-- Zoom Controls -->
          <button class="icon-btn spring-btn" id="topbar-zoom-out" title="Zoom Out (-)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <span id="zoom-level-label" style="font-size: 12px; font-family: var(--font-mono); color: var(--text-muted); min-width: 40px; text-align: center;">100%</span>
          <button class="icon-btn spring-btn" id="topbar-zoom-in" title="Zoom In (+)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <button class="icon-btn spring-btn" id="topbar-zoom-fit" title="Fit to Screen">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
          </button>

          <!-- Theme Toggle (Obsidian / Porcelain) -->
          <button class="icon-btn spring-btn" id="topbar-theme-toggle" title="Toggle Theme (Obsidian / Porcelain)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          </button>

          <!-- Primary Export Action Button -->
          <button class="action-btn primary spring-btn" id="topbar-export-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
        </div>
      </header>
    `;
  }

  bindEvents() {
    const undoBtn = document.getElementById('topbar-undo');
    const redoBtn = document.getElementById('topbar-redo');

    undoBtn.addEventListener('click', () => history.undo());
    redoBtn.addEventListener('click', () => history.redo());

    eventBus.on('history-changed', ({ canUndo, canRedo }) => {
      undoBtn.disabled = !canUndo;
      redoBtn.disabled = !canRedo;
    });

    document.getElementById('topbar-toggle-sidebar').addEventListener('click', () => {
      this.store.toggleSidebar();
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

    // Document loaded updates title & dimensions
    eventBus.on('document-loaded', (doc) => {
      const titleEl = document.getElementById('doc-title-display');
      const dimEl = document.getElementById('doc-dimensions-display');
      if (titleEl) titleEl.textContent = doc.title;
      if (dimEl) dimEl.textContent = `${doc.width} × ${doc.height} px`;
    });

    // Export button triggers export sheet
    document.getElementById('topbar-export-btn').addEventListener('click', () => {
      eventBus.emit('open-export-sheet');
    });

    // Standard Undo/Redo keyboard shortcuts (Cmd+Z, Cmd+Shift+Z, Ctrl+Z, Ctrl+Y)
    window.addEventListener('keydown', (e) => {
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
      }
    });
  }
}
