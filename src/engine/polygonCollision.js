/**
 * High-Performance 2D Polygon Collision Engine (Vanilla JS).
 * Supports:
 * - Polygon vs Polygon collision (Separating Axis Theorem + edge intersection)
 * - Polygon vs AABB Box collision
 * - Point in Polygon (Ray-casting test)
 * - Coordinate transformation with translation, scaling, and rotation
 * - Comprehensive error checking on all inputs
 */

/**
 * Checks if a point is inside a polygon using ray casting algorithm.
 * @param {number} px Point X
 * @param {number} py Point Y
 * @param {Array<{x: number, y: number}>} polygon Array of vertices
 * @returns {boolean}
 */
export function pointInPolygon(px, py, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;
  if (typeof px !== 'number' || typeof py !== 'number' || isNaN(px) || isNaN(py)) return false;

  let inside = false;
  const len = polygon.length;
  for (let i = 0, j = len - 1; i < len; j = i++) {
    const xi = polygon[i]?.x ?? 0;
    const yi = polygon[i]?.y ?? 0;
    const xj = polygon[j]?.x ?? 0;
    const yj = polygon[j]?.y ?? 0;

    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi || 0.00001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates the bounding box of a transformed polygon.
 * @param {Array<{x: number, y: number}>} vertices
 * @returns {{minX: number, maxX: number, minY: number, maxY: number, width: number, height: number}}
 */
export function getPolygonBounds(vertices) {
  if (!Array.isArray(vertices) || vertices.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < vertices.length; i++) {
    const pt = vertices[i];
    if (!pt) continue;
    const x = typeof pt.x === 'number' && !isNaN(pt.x) ? pt.x : 0;
    const y = typeof pt.y === 'number' && !isNaN(pt.y) ? pt.y : 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  if (minX === Infinity) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Transforms normalized (0..1) polygon vertices into world-space coordinates.
 * @param {Array<{x: number, y: number}>} normalizedPoints 
 * @param {number} worldX 
 * @param {number} worldY 
 * @param {number} width 
 * @param {number} height 
 * @param {number} rotation Angle in radians (optional)
 * @param {number} scaleX (optional, e.g. -1 for flipped facing)
 * @param {number} scaleY (optional, e.g. -1 for gravity flip)
 * @returns {Array<{x: number, y: number}>}
 */
export function transformPolygon(normalizedPoints, worldX, worldY, width, height, rotation = 0, scaleX = 1, scaleY = 1) {
  if (!Array.isArray(normalizedPoints) || normalizedPoints.length === 0) {
    // Fallback to standard 4-point bounding box
    return [
      { x: worldX, y: worldY },
      { x: worldX + width, y: worldY },
      { x: worldX + width, y: worldY + height },
      { x: worldX, y: worldY + height }
    ];
  }

  const cx = worldX + width / 2;
  const cy = worldY + height / 2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const result = [];
  for (let i = 0; i < normalizedPoints.length; i++) {
    const pt = normalizedPoints[i];
    if (!pt) continue;
    const nx = typeof pt.x === 'number' && !isNaN(pt.x) ? pt.x : 0;
    const ny = typeof pt.y === 'number' && !isNaN(pt.y) ? pt.y : 0;

    // Center-relative offsets before rotation and scaling
    const localX = (nx - 0.5) * width * scaleX;
    const localY = (ny - 0.5) * height * scaleY;

    // Apply rotation around center
    const rotX = localX * cos - localY * sin;
    const rotY = localX * sin + localY * cos;

    result.push({
      x: cx + rotX,
      y: cy + rotY
    });
  }

  return result.length >= 3 ? result : [
    { x: worldX, y: worldY },
    { x: worldX + width, y: worldY },
    { x: worldX + width, y: worldY + height },
    { x: worldX, y: worldY + height }
  ];
}

/**
 * Checks if two line segments (p1-p2 and p3-p4) intersect.
 */
function lineSegmentsIntersect(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 0.000001) return false;

  const u = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const v = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;

  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

/**
 * Projects a polygon onto an axis and returns [min, max].
 */
function projectPolygon(axis, polygon) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const dot = polygon[i].x * axis.x + polygon[i].y * axis.y;
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }
  return { min, max };
}

/**
 * Checks if two convex/general polygons intersect using SAT with edge-intersection and containment fallback.
 * @param {Array<{x: number, y: number}>} polyA Transformed world vertices
 * @param {Array<{x: number, y: number}>} polyB Transformed world vertices
 * @returns {boolean}
 */
export function checkPolygonCollision(polyA, polyB) {
  if (!Array.isArray(polyA) || polyA.length < 3 || !Array.isArray(polyB) || polyB.length < 3) {
    return false;
  }

  // 1. Fast AABB Bounding Box pre-filter
  const boundsA = getPolygonBounds(polyA);
  const boundsB = getPolygonBounds(polyB);

  if (
    boundsA.maxX < boundsB.minX ||
    boundsA.minX > boundsB.maxX ||
    boundsA.maxY < boundsB.minY ||
    boundsA.minY > boundsB.maxY
  ) {
    return false;
  }

  // 2. Check if any edges intersect
  const lenA = polyA.length;
  const lenB = polyB.length;

  for (let i = 0; i < lenA; i++) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % lenA];

    for (let j = 0; j < lenB; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % lenB];

      if (lineSegmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }

  // 3. Check for total containment (polyA inside polyB or polyB inside polyA)
  if (pointInPolygon(polyA[0].x, polyA[0].y, polyB)) {
    return true;
  }
  if (pointInPolygon(polyB[0].x, polyB[0].y, polyA)) {
    return true;
  }

  // 4. Separating Axis Theorem pass
  const getAxes = (poly) => {
    const axes = [];
    const len = poly.length;
    for (let i = 0; i < len; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % len];
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const normal = { x: -edge.y, y: edge.x };
      const mag = Math.hypot(normal.x, normal.y);
      if (mag > 0.0001) {
        axes.push({ x: normal.x / mag, y: normal.y / mag });
      }
    }
    return axes;
  };

  const axes = [...getAxes(polyA), ...getAxes(polyB)];
  for (let k = 0; k < axes.length; k++) {
    const axis = axes[k];
    const projA = projectPolygon(axis, polyA);
    const projB = projectPolygon(axis, polyB);

    if (projA.max < projB.min || projB.max < projA.min) {
      return false; // Found separating axis
    }
  }

  return true;
}

/**
 * Checks collision between a polygon and an Axis-Aligned Bounding Box (AABB).
 * @param {Array<{x: number, y: number}>} poly Transformed vertices
 * @param {{x: number, y: number, width: number, height: number}} box
 * @returns {boolean}
 */
export function checkPolygonVsAABB(poly, box) {
  if (!Array.isArray(poly) || poly.length < 3 || !box) return false;
  const boxPoly = [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height }
  ];
  return checkPolygonCollision(poly, boxPoly);
}
