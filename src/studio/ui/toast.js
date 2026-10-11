/**
 * Pagelens — Toast HUD UI Component
 * Floating glassmorphism pill toast with spring entrance, vector SVG icons, and optional undo action.
 */

import { eventBus } from '../core/event-bus.js';
import { history } from '../core/history.js';

export class Toast {
  constructor(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="hud-toast-container" id="hud-toast-container" role="status" aria-live="polite"></div>
    `;
    this.toastBox = document.getElementById('hud-toast-container');
  }

  show(message, options = {}) {
    const { duration = 3200, showUndo = false, icon = null } = options;

    let iconSvg;
    if (icon === 'redact' || message.toLowerCase().includes('redact')) {
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-crimson)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    } else if (icon === 'check' || message.toLowerCase().includes('saved') || message.toLowerCase().includes('copied')) {
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-mint)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else {
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-violet)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>`;
    }

    const toastEl = document.createElement('div');
    toastEl.className = 'hud-toast';
    toastEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        ${iconSvg}
        <span>${message}</span>
      </div>
      ${showUndo ? `<button class="toast-undo-btn spring-btn">Undo</button>` : ''}
    `;

    if (showUndo) {
      toastEl.querySelector('.toast-undo-btn').addEventListener('click', () => {
        history.undo();
        this.dismiss(toastEl);
      });
    }

    this.toastBox.appendChild(toastEl);

    setTimeout(() => {
      this.dismiss(toastEl);
    }, duration);
  }

  dismiss(toastEl) {
    if (!toastEl || !toastEl.parentNode) return;
    toastEl.style.animation = 'toast-spring-out 0.24s var(--ease-spring) forwards';
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    }, 240);
  }

  bindEvents() {
    eventBus.on('show-toast', ({ message, options }) => {
      this.show(message, options);
    });

    eventBus.on('redaction-applied', () => {
      this.show('Redaction layer added — Permanent on export', { showUndo: true, icon: 'redact' });
    });
  }
}
