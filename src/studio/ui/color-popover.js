/**
 * Pagelens — Color Popover Component
 * Curated palette plus custom hex color picker adhering to Zero-Border principles.
 */

import { eventBus } from '../core/event-bus.js';

export class ColorPopover {
  constructor(anchorElement, onSelectColor) {
    this.anchor = anchorElement;
    this.onSelect = onSelectColor;
    this.popoverEl = null;
  }

  show() {
    this.popoverEl = document.createElement('div');
    this.popoverEl.className = 'studio-color-popover';
    this.popoverEl.style.cssText = `
      position: absolute;
      z-index: 1000;
      background: var(--surface-glass);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-radius: var(--radius-card);
      padding: var(--space-3);
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    const colors = [
      '#6D63E6', '#8B5CF6', '#10B981', '#3DDC97',
      '#EF4444', '#F59E0B', '#3B82F6', '#EC4899',
      '#FFFFFF', '#94A3B8', '#1F2026', '#000000'
    ];

    this.popoverEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
        ${colors.map(c => `
          <div class="color-swatch spring-btn" data-color="${c}" style="background-color: ${c}; width: 22px; height: 22px; border-radius: 9999px; cursor: pointer;"></div>
        `).join('')}
      </div>
      <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
        <span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">#</span>
        <input type="text" id="custom-hex-input" placeholder="HEX" maxlength="7" style="width: 70px; background: var(--surface-nested); border: none; border-radius: 6px; padding: 2px 6px; font-family: var(--font-mono); font-size: 11px; color: var(--text-primary); outline: none;">
      </div>
    `;

    document.body.appendChild(this.popoverEl);

    // Position popover
    const rect = this.anchor.getBoundingClientRect();
    this.popoverEl.style.top = `${rect.bottom + 8}px`;
    this.popoverEl.style.left = `${rect.left}px`;

    // Bind swatch clicks
    this.popoverEl.querySelectorAll('[data-color]').forEach(swatch => {
      swatch.addEventListener('click', () => {
        this.onSelect(swatch.dataset.color);
        this.close();
      });
    });

    const hexInput = this.popoverEl.querySelector('#custom-hex-input');
    hexInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = hexInput.value.startsWith('#') ? hexInput.value : `#${hexInput.value}`;
        this.onSelect(val);
        this.close();
      }
    });

    // Close on outside click
    setTimeout(() => {
      window.addEventListener('click', this.onWindowClick, { once: true });
    }, 10);
  }

  onWindowClick = (e) => {
    if (this.popoverEl && !this.popoverEl.contains(e.target)) {
      this.close();
    }
  };

  close() {
    if (this.popoverEl && this.popoverEl.parentNode) {
      this.popoverEl.parentNode.removeChild(this.popoverEl);
      this.popoverEl = null;
    }
  }
}
