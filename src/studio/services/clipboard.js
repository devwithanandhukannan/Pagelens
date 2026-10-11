/**
 * Pagelens — Clipboard Service
 * Safely copies image blobs to system clipboard with size safeguards.
 */

import { EDITOR_CONSTANTS } from '../../shared/constants.js';

export class ClipboardService {
  static async copyImageBlob(blob) {
    if (!navigator.clipboard?.write) {
      throw new Error('Clipboard API is not supported in this browser.');
    }

    if (blob.size > EDITOR_CONSTANTS.CLIPBOARD_MAX_BYTES) {
      throw new Error('Image exceeds system clipboard limit (45MB). Please use Download instead.');
    }

    // Modern browsers require image/png for clipboard write
    let pngBlob = blob;
    if (blob.type !== 'image/png') {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      pngBlob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': pngBlob,
      }),
    ]);

    return true;
  }
}
