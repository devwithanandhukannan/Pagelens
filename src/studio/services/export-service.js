/**
 * Pagelens — Export Service
 * Orchestrates PNG, JPEG, and multi-page PDF generation, clipboard copy, and file downloads.
 */

import { exportRenderer } from '../render/export-renderer.js';
import { generatePdfFromCanvas } from '../../workers/pdf-worker.js';
import { encodeCanvas } from '../../workers/encode-worker.js';
import { ClipboardService } from './clipboard.js';
import { DownloadManager } from '../../background/download-manager.js';

export class ExportService {
  static async exportDocument(documentModel, options = {}) {
    const {
      format = 'png', // 'png' | 'jpeg' | 'pdf'
      quality = 0.92,
      destination = 'download', // 'download' | 'clipboard'
      pdfPageSize = 'a4',
      title = documentModel.title || 'Page',
    } = options;

    // 1. Render flattened output canvas (with permanent redactions baked)
    const exportCanvas = exportRenderer.renderToCanvas(documentModel);

    // 2. Handle PDF output
    if (format === 'pdf') {
      const pdfBlob = await generatePdfFromCanvas(exportCanvas, {
        pageSize: pdfPageSize,
        title,
      });

      const filename = DownloadManager.generateFilename(title, 'pdf');
      const dataUrl = URL.createObjectURL(pdfBlob);
      await DownloadManager.downloadDataUrl(dataUrl, filename);
      setTimeout(() => URL.revokeObjectURL(dataUrl), 10000);
      return { format: 'pdf', filename };
    }

    // 3. Handle Image formats (PNG / JPEG)
    const imageBlob = await encodeCanvas(exportCanvas, format, quality);

    if (destination === 'clipboard') {
      await ClipboardService.copyImageBlob(imageBlob);
      return { format, destination: 'clipboard' };
    } else {
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      const filename = DownloadManager.generateFilename(title, ext);
      const dataUrl = URL.createObjectURL(imageBlob);
      await DownloadManager.downloadDataUrl(dataUrl, filename);
      setTimeout(() => URL.revokeObjectURL(dataUrl), 10000);
      return { format, filename, destination: 'download' };
    }
  }
}
