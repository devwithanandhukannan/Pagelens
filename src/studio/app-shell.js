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
        <!-- Elevated Studio Sheet (macOS Sonoma Floating Sheet Container) -->
        <main class="studio-workspace-sheet full-width" id="studio-workspace-sheet">
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

          <!-- Settings Modal Mount -->
          <div id="settings-modal-mount"></div>
        </main>
      </div>
    `;
  }

  bindEvents() {
    // Top-level workspace keyboard shortcuts or global handlers if needed
  }
}
