/**
 * Occlusion Culling & Spatial Partitioning Utility (Vanilla JS)
 * High-performance spatial indexing and frustum culling for large levels.
 * Prevents memory thrashing and unnecessary render/physics calculations.
 */

import { TILE_SIZE } from '../constants/gameDefaults.js';

/**
 * Creates a spatial grid bucket index from an array of level objects.
 * Bucket size defaults to 16 tiles (768px wide).
 */
export function createSpatialIndex(objects, bucketTileWidth = 16) {
  try {
    const buckets = new Map();
    const safeBucketWidth = (typeof bucketTileWidth === 'number' && bucketTileWidth > 0) ? bucketTileWidth : 16;
    if (!Array.isArray(objects)) return { buckets, bucketTileWidth: safeBucketWidth, totalObjects: 0 };

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (!obj || typeof obj.x !== 'number' || isNaN(obj.x)) continue;
      const bucketIdx = Math.floor(obj.x / safeBucketWidth);
      let bucket = buckets.get(bucketIdx);
      if (!bucket) {
        bucket = [];
        buckets.set(bucketIdx, bucket);
      }
      bucket.push(obj);
    }

    return {
      buckets,
      bucketTileWidth: safeBucketWidth,
      totalObjects: objects.length
    };
  } catch (err) {
    console.error('Error in createSpatialIndex:', err);
    return { buckets: new Map(), bucketTileWidth: 16, totalObjects: 0 };
  }
}

/**
 * Retrieves only objects within the visible camera viewport plus buffer margins.
 * @param {Array|Object} source - Level objects array or spatial index
 * @param {number} cameraX - World camera X position in pixels
 * @param {number} viewWidth - Viewport width in pixels
 * @param {number} effectiveTile - Current rendered tile size in pixels (accounting for zoom)
 * @param {number} bufferTiles - Preload safety margin on left and right (default 8 tiles)
 */
export function getVisibleObjects(source, cameraX, viewWidth, effectiveTile = TILE_SIZE, bufferTiles = 8) {
  try {
    if (!source) return [];

    const safeCamX = typeof cameraX === 'number' && !isNaN(cameraX) ? cameraX : 0;
    const safeWidth = typeof viewWidth === 'number' && !isNaN(viewWidth) && viewWidth > 0 ? viewWidth : 800;
    const safeTile = typeof effectiveTile === 'number' && !isNaN(effectiveTile) && effectiveTile > 0 ? effectiveTile : TILE_SIZE;
    const safeBuffer = typeof bufferTiles === 'number' && !isNaN(bufferTiles) ? bufferTiles : 8;

    // If source is a spatial index with buckets Map
    if (source && source.buckets instanceof Map) {
      const { buckets, bucketTileWidth } = source;
      const safeBWidth = bucketTileWidth || 16;
      const leftTile = Math.max(0, Math.floor((safeCamX - safeBuffer * safeTile) / safeTile));
      const rightTile = Math.floor((safeCamX + safeWidth + safeBuffer * safeTile) / safeTile);

      const startBucket = Math.floor(leftTile / safeBWidth);
      const endBucket = Math.floor(rightTile / safeBWidth);

      const result = [];
      for (let b = startBucket; b <= endBucket; b++) {
        const bucket = buckets.get(b);
        if (Array.isArray(bucket)) {
          for (let i = 0; i < bucket.length; i++) {
            const obj = bucket[i];
            if (obj && typeof obj.x === 'number' && obj.x >= leftTile && obj.x <= rightTile) {
              result.push(obj);
            }
          }
        }
      }
      return result;
    }

    // Direct scan on array with safe bounds check
    if (Array.isArray(source)) {
      const leftBound = safeCamX - safeBuffer * safeTile;
      const rightBound = safeCamX + safeWidth + safeBuffer * safeTile;
      const result = [];

      for (let i = 0; i < source.length; i++) {
        const obj = source[i];
        if (!obj || typeof obj.x !== 'number' || isNaN(obj.x)) continue;
        const objPx = obj.x * safeTile;
        if (objPx >= leftBound && objPx <= rightBound) {
          result.push(obj);
        }
      }
      return result;
    }

    return [];
  } catch (err) {
    console.error('Error in getVisibleObjects:', err);
    return Array.isArray(source) ? source : [];
  }
}

/**
 * Physics vicinity culling: Returns only objects within collision range of the player entity.
 * @param {Array} objects - Level objects array
 * @param {number} playerX - Player world X in pixels
 * @param {number} radiusPx - Distance radius in pixels (default 320px)
 */
export function getPhysicsNearbyObjects(objects, playerX, radiusPx = 320) {
  try {
    if (!Array.isArray(objects)) return [];
    const safePlayerX = typeof playerX === 'number' && !isNaN(playerX) ? playerX : 0;
    const safeRadius = typeof radiusPx === 'number' && !isNaN(radiusPx) && radiusPx > 0 ? radiusPx : 320;
    const minX = safePlayerX - safeRadius;
    const maxX = safePlayerX + safeRadius;

    const nearby = [];
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (!obj || typeof obj.x !== 'number' || isNaN(obj.x)) continue;
      const px = obj.x * TILE_SIZE;
      if (px >= minX && px <= maxX) {
        nearby.push(obj);
      }
    }

    return nearby;
  } catch (err) {
    console.error('Error in getPhysicsNearbyObjects:', err);
    return Array.isArray(objects) ? objects : [];
  }
}
