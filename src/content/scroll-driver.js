/**
 * Pagelens — Scroll Driver
 * Drives smooth, verified viewport scrolls to designated targets.
 */

export async function scrollToPosition(targetX, targetY, delayMs = 120) {
  return new Promise((resolve) => {
    // Force instantaneous scroll
    window.scrollTo({
      left: targetX,
      top: targetY,
      behavior: 'instant'
    });

    // Double RAF plus micro-delay to ensure layout engine and paints settle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const actualX = window.scrollX || window.pageXOffset || 0;
          const actualY = window.scrollY || window.pageYOffset || 0;
          resolve({
            actualX,
            actualY,
            reachedTarget: Math.abs(actualY - targetY) < 3,
          });
        }, delayMs);
      });
    });
  });
}
