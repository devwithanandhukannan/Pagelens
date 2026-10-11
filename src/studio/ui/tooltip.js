/**
 * Pagelens — Accessible Tooltip Controller
 * Floating tooltips showing keyboard shortcuts and feature hints.
 */

export class TooltipController {
  constructor() {
    this.tooltipEl = null;
    this.init();
  }

  init() {
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.id = 'pagelens-global-tooltip';
    this.tooltipEl.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      background: rgba(18, 19, 23, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif;
      font-size: 11px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 9999px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.15s ease, transform 0.15s ease;
      display: none;
      white-space: nowrap;
    `;
    document.body.appendChild(this.tooltipEl);

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (target) {
        this.show(target.dataset.tooltip, target);
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (target) {
        this.hide();
      }
    });
  }

  show(text, targetEl) {
    this.tooltipEl.textContent = text;
    this.tooltipEl.style.display = 'block';

    const rect = targetEl.getBoundingClientRect();
    const top = rect.top - 28;
    const left = rect.left + rect.width / 2;

    this.tooltipEl.style.top = `${Math.max(8, top)}px`;
    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.transform = 'translateX(-50%) translateY(0)';
    this.tooltipEl.style.opacity = '1';
  }

  hide() {
    this.tooltipEl.style.opacity = '0';
    this.tooltipEl.style.transform = 'translateX(-50%) translateY(4px)';
    setTimeout(() => {
      this.tooltipEl.style.display = 'none';
    }, 150);
  }
}

export const tooltipController = new TooltipController();
