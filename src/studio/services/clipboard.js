/**
 * Pagelens — Clipboard Service
 * Safely copies image blobs to system clipboard with size safeguards.
 */

import { EDITOR_CONSTANTS } from '../../shared/constants.js';

export class ClipboardService {
  static async copyImageBlob(blob) {
    if (!navigator.clipboard || !navigator.clipboard.write) {
      throw new Error('Clipboard API is not supported in this environment.');
    }

    // Ensure window focus so Chrome does not reject with "Document is not focused"
    if (typeof window !== 'undefined' && window.focus) {
      try {
        window.focus();
      } catch (_) {}
    }

    if (!blob) {
      throw new Error('No image data available to copy.');
    }

    // Ensure blob is image/png (standard requirement for navigator.clipboard)
    let pngBlob = blob;
    if (blob.type !== 'image/png') {
      try {
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        pngBlob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      } catch (e) {
        console.warn('[ClipboardService] PNG conversion fallback:', e);
      }
    }

    // Primary attempt: standard ClipboardItem
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
      ]);
      return true;
    } catch (firstErr) {
      console.warn('[ClipboardService] Direct blob write failed, trying promise wrapper:', firstErr);
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': Promise.resolve(pngBlob) })
        ]);
        return true;
      } catch (secondErr) {
        console.warn('[ClipboardService] Promise write failed, checking for oversized canvas buffer:', secondErr);
        // If image exceeds system clipboard dimension buffer (e.g. gigantic full page), clamp to 4096px
        try {
          const img = new Image();
          const url = URL.createObjectURL(pngBlob);
          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = url;
          });
          URL.revokeObjectURL(url);

          const maxDim = 4096;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            const scale = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const scaledBlob = await new Promise((r) => c.toBlob(r, 'image/png'));

          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': scaledBlob })
          ]);
          return true;
        } catch (finalErr) {
          throw new Error('Clipboard access was blocked by the browser. Please use the Download button.');
        }
      }
    }
  }
}
