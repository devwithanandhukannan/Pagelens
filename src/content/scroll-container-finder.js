/**
 * Pagelens — Scroll Container Finder & Frame Coordinator
 */

export function findScrollableContainers() {
  const containers = [];
  const elements = document.querySelectorAll('div, section, main, article, aside');

  for (const el of elements) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50;

    if (isScrollable) {
      containers.push({
        element: el,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        rect: el.getBoundingClientRect(),
      });
    }
  }

  return containers;
}

export function detectIframes() {
  const iframes = Array.from(document.querySelectorAll('iframe'));
  return iframes.map((iframe) => {
    const rect = iframe.getBoundingClientRect();
    let accessible = false;
    try {
      accessible = Boolean(iframe.contentDocument);
    } catch (e) {
      accessible = false;
    }
    return {
      src: iframe.src,
      width: rect.width,
      height: rect.height,
      accessible,
    };
  });
}
