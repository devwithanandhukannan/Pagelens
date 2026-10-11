/**
 * Pagelens — Shared Blob Store (IndexedDB Storage Service)
 * Stores large binary screenshot images efficiently off the main thread in IndexedDB.
 * Unlimited quota and zero main-thread serialization cost.
 */

const DB_NAME = 'PagelensBlobStore';
const STORE_NAME = 'captures';
const DB_VERSION = 1;

export class BlobStore {
  static async openDB() {
    return new Promise((resolve, reject) => {
      const idb = typeof indexedDB !== 'undefined' ? indexedDB : (typeof self !== 'undefined' ? self.indexedDB : null);
      if (!idb) {
        return reject(new Error('IndexedDB is not available in current execution context.'));
      }
      const request = idb.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async saveCapture(sessionId, blob, metadata = {}) {
    const db = await this.openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id: sessionId,
        blob,
        timestamp: Date.now(),
        ...metadata,
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });

    // Asynchronously prune older captures in the background without blocking
    this.pruneOldCaptures().catch(() => {});
    return true;
  }

  static async getCapture(sessionId) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(sessionId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  static async removeCapture(sessionId) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(sessionId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  static async pruneOldCaptures(maxRetention = 12) {
    try {
      const db = await this.openDB();
      const records = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      if (records.length > maxRetention) {
        records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const toDelete = records.slice(maxRetention);
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const r of toDelete) {
          if (r.id) store.delete(r.id);
        }
      }
    } catch (e) {
      // Non-critical background maintenance
    }
  }
}
