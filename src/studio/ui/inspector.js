/**
 * Pagelens — Contextual Inspector UI Component
 * Floats contextually to offer immediate controls based on the selected tool or object.
 * Pure vector icons and smooth spring transitions.
 */

import { eventBus } from '../core/event-bus.js';

export class Inspector {
  constructor(container, store) {
    this.container = container;
    this.store = store;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="studio-floating-inspector" id="pagelens-inspector" role="region" aria-label="Tool Properties">
        <!-- Dynamic content injected on tool switch -->
      </div>
    `;
    this.inspectorEl = document.getElementById('pagelens-inspector');
  }

  update(state) {
    const { activeTool, toolOptions, selectedObjectId } = state;

    if (activeTool === 'select' && !selectedObjectId) {
      this.inspectorEl.classList.remove('visible');
      return;
    }

    this.inspectorEl.classList.add('visible');

    if (activeTool === 'crop') {
      this.inspectorEl.innerHTML = `
        <div class="inspector-group">
          <span class="inspector-label">Aspect</span>
          <div style="display: flex; gap: 4px;">
            ${[
              { id: 'free', label: 'Free' },
              { id: '16:9', label: '16:9' },
              { id: '4:3', label: '4:3' },
              { id: '1:1', label: '1:1' }
            ].map((p) => `
              <button class="spring-btn ${toolOptions.aspectPreset === p.id ? 'pill-badge' : 'icon-btn'}"
                      data-aspect="${p.id}" style="height: 28px; padding: 0 10px; font-size: 11px; width: auto; gap: 4px; display: inline-flex; align-items: center;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v14a2 2 0 0 0 2 2h14"/></svg>
                ${p.label}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (activeTool === 'redact') {
      this.inspectorEl.innerHTML = `
        <div class="inline-warning-banner" style="padding: 6px 12px; font-size: 11px; gap: 8px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Solid fill permanent redaction — Irreversible on export
        </div>
      `;
    } else if (activeTool === 'blur') {
      this.inspectorEl.innerHTML = `
        <div class="inspector-group">
          <span class="inspector-label">Style</span>
          <button class="spring-btn ${toolOptions.blurType === 'pixelate' ? 'pill-badge' : 'icon-btn'}" data-blur-type="pixelate" style="height: 28px; padding: 0 10px; font-size: 11px; width: auto; gap: 6px; display: inline-flex; align-items: center;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Pixelate
          </button>
          <button class="spring-btn ${toolOptions.blurType === 'blur' ? 'pill-badge' : 'icon-btn'}" data-blur-type="blur" style="height: 28px; padding: 0 10px; font-size: 11px; width: auto; gap: 6px; display: inline-flex; align-items: center;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>
            Gaussian
          </button>
        </div>
      `;
    } else if (activeTool === 'shape') {
      const shapeIcons = {
        rect: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
        ellipse: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`,
        line: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/></svg>`,
        arrow: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/></svg>`
      };
      this.inspectorEl.innerHTML = `
        <div class="inspector-group">
          <span class="inspector-label">Shape</span>
          <div style="display: flex; gap: 4px;">
            ${['rect', 'ellipse', 'line', 'arrow'].map((type) => `
              <button class="spring-btn ${toolOptions.shapeType === type ? 'pill-badge' : 'icon-btn'}" data-shape-type="${type}" title="${type}" style="height: 28px; padding: 0 8px; width: 32px; display: inline-flex; align-items: center; justify-content: center;">
                ${shapeIcons[type]}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="toolbar-divider"></div>
        ${this.renderColorGroup(toolOptions.color)}
      `;
    } else {
      // General color & stroke options
      this.inspectorEl.innerHTML = `
        ${this.renderColorGroup(toolOptions.color)}
        <div class="toolbar-divider"></div>
        <div class="inspector-group">
          <span class="inspector-label">Size</span>
          <input type="range" min="1" max="14" value="${toolOptions.strokeWidth || 3}" id="inspector-stroke-slider" style="width: 70px; accent-color: var(--accent-violet);">
        </div>
      `;
    }

    this.bindDynamicEvents();
  }

  renderColorGroup(currentColor) {
    const colors = ['#6D63E6', '#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#FFFFFF', '#121317'];
    return `
      <div class="inspector-group">
        <span class="inspector-label">Color</span>
        <div class="color-swatch-list">
          ${colors.map((c) => `
            <div class="color-swatch ${c === currentColor ? 'active' : ''}" data-color="${c}" style="background-color: ${c};"></div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.store.subscribe((state) => this.update(state));
  }

  bindDynamicEvents() {
    // Aspect preset buttons
    this.inspectorEl.querySelectorAll('[data-aspect]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.setToolOption('aspectPreset', btn.dataset.aspect);
      });
    });

    // Blur type buttons
    this.inspectorEl.querySelectorAll('[data-blur-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.setToolOption('blurType', btn.dataset.blurType);
      });
    });

    // Shape type buttons
    this.inspectorEl.querySelectorAll('[data-shape-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.setToolOption('shapeType', btn.dataset.shapeType);
      });
    });

    // Color swatch clicks
    this.inspectorEl.querySelectorAll('.color-swatch').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        this.store.setToolOption('color', swatch.dataset.color);
      });
    });

    // Stroke width slider
    const slider = this.inspectorEl.querySelector('#inspector-stroke-slider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        this.store.setToolOption('strokeWidth', parseInt(e.target.value, 10));
      });
    }
  }
}
