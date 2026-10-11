/**
 * Pagelens — Tile Manager
 * Manages virtualized rendering for ultra-tall screenshots (up to 32,000px) with LRU memory caching.
 */

import { planTiles } from '../../workers/tiling-planner.js';

export class TileManager {
  constructor(maxCacheSize = 24) {
    this.maxCacheSize = maxCacheSize;
    this.tileCache = new Map(); // tileId -> HTMLCanvasElement / ImageBitmap
    this.planner = null;
  }

  initialize(totalWidth, totalHeight) {
    this.planner = planTiles(totalWidth, totalHeight);
    this.clear();
  }

  getVisibleTiles(viewport, containerRect) {
    if (!this.planner) return [];

    const margin = 200; // preload buffer
    const viewTop = -viewport.panY / viewport.zoom - margin;
    const viewBottom = (-viewport.panY + containerRect.height) / viewport.zoom + margin;
    const viewLeft = -viewport.panX / viewport.zoom - margin;
    const viewRight = (-viewport.panX + containerRect.width) / viewport.zoom + margin;

    return this.planner.tiles.filter((tile) => {
      return (
        tile.x + tile.width >= viewLeft &&
        tile.x <= viewRight &&
        tile.y + tile.height >= viewTop &&
        tile.y <= viewBottom
      );
    });
  }

  cacheTile(tileId, bitmap) {
    if (this.tileCache.size >= this.maxCacheSize) {
      // LRU eviction
      const oldestKey = this.tileCache.keys().next().value;
      const evicted = this.tileCache.get(oldestKey);
      if (evicted?.close) evicted.close();
      this.tileCache.delete(oldestKey);
    }
    this.tileCache.set(tileId, bitmap);
  }

  getTile(tileId) {
    if (this.tileCache.has(tileId)) {
      const tile = this.tileCache.get(tileId);
      // Re-insert to keep MRU order
      this.tileCache.delete(tileId);
      this.tileCache.set(tileId, tile);
      return tile;
    }
    return null;
  }

  clear() {
    for (const [, bmp] of this.tileCache) {
      if (bmp?.close) bmp.close();
    }
    this.tileCache.clear();
  }
}

export const tileManager = new TileManager();
