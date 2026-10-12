/**
 * Pagelens — Viewport & Canvas Navigation Dock
 * Slim, single-column floating dock situated on the right side of the canvas.
 * Exactly 1 tool per row (Zoom In, Zoom Out, Recenter, Fit, Crop, Theme, Settings).
 * Zoom percentage display is rendered on the top navbar to keep this dock ultra-compact.
 */

import { eventBus } from '../core/event-bus.js';
import { viewport } from '../core/viewport.js';
import { store } from '../core/store.js';
import { documentModel } from '../core/document-model.js';

export class ViewportDock {
  constructor(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <aside class="studio-viewport-dock right-dock-vertical" id="studio-viewport-dock" aria-label="Canvas Navigation & View Controls">
        <!-- 1: Zoom In -->
        <button class="dock-btn spring-btn" id="dock-zoom-in" title="Zoom In (+)" aria-label="Zoom In">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>

        <!-- 2: Zoom Out -->
        <button class="dock-btn spring-btn" id="dock-zoom-out" title="Zoom Out (-)" aria-label="Zoom Out">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>

        <div class="dock-divider-h"></div>

        <!-- 3: Recenter Canvas -->
        <button class="dock-btn spring-btn" id="dock-zoom-recenter" title="Recenter Canvas (0)" aria-label="Recenter Canvas">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
        </button>

        <!-- 4: Fit to Screen -->
        <button class="dock-btn spring-btn" id="dock-zoom-fit" title="Fit to Screen (F)" aria-label="Fit to Screen">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
        </button>

        <div class="dock-divider-h"></div>

        <!-- 5: Canvas Crop Tool -->
        <button class="dock-btn spring-btn" id="dock-tool-crop" title="Crop Canvas" aria-label="Crop">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>
        </button>

        <div class="dock-divider-h"></div>

        <!-- 6: Theme Toggle -->
        <button class="dock-btn spring-btn" id="dock-theme-toggle" title="Toggle Light/Dark Theme" aria-label="Toggle Theme">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        </button>

        <!-- 7: Settings -->
        <button class="dock-btn spring-btn" id="dock-settings-btn" title="Settings" aria-label="Settings">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </aside>
    `;
  }

  bindEvents() {
    const zoomInBtn = document.getElementById('dock-zoom-in');
    const zoomOutBtn = document.getElementById('dock-zoom-out');
    const recenterBtn = document.getElementById('dock-zoom-recenter');
    const fitBtn = document.getElementById('dock-zoom-fit');
    const cropBtn = document.getElementById('dock-tool-crop');
    const themeBtn = document.getElementById('dock-theme-toggle');
    const settingsBtn = document.getElementById('dock-settings-btn');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => viewport.zoomIn());
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => viewport.zoomOut());

    if (recenterBtn) {
      recenterBtn.addEventListener('click', () => {
        viewport.recenter(documentModel.width, documentModel.height);
        eventBus.emit('viewport-changed', viewport);
        eventBus.emit('show-toast', { message: 'Canvas recentered', options: { icon: 'check', duration: 1600 } });
      });
    }

    if (fitBtn) {
      fitBtn.addEventListener('click', () => {
        viewport.fitToScreen(documentModel.width, documentModel.height);
      });
    }

    if (cropBtn) {
      cropBtn.addEventListener('click', () => {
        const currentTool = store.getState().activeTool;
        store.setActiveTool(currentTool === 'crop' ? 'select' : 'crop');
      });
    }

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = store.getState().theme;
        const next = current === 'obsidian' ? 'porcelain' : 'obsidian';
        store.setTheme(next);
      });
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        eventBus.emit('open-settings-modal');
      });
    }

    // Keep active tool state synced for crop button
    eventBus.on('tool-changed', (tool) => {
      if (cropBtn) {
        cropBtn.classList.toggle('active', tool === 'crop');
      }
    });
  }
}

