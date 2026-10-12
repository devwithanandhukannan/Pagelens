/**
 * Pagelens — Contextual Inspector UI Component
 * Floats contextually to offer immediate controls based on the selected tool or object.
 * Pure vector icons, rich compact palette, size scaler for shapes, and categorized emoji picker.
 */

import { eventBus } from '../core/event-bus.js';
import { documentModel } from '../core/document-model.js';

export class Inspector {
  constructor(container, store) {
    this.container = container;
    this.store = store;
    this.isEmojiPickerOpen = false;
    this.activeEmojiCategory = 'smileys';
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

    // Do not show inspector for select without object or for eraser
    if ((activeTool === 'select' && !selectedObjectId) || activeTool === 'eraser') {
      this.inspectorEl.classList.remove('visible');
      this.isEmojiPickerOpen = false;
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
      const quickEmojis = ['😀', '🔥', '🚀', '❤️', '👍', '👎', '⚠️', '✅', '💡', '🎯'];
      const activeEmoji = toolOptions.emoji || '🔥';
      const activeSize = toolOptions.emojiSize || 36;

      this.inspectorEl.innerHTML = `
        <div class="inspector-group" style="position: relative;">
          <span class="inspector-label">Emoji</span>
          <div class="emoji-quick-row" style="display: flex; align-items: center; gap: 3px;">
            ${quickEmojis.map(e => `
              <button class="emoji-quick-btn ${e === activeEmoji ? 'active' : ''}" data-emoji="${e}" title="${e}">
                ${e}
              </button>
            `).join('')}
            <button class="emoji-more-btn spring-btn" id="btn-emoji-more" title="View all emojis">
              <span>+ More</span>
            </button>
          </div>

          <!-- Full Categorized Emoji Picker Popover -->
          <div class="emoji-picker-popover" id="emoji-picker-popover" style="display: ${this.isEmojiPickerOpen ? 'flex' : 'none'};">
            <div class="emoji-popover-tabs">
              <button class="emoji-tab-btn ${this.activeEmojiCategory === 'smileys' ? 'active' : ''}" data-tab="smileys">Faces</button>
              <button class="emoji-tab-btn ${this.activeEmojiCategory === 'gestures' ? 'active' : ''}" data-tab="gestures">Hands</button>
              <button class="emoji-tab-btn ${this.activeEmojiCategory === 'symbols' ? 'active' : ''}" data-tab="symbols">Symbols</button>
              <button class="emoji-tab-btn ${this.activeEmojiCategory === 'objects' ? 'active' : ''}" data-tab="objects">Objects</button>
            </div>
            <div class="emoji-popover-grid" id="emoji-popover-grid">
              ${this.getCategoryEmojis(this.activeEmojiCategory).map(e => `
                <button class="emoji-grid-item" data-emoji="${e}" title="${e}">${e}</button>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="toolbar-divider"></div>
        <div class="inspector-group">
          <span class="inspector-label">Size</span>
          <input type="range" min="20" max="64" value="${activeSize}" id="inspector-emoji-size-slider" class="inspector-mini-slider" style="width: 52px; accent-color: var(--accent-violet);">
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
        <div class="toolbar-divider"></div>
        <div class="inspector-group">
          <span class="inspector-label">Size</span>
          <input type="range" min="1" max="16" value="${toolOptions.strokeWidth || 3}" id="inspector-stroke-slider" class="inspector-mini-slider" style="width: 52px; accent-color: var(--accent-violet);">
        </div>
      `;
    } else {
      // General color & stroke options
      this.inspectorEl.innerHTML = `
        ${this.renderColorGroup(activeColor)}
        <div class="toolbar-divider"></div>
        <div class="inspector-group">
          <span class="inspector-label">Size</span>
          <input type="range" min="1" max="16" value="${toolOptions.strokeWidth || 3}" id="inspector-stroke-slider" class="inspector-mini-slider" style="width: 52px; accent-color: var(--accent-violet);">
        </div>
      `;
    }

    this.bindDynamicEvents();
  }

  getCategoryEmojis(category) {
    switch (category) {
      case 'smileys':
        return ['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','☺️','😊','😇','🙂','😉','😍','🥰','😘','😋','😛','😜','🤪','😎','🥳','🤩','🤔','🤫','🤭','🤗','😱','🥵','🥶','🥺','😢','😭','😤','🤯','💩','🤡','👻','👽','🤖'];
      case 'gestures':
        return ['👍','👎','👏','🙌','👐','🤲','🤝','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐','🖖','👋','💪','🦾','✍️','🙏','💅','👑'];
      case 'symbols':
        return ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','✅','❌','⭕️','🛑','⛔️','🚫','⚠️','🚨','❓','❗️','💯','♨️','💥','⚡️','✨','🌟','⭐️','💫','🌈'];
      case 'objects':
      default:
        return ['🔥','🚀','💡','🐛','🎯','📌','📍','🏆','🥇','🎖','🎗','🎨','🎬','🎤','🎧','🎼','🎹','🎲','🎮','📱','💻','🖥','📷','📺','⏰','⏳','💰','💎','🔑','🔒','✉️','📦','🎉','🎈','🪄'];
    }
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
            <svg class="picker-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </label>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.store.subscribe((state) => this.update(state));

    // Close emoji popover when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isEmojiPickerOpen && !e.target.closest('#emoji-picker-popover') && !e.target.closest('#btn-emoji-more')) {
        this.isEmojiPickerOpen = false;
        const pop = document.getElementById('emoji-picker-popover');
        if (pop) pop.style.display = 'none';
      }
    });
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

    // Emoji "+ More" button
    const moreBtn = this.inspectorEl.querySelector('#btn-emoji-more');
    const popover = this.inspectorEl.querySelector('#emoji-picker-popover');
    if (moreBtn && popover) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isEmojiPickerOpen = !this.isEmojiPickerOpen;
        popover.style.display = this.isEmojiPickerOpen ? 'flex' : 'none';
      });
    }

    // Emoji tabs
    this.inspectorEl.querySelectorAll('.emoji-tab-btn').forEach((tabBtn) => {
      tabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeEmojiCategory = tabBtn.dataset.tab;
        this.inspectorEl.querySelectorAll('.emoji-tab-btn').forEach(b => b.classList.toggle('active', b === tabBtn));
        const grid = this.inspectorEl.querySelector('#emoji-popover-grid');
        if (grid) {
          grid.innerHTML = this.getCategoryEmojis(this.activeEmojiCategory).map(emoji => `
            <button class="emoji-grid-item" data-emoji="${emoji}" title="${emoji}">${emoji}</button>
          `).join('');
          this.bindEmojiGridClicks();
        }
      });
    });

    // Quick emoji buttons
    this.inspectorEl.querySelectorAll('.emoji-quick-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const selectedEmoji = btn.dataset.emoji;
        this.selectEmoji(selectedEmoji);
      });
    });

    this.bindEmojiGridClicks();

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

  bindEmojiGridClicks() {
    this.inspectorEl.querySelectorAll('.emoji-grid-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedEmoji = btn.dataset.emoji;
        this.selectEmoji(selectedEmoji);
        this.isEmojiPickerOpen = false;
        const pop = document.getElementById('emoji-picker-popover');
        if (pop) pop.style.display = 'none';
      });
    });
  }

  selectEmoji(selectedEmoji) {
    this.store.setToolOption('emoji', selectedEmoji);
    this.inspectorEl.querySelectorAll('.emoji-quick-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.emoji === selectedEmoji);
    });
    const { selectedObjectId } = this.store.getState();
    if (selectedObjectId) {
      documentModel.updateAnnotation(selectedObjectId, { emoji: selectedEmoji });
    }
  }
}
