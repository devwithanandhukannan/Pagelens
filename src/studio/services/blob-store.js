/**
 * Pagelens — Blob Store (IndexedDB Storage Service)
 * Stores binary screenshot images efficiently off the main thread.
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
    const size = blob?.size || (metadata.size || 0);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id: sessionId,
        blob,
        size,
        timestamp: Date.now(),
        ...metadata,
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });

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
    if (sessionId === undefined || sessionId === null) return true;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      try {
        store.delete(sessionId);
        if (typeof sessionId === 'number') {
          store.delete(String(sessionId));
        } else if (typeof sessionId === 'string' && !isNaN(Number(sessionId)) && sessionId.trim() !== '') {
          store.delete(Number(sessionId));
        }
      } catch (err) {
        console.warn('[BlobStore] store.delete error:', err);
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  static async deleteCaptures(sessionIds) {
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) return true;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const id of sessionIds) {
        if (id !== undefined && id !== null) {
          try {
            store.delete(id);
            if (typeof id === 'number') {
              store.delete(String(id));
            } else if (typeof id === 'string' && !isNaN(Number(id)) && id.trim() !== '') {
              store.delete(Number(id));
            }
          } catch (_) {}
        }
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  static async pruneOldCaptures(maxRetention = 10) {
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

  static async getRecentCaptures(maxCount = 10) {
    try {
      const db = await this.openDB();
      const records = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return records.slice(0, maxCount);
    } catch (e) {
      return [];
    }
  }

  static async getAllCaptures() {
    try {
      const db = await this.openDB();
      const records = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return records;
    } catch (e) {
      return [];
    }
  }

  static async clearAllCaptures() {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }
}
