/**
 * Pagelens — Floating Toolbar UI Component
 * Floating glassmorphism tool palette adhering to Hick's Law and Apple Sonoma ergonomics.
 */

import { eventBus } from '../core/event-bus.js';

export class Toolbar {
  constructor(container, store) {
    this.container = container;
    this.store = store;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="studio-floating-toolbar" role="toolbar" aria-label="Drawing Tools">
        <!-- Select Tool -->
        <button class="tool-btn active" data-tool="select" title="Select & Move (V)" aria-label="Select Tool">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>
        </button>

        <!-- Crop Tool -->
        <button class="tool-btn" data-tool="crop" title="Crop Viewport (C)" aria-label="Crop Tool">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>
        </button>

        <div class="toolbar-divider"></div>

        <!-- Shape Tool -->
        <button class="tool-btn" data-tool="shape" title="Shapes & Arrows (U)" aria-label="Shape Tool">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        </button>

        <!-- Pen Tool -->
        <button class="tool-btn" data-tool="pen" title="Freehand Pen (P)" aria-label="Pen Tool">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </button>

        <!-- Highlighter Tool -->
        <button class="tool-btn" data-tool="highlighter" title="Highlighter (H)" aria-label="Highlighter Tool">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 11-6 6v3h3l6-6"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>
        </button>

        <!-- Text Tool -->
        <button class="tool-btn" data-tool="text" title="Text Label (T)" aria-label="Text Tool">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
        </button>

        <div class="toolbar-divider"></div>

        <!-- Blur Tool -->
        <button class="tool-btn" data-tool="blur" title="Blur & Pixelate (B)" aria-label="Blur Tool">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/></svg>
        </button>

        <!-- Redact Tool (Distinct Crimson Tint) -->
        <button class="tool-btn" data-tool="redact" title="Solid Redaction (R) — Irreversible on export" aria-label="Redact Tool" style="color: var(--accent-crimson);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/></svg>
        </button>

        <!-- Stamp Tool (Numbered Step Markers) -->
        <button class="tool-btn" data-tool="stamp" title="Bug Report Step Stamp (S)" aria-label="Stamp Tool">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="m10 10 2-2"/></svg>
        </button>
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        this.store.setActiveTool(tool);
      });
    });

    eventBus.on('tool-changed', (activeTool) => {
      this.container.querySelectorAll('.tool-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tool === activeTool);
      });
    });

    // Keyboard shortcut routing
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      const shortcuts = {
        v: 'select',
        c: 'crop',
        u: 'shape',
        p: 'pen',
        h: 'highlighter',
        t: 'text',
        b: 'blur',
        r: 'redact',
        s: 'stamp',
      };
      if (shortcuts[key]) {
        this.store.setActiveTool(shortcuts[key]);
      }
    });
  }
}
