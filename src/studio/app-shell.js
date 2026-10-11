/**
 * Pagelens — App Shell
 * Coordinates split-pane layout, sidebar navigation, canvas container, and HUD overlays.
 */

import { store } from './core/store.js';
import { eventBus } from './core/event-bus.js';

export class AppShell {
  constructor(rootElement) {
    this.root = rootElement;
    this.render();
    this.bindEvents();
  }

  render() {
    this.root.innerHTML = `
      <div class="studio-app" id="studio-app-root">
        <!-- Collapsible Left Navigation Sidebar -->
        <aside class="studio-sidebar" id="studio-sidebar">
          <div class="sidebar-header">
            <div class="brand-badge">
              <div class="brand-icon" style="background: transparent; overflow: hidden; border-radius: 6px;">
                <img src="../assets/icons/icon-48.png" width="24" height="24" alt="Pagelens Logo" style="display: block; border-radius: 6px; width: 24px; height: 24px;">
              </div>
              <div>
                <h1 class="brand-title">Pagelens</h1>
                <div style="font-size: 10px; color: var(--text-muted); letter-spacing: -0.01em;">Zero-Border Studio</div>
              </div>
            </div>
            <button class="icon-btn spring-btn" id="sidebar-close-btn" title="Collapse Sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          </div>

          <nav class="sidebar-nav">
            <div>
              <div class="sidebar-section-title">Workspace</div>
              <ul class="sidebar-list">
                <li class="sidebar-item active" data-nav="editor">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 15 3-3 3 3"/></svg>
                  Active Capture
                </li>
                <li class="sidebar-item" data-nav="samples">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                  Sample Fixtures
                </li>
              </ul>
            </div>

            <div>
              <div class="sidebar-section-title">Privacy Tools</div>
              <ul class="sidebar-list">
                <li class="sidebar-item" data-nav="redaction">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-crimson);"><rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/></svg>
                  Permanent Redact
                </li>
                <li class="sidebar-item" data-nav="offline">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-mint);"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Zero Network Status
                </li>
              </ul>
            </div>

            <div>
              <div class="sidebar-section-title">Capture Info</div>
              <div style="padding: 8px 12px; background: var(--surface-nested); border-radius: var(--radius-sm); font-size: 11px; display: flex; flex-direction: column; gap: 4px;">
                <div style="color: var(--text-muted); display: flex; justify-content: space-between;">
                  <span>Mode:</span>
                  <strong style="color: var(--text-primary);" id="sidebar-info-mode">Full-Page</strong>
                </div>
                <div style="color: var(--text-muted); display: flex; justify-content: space-between;">
                  <span>Privacy:</span>
                  <strong style="color: var(--accent-mint);">100% Offline</strong>
                </div>
                <div style="color: var(--text-muted); display: flex; justify-content: space-between;">
                  <span>Telemetry:</span>
                  <strong style="color: var(--text-primary);">Zero Bytes</strong>
                </div>
              </div>
            </div>
          </nav>
        </aside>

        <!-- Elevated Studio Sheet (macOS Sonoma Floating Sheet Container) -->
        <main class="studio-workspace-sheet" id="studio-workspace-sheet">
          <!-- Top Bar Container -->
          <div id="topbar-mount"></div>

          <!-- Canvas Container -->
          <div class="studio-canvas-container" id="studio-canvas-container">
            <div id="empty-state-mount"></div>
            <div class="canvas-transform-wrapper" id="canvas-transform-wrapper" style="display: none;">
              <canvas id="pagelens-main-canvas"></canvas>
            </div>
          </div>

          <!-- Contextual Floating Inspector -->
          <div id="inspector-mount"></div>

          <!-- Floating Bottom Toolbar -->
          <div id="toolbar-mount"></div>

          <!-- Toast Container -->
          <div id="toast-mount"></div>

          <!-- Export Sheet Mount -->
          <div id="export-sheet-mount"></div>
        </main>
      </div>
    `;
  }

  bindEvents() {
    const sidebar = document.getElementById('studio-sidebar');
    const closeBtn = document.getElementById('sidebar-close-btn');

    closeBtn.addEventListener('click', () => {
      store.toggleSidebar();
    });

    store.subscribe((state) => {
      sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
    });

    // Sidebar navigation clicks
    this.root.querySelectorAll('.sidebar-item').forEach((item) => {
      item.addEventListener('click', () => {
        this.root.querySelectorAll('.sidebar-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');

        const nav = item.dataset.nav;
        if (nav === 'samples') {
          eventBus.emit('load-sample-capture');
        } else if (nav === 'redaction') {
          store.setActiveTool('redact');
        } else if (nav === 'offline') {
          eventBus.emit('show-toast', {
            message: 'Pagelens operates 100% offline. Zero network calls permitted.',
          });
        }
      });
    });
  }
}
