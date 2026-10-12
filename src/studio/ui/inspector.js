/**
 * Pagelens — Contextual Inspector UI Component
 * Floats contextually to offer immediate controls based on the selected tool or object.
 * Pure vector icons, rich palette, and custom system color picker.
 */

import { eventBus } from '../core/event-bus.js';
import { documentModel } from '../core/document-model.js';

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
  }  update(state) {
    const { activeTool, toolOptions, selectedObjectId } = state;

    // Do not show color/size inspector for select without object or for eraser
    if ((activeTool === 'select' && !selectedObjectId) || activeTool === 'eraser') {
      this.inspectorEl.classList.remove('visible');
      return;
    }

    this.inspectorEl.classList.add('visible');

    // If an object is selected, determine its current color
    let activeColor = toolOptions.color || '#6D63E6';
    if (selectedObjectId) {
      const selectedObj = documentModel.getAnnotation(selectedObjectId);
      if (selectedObj && selectedObj.color) {
        activeColor = selectedObj.color;
      }
    }

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
    } else if (activeTool === 'emoji') {
      const emojiList = ['😀', '🔥', '🚀', '❤️', '👍', '👎', '⚠️', '❌', '✅', '👀', '💯', '💡', '🐛', '🎯', '👏', '📌', '⭐️', '🎉', '💩', '🔒'];
      const activeEmoji = toolOptions.emoji || '🔥';
      const activeSize = toolOptions.emojiSize || 36;
      this.inspectorEl.innerHTML = `
        <div class="inspector-group">
          <span class="inspector-label">Emoji</span>
          <div class="emoji-picker-row" style="display: flex; gap: 4px; overflow-x: auto; max-width: 320px; padding: 2px;">
            ${emojiList.map(e => `
              <button class="spring-btn ${e === activeEmoji ? 'pill-badge' : 'icon-btn'}" data-emoji="${e}" style="width: 32px; height: 32px; font-size: 18px; padding: 0; display: inline-flex; align-items: center; justify-content: center;" title="${e}">
                ${e}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="toolbar-divider"></div>
        <div class="inspector-group">
          <span class="inspector-label">Size</span>
          <input type="range" min="20" max="64" value="${activeSize}" id="inspector-emoji-size-slider" style="width: 70px; accent-color: var(--accent-violet);">
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
        ${this.renderColorGroup(activeColor)}
      `;
    } else {
      // General color & stroke options
      this.inspectorEl.innerHTML = `
        ${this.renderColorGroup(activeColor)}
        <div class="toolbar-divider"></div>
        <div class="inspector-group">
          <span class="inspector-label">Size</span>
          <input type="range" min="1" max="16" value="${toolOptions.strokeWidth || 3}" id="inspector-stroke-slider" style="width: 70px; accent-color: var(--accent-violet);">
        </div>
      `;
    }

    this.bindDynamicEvents();
  }

  renderColorGroup(currentColor) {
    const presetColors = ['#6D63E6', '#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#EC4899', '#FFFFFF', '#121317'];
    const isPreset = presetColors.some(c => c.toLowerCase() === (currentColor || '').toLowerCase());

    return `
      <div class="inspector-group">
        <span class="inspector-label">Color</span>
        <div class="color-swatch-list">
          ${presetColors.map((c) => `
            <div class="color-swatch ${c.toLowerCase() === (currentColor || '').toLowerCase() ? 'active' : ''}" data-color="${c}" style="background-color: ${c};" title="${c}"></div>
          `).join('')}
          
          <!-- Universal Color Picker Swatch -->
          <label class="color-swatch custom-color-picker-wrapper ${!isPreset ? 'active custom-active' : ''}" title="Choose custom color" style="${!isPreset ? `background-color: ${currentColor};` : ''}">
            <input type="color" id="inspector-color-picker" class="custom-color-input" value="${currentColor || '#6D63E6'}" aria-label="Custom Color Picker" />
            <svg class="picker-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </label>
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

    // Preset color swatch clicks
    this.inspectorEl.querySelectorAll('.color-swatch[data-color]').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const selectedColor = swatch.dataset.color;
        this.store.setToolOption('color', selectedColor);
        const { selectedObjectId } = this.store.getState();
        if (selectedObjectId) {
          documentModel.updateAnnotation(selectedObjectId, { color: selectedColor });
        }
      });
    });

    // Custom Color Picker input
    const colorPicker = this.inspectorEl.querySelector('#inspector-color-picker');
    if (colorPicker) {
      const handleColorChange = (e) => {
        const newColor = e.target.value;
        this.store.setToolOption('color', newColor);
        const { selectedObjectId } = this.store.getState();
        if (selectedObjectId) {
          documentModel.updateAnnotation(selectedObjectId, { color: newColor });
        }
      };
      colorPicker.addEventListener('input', handleColorChange);
      colorPicker.addEventListener('change', handleColorChange);
    }

    // Stroke width slider
    const slider = this.inspectorEl.querySelector('#inspector-stroke-slider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        const width = parseInt(e.target.value, 10);
        this.store.setToolOption('strokeWidth', width);
        const { selectedObjectId } = this.store.getState();
        if (selectedObjectId) {
          documentModel.updateAnnotation(selectedObjectId, { strokeWidth: width, fontSize: width * 4 });
        }
      });
    }

    // Emoji picker buttons
    this.inspectorEl.querySelectorAll('[data-emoji]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const selectedEmoji = btn.dataset.emoji;
        this.store.setToolOption('emoji', selectedEmoji);
        this.inspectorEl.querySelectorAll('[data-emoji]').forEach((b) => {
          b.classList.toggle('pill-badge', b.dataset.emoji === selectedEmoji);
          b.classList.toggle('icon-btn', b.dataset.emoji !== selectedEmoji);
        });
        const { selectedObjectId } = this.store.getState();
        if (selectedObjectId) {
          documentModel.updateAnnotation(selectedObjectId, { emoji: selectedEmoji });
        }
      });
    });

    // Emoji size slider
    const emojiSlider = this.inspectorEl.querySelector('#inspector-emoji-size-slider');
    if (emojiSlider) {
      emojiSlider.addEventListener('input', (e) => {
        const size = parseInt(e.target.value, 10);
        this.store.setToolOption('emojiSize', size);
        const { selectedObjectId } = this.store.getState();
        if (selectedObjectId) {
          documentModel.updateAnnotation(selectedObjectId, { size, width: size, height: size });
        }
      });
    }
  }
}
