/**
 * Pagelens — Lazy-Load Primer
 * Rapidly traverses the document to trigger IntersectionObserver, lazy image downloads, and network settling.
 */

export async function primeLazyLoading(scrollHeight, viewportHeight, chunkStep = 800) {
  const originalScrollY = window.scrollY || window.pageYOffset || 0;
  let currentY = 0;

  // Rapidly sweep through page to trigger lazy observers
  while (currentY < scrollHeight) {
    window.scrollTo({ left: 0, top: currentY, behavior: 'instant' });
    currentY += chunkStep;
    await new Promise((r) => setTimeout(r, 40));
  }

  // Scroll to bottom
  window.scrollTo({ left: 0, top: scrollHeight, behavior: 'instant' });
  await new Promise((r) => setTimeout(r, 80));

  // Await pending image decode promises if supported
  const images = Array.from(document.images);
  const pendingDecodes = images
    .filter((img) => !img.complete && img.src)
    .slice(0, 30)
    .map((img) => img.decode().catch(() => {}));

  if (pendingDecodes.length > 0) {
    await Promise.race([
      Promise.all(pendingDecodes),
      new Promise((r) => setTimeout(r, 600))
    ]);
  }

  // Return to top for start of capture
  window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
  await new Promise((r) => setTimeout(r, 80));

  return true;
}
