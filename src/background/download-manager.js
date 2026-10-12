/**
 * Pagelens — Download Manager
 * Handles filename formatting, sanitization, and chrome.downloads execution.
 */

export class DownloadManager {
  static sanitizeFilename(name) {
    return name
      .replace(/\.(png|jpg|jpeg|webp|pdf)$/i, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  static generateFilename(title = 'Page', format = 'png') {
    const cleanTitle = this.sanitizeFilename(title);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');

    return `Pagelens_${cleanTitle}_${dateStr}_${timeStr}.${format}`;
  }

  static async downloadDataUrl(dataUrl, filename, promptUser = false) {
    if (typeof chrome !== 'undefined' && chrome.downloads?.download) {
      return new Promise((resolve, reject) => {
        chrome.downloads.download(
          {
            url: dataUrl,
            filename: `Pagelens/${filename}`,
            saveAs: promptUser,
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(downloadId);
            }
          }
        );
      });
    }

    // Web fallback
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }
}
