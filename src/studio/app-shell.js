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
                <div style="font-size: 10px; color: var(--text-muted); letter-spacing: -0.01em;">Screenshot Studio</div>
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="12" cy="12" r="3"/></svg>
                  Current Screenshot
                </li>
              </ul>
            </div>

            <div>
              <div class="sidebar-section-title">Quick Actions</div>
              <ul class="sidebar-list">
                <li class="sidebar-item" data-nav="fit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                  Fit to Screen
                </li>
                <li class="sidebar-item" data-nav="clear">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  Clear Markups
                </li>
                <li class="sidebar-item" data-nav="export" style="color: var(--accent-violet);">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export & Share
                </li>
              </ul>
            </div>

            <div>
              <div class="sidebar-section-title">Image Details</div>
              <div style="padding: 10px 12px; background: var(--surface-nested); border-radius: var(--radius-sm); font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
                <div style="color: var(--text-muted); display: flex; justify-content: space-between;">
                  <span>Size:</span>
                  <strong style="color: var(--text-primary); font-family: var(--font-mono);" id="sidebar-info-dims">—</strong>
                </div>
                <div style="color: var(--text-muted); display: flex; justify-content: space-between;">
                  <span>Type:</span>
                  <strong style="color: var(--text-primary);" id="sidebar-info-mode">Capture</strong>
                </div>
                <div style="color: var(--text-muted); display: flex; justify-content: space-between;">
                  <span>Status:</span>
                  <strong style="color: var(--accent-mint);">Ready</strong>
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

          <!-- Base Gradient Blur Scrim for Floating Tool Dock -->
          <div class="studio-dock-scrim" aria-hidden="true"></div>

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
        const nav = item.dataset.nav;
        if (nav === 'editor') {
          this.root.querySelectorAll('.sidebar-item').forEach((i) => i.classList.remove('active'));
          item.classList.add('active');
        } else if (nav === 'fit') {
          eventBus.emit('fit-to-screen');
        } else if (nav === 'clear') {
          eventBus.emit('clear-annotations');
        } else if (nav === 'export') {
          eventBus.emit('open-export-sheet');
        }
      });
    });

    eventBus.on('document-loaded', (doc) => {
      const dimEl = document.getElementById('sidebar-info-dims');
      const modeEl = document.getElementById('sidebar-info-mode');
      if (dimEl) dimEl.textContent = `${doc.width.toLocaleString()} × ${doc.height.toLocaleString()} px`;
      if (modeEl) modeEl.textContent = doc.height > doc.width * 1.3 ? 'Full Page' : 'Visible Area';
    });
  }
}
