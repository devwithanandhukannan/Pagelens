/**
 * Pagelens — Motion Freezer
 * Halts CSS animations, transitions, and smooth scrolling for a crisp, stable capture
 * without interfering with media playback (YouTube, podcasts, background music).
 */

let styleElement = null;

export function freezeMotion() {
  if (styleElement) return;

  styleElement = document.createElement('style');
  styleElement.id = 'pagelens-freeze-styles';
  styleElement.textContent = `
    *, *::before, *::after {
      animation-play-state: paused !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
    html, body {
      scroll-behavior: auto !important;
    }
  `;
  document.head.appendChild(styleElement);
}

export function unfreezeMotion() {
  if (styleElement && styleElement.parentNode) {
    styleElement.parentNode.removeChild(styleElement);
    styleElement = null;
  }
}

