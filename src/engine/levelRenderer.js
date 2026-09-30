/**
 * Level and Environment Canvas Renderer for Dash Runner.
 * Handles parallax grid backgrounds, pulsating neon floor, blocks, spikes, animated sawblades,
 * interactive orbs, launch pads, portals, and finish gates.
 */

import { TILE_SIZE } from '../constants/gameDefaults.js';
import { getCachedCustomImage, getSavedBlueprints } from '../utils/customAssetsManager.js';
import { getVisibleObjects } from '../utils/occlusionCulling.js';

// Global CORS image cache for parallax backgrounds
const bgImageCache = new Map();

// In-memory cache for custom blueprints
const cachedBlueprintsMap = new Map();
let lastBlueprintsFetch = 0;

export function getBlueprint(id, customBlueprints = null) {
  if (!id) return null;
  if (customBlueprints && customBlueprints instanceof Map && customBlueprints.has(id)) {
    return customBlueprints.get(id);
  }
  if (Array.isArray(customBlueprints)) {
    const found = customBlueprints.find(b => b && b.id === id);
    if (found) return found;
  }
  const now = Date.now();
  if (now - lastBlueprintsFetch > 800) {
    lastBlueprintsFetch = now;
    cachedBlueprintsMap.clear();
    const list = getSavedBlueprints();
    if (Array.isArray(list)) {
      list.forEach(b => { if (b && b.id) cachedBlueprintsMap.set(b.id, b); });
    }
  }
  return cachedBlueprintsMap.get(id) || null;
}

export function getCachedBackgroundImage(url) {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const cleanUrl = url.trim();
  let entry = bgImageCache.get(cleanUrl);
  if (!entry) {
    const img = new Image();
    entry = { img, loaded: false, error: false };
    img.onload = () => {
      entry.loaded = true;
    };
    img.onerror = () => {
      entry.error = true;
    };
    img.src = cleanUrl;
    bgImageCache.set(cleanUrl, entry);
  }
  return entry.loaded && !entry.error ? entry.img : null;
}

/**
 * Draws the full game environment.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} cameraX 
 * @param {number} canvasWidth 
 * @param {number} canvasHeight 
 * @param {Array} objects 
 * @param {number} floorY 
 * @param {number} ceilingY 
 * @param {number} timeNow 
 * @param {string} theme 
 * @param {Array} checkpoints Practice mode checkpoints
 * @param {string} customBgUrl Optional custom parallax background image URL
 * @param {number} bgParallaxSpeed Parallax scrolling multiplier (default: 0.25)
 */
export function drawLevel(
  ctx,
  cameraX,
  canvasWidth,
  canvasHeight,
  objects,
  floorY,
  ceilingY,
  timeNow,
  theme = 'cyber_cyan',
  checkpoints = [],
  customBgUrl = null,
  bgParallaxSpeed = 0.25,
  parallaxLayers = null,
  customBlueprints = null
) {
  if (!ctx) return;

  try {
    // 1. DYNAMIC PARALLAX BACKGROUND (multi-layer support)
    drawParallaxBackground(ctx, cameraX, canvasWidth, canvasHeight, timeNow, theme, customBgUrl, bgParallaxSpeed, parallaxLayers);

    // 2. FLOOR AND CEILING BOUNDS
    drawFloorAndCeiling(ctx, cameraX, canvasWidth, floorY, ceilingY, theme, timeNow);

    // 3. PRACTICE CHECKPOINTS
    if (Array.isArray(checkpoints)) {
      for (const cp of checkpoints) {
        if (!cp) continue;
        const screenX = cp.x - cameraX;
        if (screenX > -50 && screenX < canvasWidth + 50) {
          drawCheckpointMarker(ctx, screenX + 20, cp.y + 24, timeNow);
        }
      }
    }

    // 4. LEVEL OBJECTS (Background & normal layers - drawn behind player)
    // Render non-decor objects first, then background decor on top so lamps/decor on blocks are clearly visible!
    if (Array.isArray(objects) || (objects && objects.buckets)) {
      // Occlusion culling: only process objects in viewport plus preload safety margins
      const visibleObjects = getVisibleObjects(objects, cameraX, canvasWidth, TILE_SIZE, 4);

      const renderObj = (obj) => {
        if (!obj) return;
        if (obj.layer === 'foreground' || obj.layer === 'fg' || Boolean(obj.inFront)) {
          return;
        }
        const objWorldX = (typeof obj.x === 'number' ? obj.x : 0) * TILE_SIZE;
        const screenX = objWorldX - cameraX;
        if (screenX < -TILE_SIZE * 2 || screenX > canvasWidth + TILE_SIZE * 2) {
          return;
        }
        const objWorldY = floorY - ((typeof obj.y === 'number' ? obj.y : 0) + 1) * TILE_SIZE;
        drawLevelObject(ctx, obj, screenX, objWorldY, timeNow, ceilingY, floorY, TILE_SIZE, customBlueprints);
      };

      // First pass: blocks, hazards, orbs, portals, and gameplay elements
      for (let i = 0; i < visibleObjects.length; i++) {
        const obj = visibleObjects[i];
        if (obj && (!obj.type || (!obj.type.startsWith('deco_') && obj.role !== 'decor'))) {
          renderObj(obj);
        }
      }

      // Second pass: background decor (lamps, torches, carvings, vines sitting on blocks or backdrops)
      for (let i = 0; i < visibleObjects.length; i++) {
        const obj = visibleObjects[i];
        if (obj && (obj.type?.startsWith('deco_') || obj.role === 'decor')) {
          renderObj(obj);
        }
      }
    }
  } catch (err) {
    console.warn('Error in drawLevel:', err);
  }
}

/**
 * Draws foreground objects (visual decor or scenery marked as layer='foreground' or inFront=true).
 * Drawn AFTER the player so the player visually passes BEHIND them.
 * Also renders any cinematic foreground parallax layers (layer.isForeground === true).
 */
export function drawForegroundObjects(
  ctx,
  cameraX,
  canvasWidth,
  floorY,
  ceilingY,
  objects,
  timeNow,
  effectiveTile = TILE_SIZE,
  parallaxLayers = null,
  customBlueprints = null
) {
  if (!ctx) return;

  try {
    if (Array.isArray(objects) || (objects && objects.buckets)) {
      const visibleObjects = getVisibleObjects(objects, cameraX, canvasWidth, effectiveTile, 4);
      for (let i = 0; i < visibleObjects.length; i++) {
        const obj = visibleObjects[i];
        if (!obj) continue;

        // Only render items marked as foreground / in front of player
        if (obj.layer !== 'foreground' && obj.layer !== 'fg' && !obj.inFront) {
          continue;
        }

        const objWorldX = (typeof obj.x === 'number' ? obj.x : 0) * effectiveTile;
        const screenX = objWorldX - cameraX;

        // View frustum culling
        if (screenX < -effectiveTile * 2 || screenX > canvasWidth + effectiveTile * 2) {
          continue;
        }

        const objWorldY = floorY - ((typeof obj.y === 'number' ? obj.y : 0) + 1) * effectiveTile;
        drawLevelObject(ctx, obj, screenX, objWorldY, timeNow, ceilingY, floorY, effectiveTile, customBlueprints);
      }
    }

    // Cinematic Foreground Parallax Layers (in front of player and level)
    if (Array.isArray(parallaxLayers)) {
      const validCamX = typeof cameraX === 'number' && !isNaN(cameraX) ? cameraX : 0;
      parallaxLayers.forEach(layer => {
        if (!layer || !layer.isForeground || !layer.url || layer.opacity <= 0) return;
        const img = getCachedCustomImage(layer.url) || getCachedBackgroundImage(layer.url);
        if (!img || img.naturalWidth === 0) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity ?? 0.6));

        const imgAspect = img.naturalWidth / img.naturalHeight;
        const drawHeight = (floorY + 120) * (layer.scale || 1.0);
        const drawWidth = Math.max(120, Math.round(drawHeight * imgAspect));
        const speed = typeof layer.speed === 'number' && !isNaN(layer.speed) ? layer.speed : 1.25;
        const bgOffset = ((validCamX * speed) % drawWidth + drawWidth) % drawWidth;
        const posY = layer.offsetY || 0;

        if (layer.repeatX !== false) {
          for (let x = -bgOffset; x < canvasWidth + drawWidth; x += drawWidth) {
            ctx.drawImage(img, x, posY, drawWidth, drawHeight);
          }
        } else {
          ctx.drawImage(img, -bgOffset, posY, drawWidth, drawHeight);
        }
        ctx.restore();
      });
    }
  } catch (err) {
    console.warn('Error in drawForegroundObjects:', err);
  }
}

/**
 * Parallax background with multi-layer support or glowing horizon grid and rhythmic pulsation.
 */
export function drawParallaxBackground(
  ctx,
  cameraX,
  width,
  height,
  timeNow,
  theme,
  customBgUrl = null,
  bgParallaxSpeed = 0.25,
  parallaxLayers = null
) {
  ctx.save();

  // Multi-layer parallax background support
  if (Array.isArray(parallaxLayers) && parallaxLayers.length > 0) {
    // 1. Base dark backdrop
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    // 2. Render all background parallax layers (!layer.isForeground)
    const validCamX = typeof cameraX === 'number' && !isNaN(cameraX) ? cameraX : 0;
    parallaxLayers.forEach(layer => {
      if (!layer || layer.isForeground || !layer.url || layer.opacity <= 0) return;
      const img = getCachedCustomImage(layer.url) || getCachedBackgroundImage(layer.url);
      if (!img || img.naturalWidth === 0) return;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity ?? 1.0));

      const imgAspect = img.naturalWidth / img.naturalHeight;
      const drawHeight = height * (layer.scale || 1.0);
      const drawWidth = Math.max(120, Math.round(drawHeight * imgAspect));
      const speed = typeof layer.speed === 'number' && !isNaN(layer.speed) ? layer.speed : 0.25;
      const bgOffset = ((validCamX * speed) % drawWidth + drawWidth) % drawWidth;
      const posY = layer.offsetY || 0;

      if (layer.repeatX !== false) {
        for (let x = -bgOffset; x < width + drawWidth; x += drawWidth) {
          ctx.drawImage(img, x, posY, drawWidth, drawHeight);
        }
      } else {
        ctx.drawImage(img, -bgOffset, posY, drawWidth, drawHeight);
      }
      ctx.restore();
    });

    // Subtle contrast tint overlay so neon spikes and player stay sharply readable
    ctx.fillStyle = 'rgba(6, 10, 18, 0.35)';
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
    return;
  }

  const customImg = getCachedBackgroundImage(customBgUrl);
  if (customImg && customImg.naturalWidth > 0 && customImg.naturalHeight > 0) {
    // 1. Base dark backdrop
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    // 2. Parallax tiled custom image
    const imgAspect = customImg.naturalWidth / customImg.naturalHeight;
    const drawHeight = height;
    const drawWidth = Math.max(120, Math.round(drawHeight * imgAspect));
    const speed = typeof bgParallaxSpeed === 'number' && !isNaN(bgParallaxSpeed) ? bgParallaxSpeed : 0.25;
    const bgOffset = ((cameraX * speed) % drawWidth + drawWidth) % drawWidth;

    for (let x = -bgOffset; x < width + drawWidth; x += drawWidth) {
      ctx.drawImage(customImg, x, 0, drawWidth, drawHeight);
    }

    // 3. Subtle contrast tint overlay so neon spikes and player stay sharply readable
    ctx.fillStyle = 'rgba(6, 10, 18, 0.42)';
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
    return;
  }

  // Fallback procedural background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (theme === 'violet_synth') {
    bgGrad.addColorStop(0, '#12072b');
    bgGrad.addColorStop(0.6, '#260f47');
    bgGrad.addColorStop(1, '#090314');
  } else if (theme === 'crimson_rush') {
    bgGrad.addColorStop(0, '#260a0a');
    bgGrad.addColorStop(0.6, '#3d1212');
    bgGrad.addColorStop(1, '#120404');
  } else if (theme === 'dark_abyss') {
    bgGrad.addColorStop(0, '#040b17');
    bgGrad.addColorStop(0.6, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
  } else {
    // Default cyber cyan
    bgGrad.addColorStop(0, '#041d24');
    bgGrad.addColorStop(0.6, '#0b2e36');
    bgGrad.addColorStop(1, '#020e12');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Distant parallax skyline / geometric mountains
  ctx.save();
  const mountainScroll = (cameraX * 0.15) % 240;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let mx = -mountainScroll; mx < width + 240; mx += 180) {
    ctx.beginPath();
    ctx.moveTo(mx, height * 0.65);
    ctx.lineTo(mx + 90, height * 0.35);
    ctx.lineTo(mx + 180, height * 0.65);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Midground scrolling cyber grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const gridSpacing = 60;
  const offsetX = (cameraX * 0.4) % gridSpacing;

  for (let x = -offsetX; x < width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

/**
 * Renders high-tech floor and ceiling boundaries with neon edge lights.
 */
function drawFloorAndCeiling(ctx, cameraX, width, floorY, ceilingY, theme, timeNow) {
  ctx.save();

  // Floor Base
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, floorY, width, 500);

  // Floor neon edge line
  const beatGlow = 0.7 + Math.sin(timeNow * 0.006) * 0.3;
  ctx.strokeStyle = '#06b6d4';
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 12 * beatGlow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(width, floorY);
  ctx.stroke();

  // Floor perspective chevrons
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
  ctx.lineWidth = 2;
  const chevronSpacing = 50;
  const floorOffset = (cameraX) % chevronSpacing;
  for (let x = -floorOffset; x < width + chevronSpacing; x += chevronSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, floorY);
    ctx.lineTo(x - 20, floorY + 40);
    ctx.stroke();
  }

  // Ceiling Base & line
  if (ceilingY > 0) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, ceilingY);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, ceilingY);
    ctx.lineTo(width, ceilingY);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws an individual level object (block, spike, saw, orb, pad, portal).
 */
export function drawLevelObject(ctx, obj, screenX, screenY, timeNow, ceilingY = null, floorY = null, effectiveTile = TILE_SIZE, customBlueprints = null) {
  if (!ctx || !obj) return;

  ctx.save();

  // Support 90/180/270 degree rotation around tile center
  const rot = Number(obj.rotation) || 0;
  if (rot !== 0) {
    const centerX = screenX + (effectiveTile || TILE_SIZE) / 2;
    const centerY = screenY + (effectiveTile || TILE_SIZE) / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  const type = obj.type;

  // CUSTOM BLUEPRINT SPRITE RENDERING
  if (type?.startsWith('bp_') || obj.customAsset || obj.imageUrl || type?.startsWith('custom_')) {
    const bp = obj.customAsset || getBlueprint(type, customBlueprints) || {};
    const size = effectiveTile || TILE_SIZE;

    // Resolve current frame image: either from multi-image frames array OR single strip/static image
    let currentImgUrl = bp.imageUrl || obj.imageUrl;
    let isMultiImage = false;

    if (bp.isAnimated && Array.isArray(bp.frames) && bp.frames.length > 1) {
      isMultiImage = true;
      const fps = Math.max(1, Number(bp.fps) || 8);
      const totalFrames = bp.frames.length;
      const elapsed = (timeNow || 0) / 1000;
      let fIdx = 0;
      if (bp.loopMode === 'pingpong' && totalFrames > 2) {
        const pingPongSteps = (totalFrames - 1) * 2;
        const step = Math.floor((elapsed * fps) % pingPongSteps);
        fIdx = step < totalFrames ? step : pingPongSteps - step;
      } else {
        fIdx = Math.floor((elapsed * fps) % totalFrames);
      }
      currentImgUrl = bp.frames[fIdx] || currentImgUrl;
    }

    const img = getCachedCustomImage(currentImgUrl);

    // Calculate Procedural Animations (Spin, Bob, Pulse, Glow)
    let drawAngle = 0;
    let drawScaleX = 1;
    let drawScaleY = 1;
    let drawOffsetY = 0;

    if (bp.proceduralAnim === 'spin') {
      const degPerSec = Number(bp.spinSpeed) || 180;
      const dir = bp.spinDirection === 'ccw' ? -1 : 1;
      drawAngle = ((timeNow / 1000) * degPerSec * dir * (Math.PI / 180)) % (Math.PI * 2);
    } else if (bp.proceduralAnim === 'bob') {
      const bSpeed = Number(bp.bobSpeed) || 3;
      const bHeight = Number(bp.bobHeight) || 6;
      drawOffsetY = Math.sin((timeNow / 1000) * bSpeed * Math.PI * 2) * bHeight;
    } else if (bp.proceduralAnim === 'pulse') {
      const pSpeed = Number(bp.pulseSpeed) || 3;
      const pAmount = (Number(bp.pulseAmount) || 15) / 100;
      const s = 1 + Math.sin((timeNow / 1000) * pSpeed * Math.PI * 2) * pAmount;
      drawScaleX = s;
      drawScaleY = s;
    }

    const hasTransform = drawAngle !== 0 || drawScaleX !== 1 || drawScaleY !== 1 || drawOffsetY !== 0;

    if (hasTransform) {
      ctx.save();
      ctx.translate(screenX + size / 2, screenY + size / 2 + drawOffsetY);
      if (drawAngle !== 0) ctx.rotate(drawAngle);
      if (drawScaleX !== 1 || drawScaleY !== 1) ctx.scale(drawScaleX, drawScaleY);
      ctx.translate(-size / 2, -size / 2);
    }

    const drawX = hasTransform ? 0 : screenX;
    const drawY = hasTransform ? 0 : screenY;

    if (img && img.naturalWidth > 0) {
      if (isMultiImage) {
        // Already selected the specific frame's image URL!
        ctx.drawImage(img, drawX, drawY, size, size);
      } else if (bp.isAnimated && bp.frameCount > 1) {
        // Single sprite strip (horizontal or vertical)
        const fps = Math.max(1, Number(bp.fps) || 8);
        const totalFrames = Math.max(1, Number(bp.frameCount) || 1);
        const elapsed = (timeNow || 0) / 1000;
        let frame = 0;
        if (bp.loopMode === 'pingpong' && totalFrames > 2) {
          const pingPongSteps = (totalFrames - 1) * 2;
          const step = Math.floor((elapsed * fps) % pingPongSteps);
          frame = step < totalFrames ? step : pingPongSteps - step;
        } else {
          frame = Math.floor((elapsed * fps) % totalFrames);
        }

        if (bp.stripDirection === 'vertical') {
          const frameH = img.naturalHeight / totalFrames;
          ctx.drawImage(img, 0, frame * frameH, img.naturalWidth, frameH, drawX, drawY, size, size);
        } else {
          const frameW = img.naturalWidth / totalFrames;
          ctx.drawImage(img, frame * frameW, 0, frameW, img.naturalHeight, drawX, drawY, size, size);
        }
      } else {
        ctx.drawImage(img, drawX, drawY, size, size);
      }
    } else {
      // Stylized glowing placeholder tile while loading or if no image
      ctx.fillStyle = bp.role === 'hazard' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(6, 182, 212, 0.3)';
      ctx.strokeStyle = bp.role === 'hazard' ? '#ef4444' : '#06b6d4';
      ctx.lineWidth = 2;
      ctx.fillRect(drawX, drawY, size, size);
      ctx.strokeRect(drawX + 1, drawY + 1, size - 2, size - 2);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bp.name ? bp.name.slice(0, 8) : 'CUSTOM', drawX + size / 2, drawY + size / 2 + 3);
    }

    if (hasTransform) {
      ctx.restore();
    }

    ctx.restore();
    return;
  }

  switch (type) {
    // 1. SOLID BLOCKS
    case 'block_neon': {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 2;
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Inner corner accents
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(screenX + 4, screenY + 4, 4, 4);
      ctx.fillRect(screenX + TILE_SIZE - 8, screenY + 4, 4, 4);
      ctx.fillRect(screenX + 4, screenY + TILE_SIZE - 8, 4, 4);
      ctx.fillRect(screenX + TILE_SIZE - 8, screenY + TILE_SIZE - 8, 4, 4);
      break;
    }
    case 'block_metal': {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

      // Rivet details
      ctx.fillStyle = '#94a3b8';
      [6, TILE_SIZE - 8].forEach(rx => {
        [6, TILE_SIZE - 8].forEach(ry => {
          ctx.beginPath();
          ctx.arc(screenX + rx, screenY + ry, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      break;
    }
    case 'block_grid': {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      // Diagonal cross
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX + TILE_SIZE, screenY + TILE_SIZE);
      ctx.moveTo(screenX + TILE_SIZE, screenY);
      ctx.lineTo(screenX, screenY + TILE_SIZE);
      ctx.stroke();
      break;
    }
    case 'block_half': {
      const halfH = TILE_SIZE / 2;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fillRect(screenX, screenY + halfH, TILE_SIZE, halfH);
      ctx.strokeRect(screenX, screenY + halfH, TILE_SIZE, halfH);
      break;
    }

    // 2. HAZARDS: SPIKES & SAWS
    case 'spike_floor': {
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#fca5a5';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(screenX + TILE_SIZE / 2, screenY + 4);
      ctx.lineTo(screenX + TILE_SIZE - 4, screenY + TILE_SIZE);
      ctx.lineTo(screenX + 4, screenY + TILE_SIZE);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'spike_ceiling': {
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#fca5a5';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(screenX + 4, screenY);
      ctx.lineTo(screenX + TILE_SIZE - 4, screenY);
      ctx.lineTo(screenX + TILE_SIZE / 2, screenY + TILE_SIZE - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'spike_triple': {
      // 3 clustered spikes
      const subWidth = TILE_SIZE / 3;
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#fca5a5';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.2;

      for (let s = 0; s < 3; s++) {
        const sx = screenX + s * subWidth;
        ctx.beginPath();
        ctx.moveTo(sx + subWidth / 2, screenY + 10);
        ctx.lineTo(sx + subWidth - 1, screenY + TILE_SIZE);
        ctx.lineTo(sx + 1, screenY + TILE_SIZE);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'saw_blade': {
      const centerX = screenX + TILE_SIZE / 2;
      const centerY = screenY + TILE_SIZE / 2;
      const radius = (TILE_SIZE / 2) - 4;
      const rotation = (timeNow * 0.008) % (Math.PI * 2);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);

      // Outer teeth
      ctx.fillStyle = '#f43f5e';
      ctx.strokeStyle = '#ffe4e6';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#e11d48';
      ctx.shadowBlur = 10;

      const teeth = 8;
      ctx.beginPath();
      for (let t = 0; t < teeth; t++) {
        const angle = (Math.PI * 2 * t) / teeth;
        const outerR = radius;
        const innerR = radius * 0.65;
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        ctx.lineTo(Math.cos(angle + 0.2) * innerR, Math.sin(angle + 0.2) * innerR);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center Hub
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      break;
    }

    // 3. INTERACTIVE ORBS (Jump rings)
    case 'orb_yellow':
    case 'orb_pink':
    case 'orb_blue':
    case 'orb_green': {
      const orbColors = {
        orb_yellow: { ring: '#facc15', core: '#fef08a', glow: '#eab308' },
        orb_pink: { ring: '#ec4899', core: '#fbcfe8', glow: '#db2777' },
        orb_blue: { ring: '#3b82f6', core: '#bfdbfe', glow: '#2563eb' },
        orb_green: { ring: '#22c55e', core: '#bbf7d0', glow: '#16a34a' }
      }[type];

      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;
      const pulse = Math.sin(timeNow * 0.01) * 2.5;

      // Outer glowing ring
      ctx.strokeStyle = orbColors.ring;
      ctx.shadowColor = orbColors.glow;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 14 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Inner radiant core
      ctx.fillStyle = orbColors.core;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'orb_black': {
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;
      const pulse = Math.sin(timeNow * 0.012) * 2;

      // Deep purple void ring
      ctx.strokeStyle = '#a855f7';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 16;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 14 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Black void core
      ctx.fillStyle = '#090514';
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();

      // Downward slam arrow chevron
      ctx.strokeStyle = '#f3e8ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 4);
      ctx.lineTo(cx, cy + 2);
      ctx.lineTo(cx + 5, cy - 4);
      ctx.moveTo(cx - 5, cy);
      ctx.lineTo(cx, cy + 6);
      ctx.lineTo(cx + 5, cy);
      ctx.stroke();
      break;
    }

    case 'orb_dash_green': {
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;
      const pulse = Math.sin(timeNow * 0.01) * 2.5;

      // Outer glowing ring
      ctx.strokeStyle = '#22c55e';
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 15;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 14 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Emerald core
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();

      // Forward horizontal dash chevron
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 5);
      ctx.lineTo(cx + 4, cy);
      ctx.lineTo(cx - 4, cy + 5);
      ctx.stroke();
      break;
    }

    case 'orb_dash_magenta': {
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;
      const pulse = Math.sin(timeNow * 0.01) * 2.5;

      // Outer glowing ring
      ctx.strokeStyle = '#d946ef';
      ctx.shadowColor = '#f472b6';
      ctx.shadowBlur = 15;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 14 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Magenta core
      ctx.fillStyle = '#701a75';
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();

      // Diagonal upward dash chevron (45 deg)
      ctx.strokeStyle = '#fbcfe8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy + 3);
      ctx.lineTo(cx + 3, cy - 4);
      ctx.lineTo(cx + 3, cy + 3);
      ctx.moveTo(cx + 3, cy - 4);
      ctx.lineTo(cx - 4, cy - 4);
      ctx.stroke();
      break;
    }

    // Secret Collectible Coin
    case 'collectable_coin': {
      if (obj.collected) break;
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;
      const t = (typeof timeNow === 'number' && !isNaN(timeNow)) ? timeNow : performance.now();
      const spin = Math.sin(t * 0.005);
      const scaleX = Math.abs(spin) * 0.8 + 0.2;
      const floatY = Math.sin(t * 0.006) * 3;

      ctx.save();
      ctx.translate(cx, cy + floatY);
      ctx.scale(scaleX, 1);

      // Outer glowing gold aura
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 16;

      // Outer coin rim
      const coinGrad = ctx.createLinearGradient(-16, -16, 16, 16);
      coinGrad.addColorStop(0, '#fef08a');
      coinGrad.addColorStop(0.4, '#eab308');
      coinGrad.addColorStop(1, '#ca8a04');

      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // Inner star / diamond emblem
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(3, -2);
      ctx.lineTo(9, 0);
      ctx.lineTo(3, 2);
      ctx.lineTo(0, 9);
      ctx.lineTo(-3, 2);
      ctx.lineTo(-9, 0);
      ctx.lineTo(-3, -2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      break;
    }

    // 4. INTERACTIVE PADS (Launch pads)
    case 'pad_yellow':
    case 'pad_pink':
    case 'pad_red':
    case 'pad_blue': {
      const padColors = {
        pad_yellow: '#eab308',
        pad_pink: '#ec4899',
        pad_red: '#ef4444',
        pad_blue: '#3b82f6'
      }[type];

      // Base mount
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(screenX + 4, screenY + TILE_SIZE - 12, TILE_SIZE - 8, 12);

      // Spring pad plate
      ctx.fillStyle = padColors;
      ctx.shadowColor = padColors;
      ctx.shadowBlur = 10;
      ctx.fillRect(screenX + 6, screenY + TILE_SIZE - 16, TILE_SIZE - 12, 6);

      // Upward arrows chevron
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX + TILE_SIZE / 2 - 6, screenY + TILE_SIZE - 6);
      ctx.lineTo(screenX + TILE_SIZE / 2, screenY + TILE_SIZE - 10);
      ctx.lineTo(screenX + TILE_SIZE / 2 + 6, screenY + TILE_SIZE - 6);
      ctx.stroke();
      break;
    }

    // 5. PORTALS
    case 'portal_gravity_inv':
    case 'portal_gravity_norm':
    case 'portal_speed_slow':
    case 'portal_speed_normal':
    case 'portal_speed_fast':
    case 'portal_fly':
    case 'portal_runner': {
      drawPortal(ctx, type, screenX, screenY, timeNow);
      break;
    }

    // 6. FINISH GATE (Standard 3-Tile Gate OR Ceiling-to-Floor Laser Beam Barrier)
    case 'finish_gate_full':
    case 'finish_gate': {
      const isSpanFull = Boolean(obj.spanFull || obj.type === 'finish_gate_full' || obj.fullHeight);
      const gateWidth = effectiveTile || TILE_SIZE;

      if (isSpanFull && typeof ceilingY === 'number' && typeof floorY === 'number') {
        const fullHeight = Math.max(gateWidth * 3, floorY - ceilingY);
        const topY = ceilingY;

        // Dark framing pylon
        ctx.fillStyle = '#090f1d';
        ctx.fillRect(screenX, topY, gateWidth, fullHeight);

        // Pulsing emerald energy barrier
        const pulse = 0.85 + Math.sin((timeNow || 0) * 0.006) * 0.15;
        ctx.fillStyle = `rgba(16, 185, 129, ${0.45 * pulse})`;
        ctx.fillRect(screenX + 3, topY, gateWidth - 6, fullHeight);

        // Center intense laser core
        ctx.fillStyle = '#6ee7b7';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 18;
        ctx.fillRect(screenX + gateWidth / 2 - 3, topY, 6, fullHeight);

        // Checkered flags at top ceiling anchor and bottom floor base
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        // Top flags
        ctx.fillRect(screenX + 4, topY + 3, 8, 8);
        ctx.fillRect(screenX + gateWidth - 12, topY + 3, 8, 8);
        ctx.fillRect(screenX + gateWidth / 2 - 4, topY + 11, 8, 8);
        // Bottom flags
        ctx.fillRect(screenX + 4, floorY - 19, 8, 8);
        ctx.fillRect(screenX + gateWidth - 12, floorY - 19, 8, 8);
        ctx.fillRect(screenX + gateWidth / 2 - 4, floorY - 11, 8, 8);

        // Vertical "FINISH" text centered on the beam
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(9, Math.round(gateWidth * 0.32))}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('FINISH', screenX + gateWidth / 2, topY + fullHeight / 2);
        ctx.textAlign = 'left';
      } else {
        // Standard Towering neon gate (as it is)
        const gateH = gateWidth * 3;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(screenX, screenY - gateWidth * 2, gateWidth, gateH);

        // Pulsing energy beam
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 20;
        ctx.fillRect(screenX + (gateWidth * 0.5 - 4), screenY - gateWidth * 2, 8, gateH);

        // Checkered flags on top
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX + 6, screenY - gateWidth * 2 + 4, 8, 8);
        ctx.fillRect(screenX + gateWidth - 14, screenY - gateWidth * 2 + 4, 8, 8);
        ctx.fillRect(screenX + gateWidth / 2 - 4, screenY - gateWidth * 2 + 14, 8, 8);
      }
      break;
    }

    // 7. VISUAL DECORATIONS (Purely aesthetic scenery, non-lethal, pass-through)
    case 'deco_pillar': {
      // Tech Support Pillar / Architectural Column
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(screenX + 6, screenY, TILE_SIZE - 12, TILE_SIZE);

      // Metallic border
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX + 6, screenY, TILE_SIZE - 12, TILE_SIZE);

      // Vertical glowing neon conduit
      const pulse = 0.8 + Math.sin(timeNow * 0.005) * 0.2;
      ctx.fillStyle = `rgba(6, 182, 212, ${pulse})`;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.fillRect(screenX + TILE_SIZE / 2 - 2, screenY + 4, 4, TILE_SIZE - 8);

      // Top and bottom mounting caps
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(screenX + 4, screenY, TILE_SIZE - 8, 5);
      ctx.fillRect(screenX + 4, screenY + TILE_SIZE - 5, TILE_SIZE - 8, 5);
      break;
    }

    case 'deco_chain': {
      // Hanging glowing cyber cable / energy chain
      ctx.strokeStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2.5;

      const numLinks = 5;
      const linkH = TILE_SIZE / numLinks;
      for (let l = 0; l < numLinks; l++) {
        const ly = screenY + l * linkH;
        ctx.beginPath();
        ctx.ellipse(screenX + TILE_SIZE / 2, ly + linkH / 2, 4, linkH / 2 - 1, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Energy pulse dot moving down
      const pulseY = screenY + ((timeNow * 0.05) % TILE_SIZE);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(screenX + TILE_SIZE / 2, pulseY, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deco_arrow': {
      // Directional neon guidance chevron
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;
      const rot = ((Number(obj.rotation) || 0) * Math.PI) / 180;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 2 animated glowing chevrons
      const offset = (timeNow * 0.02) % 12;
      for (let c = -1; c <= 1; c++) {
        const xPos = c * 10 + (offset - 6);
        const alpha = Math.max(0.2, 1 - Math.abs(xPos) / 16);
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(xPos - 5, -8);
        ctx.lineTo(xPos + 3, 0);
        ctx.lineTo(xPos - 5, 8);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'deco_hazard': {
      // Diagonal hazard caution stripes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(screenX + 2, screenY + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      ctx.save();
      ctx.beginPath();
      ctx.rect(screenX + 2, screenY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.clip();

      ctx.fillStyle = '#f59e0b';
      const stripeW = 8;
      for (let s = -TILE_SIZE; s < TILE_SIZE * 2; s += stripeW * 2) {
        ctx.beginPath();
        ctx.moveTo(screenX + s, screenY);
        ctx.lineTo(screenX + s + stripeW, screenY);
        ctx.lineTo(screenX + s + stripeW + TILE_SIZE, screenY + TILE_SIZE);
        ctx.lineTo(screenX + s + TILE_SIZE, screenY + TILE_SIZE);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX + 2, screenY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      break;
    }

    case 'deco_beacon': {
      // Tech beacon / street lamp
      const cx = screenX + TILE_SIZE / 2;
      // Pole
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 2, screenY + 12, 4, TILE_SIZE - 12);

      // Base
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 8, screenY + TILE_SIZE - 4, 16, 4);

      // Glowing beacon head
      const pulse = 10 + Math.sin(timeNow * 0.008) * 4;
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = pulse;
      ctx.beginPath();
      ctx.arc(cx, screenY + 8, 6, 0, Math.PI * 2);
      ctx.fill();

      // Halo ring
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, screenY + 8, 12, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'deco_grid': {
      // Cyber lattice / wireframe honeycomb panel
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(screenX + 3, screenY + 3, TILE_SIZE - 6, TILE_SIZE - 6);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX + 3, screenY + 3, TILE_SIZE - 6, TILE_SIZE - 6);

      // Internal lattice diagonals
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.moveTo(screenX + 3, screenY + 3);
      ctx.lineTo(screenX + TILE_SIZE - 3, screenY + TILE_SIZE - 3);
      ctx.moveTo(screenX + TILE_SIZE - 3, screenY + 3);
      ctx.lineTo(screenX + 3, screenY + TILE_SIZE - 3);
      ctx.moveTo(screenX + TILE_SIZE / 2, screenY + 3);
      ctx.lineTo(screenX + TILE_SIZE / 2, screenY + TILE_SIZE - 3);
      ctx.moveTo(screenX + 3, screenY + TILE_SIZE / 2);
      ctx.lineTo(screenX + TILE_SIZE - 3, screenY + TILE_SIZE / 2);
      ctx.stroke();

      // Corner tech rivets
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(screenX + 4, screenY + 4, 3, 3);
      ctx.fillRect(screenX + TILE_SIZE - 7, screenY + 4, 3, 3);
      ctx.fillRect(screenX + 4, screenY + TILE_SIZE - 7, 3, 3);
      ctx.fillRect(screenX + TILE_SIZE - 7, screenY + TILE_SIZE - 7, 3, 3);
      break;
    }

    case 'deco_pipe': {
      // Industrial cyber conduit pipe
      const rot = Number(obj.rotation) || 0;
      const isVert = rot === 90 || rot === 270;

      if (!isVert) {
        // Horizontal pipe
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(screenX, screenY + TILE_SIZE / 2 - 6, TILE_SIZE, 12);

        // Pipe borders
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(screenX, screenY + TILE_SIZE / 2 - 6, TILE_SIZE, 12);

        // Glowing core fluid stream
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.fillRect(screenX, screenY + TILE_SIZE / 2 - 2, TILE_SIZE, 4);

        // Flange ring
        ctx.fillStyle = '#334155';
        ctx.fillRect(screenX + TILE_SIZE / 2 - 3, screenY + TILE_SIZE / 2 - 8, 6, 16);
      } else {
        // Vertical pipe
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(screenX + TILE_SIZE / 2 - 6, screenY, 12, TILE_SIZE);

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(screenX + TILE_SIZE / 2 - 6, screenY, 12, TILE_SIZE);

        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.fillRect(screenX + TILE_SIZE / 2 - 2, screenY, 4, TILE_SIZE);

        ctx.fillStyle = '#334155';
        ctx.fillRect(screenX + TILE_SIZE / 2 - 8, screenY + TILE_SIZE / 2 - 3, 16, 6);
      }
      break;
    }

    case 'deco_screen': {
      // Holographic terminal screen
      ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.fillRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      // Mini soundwave / telemetry bars
      ctx.fillStyle = '#67e8f9';
      const numBars = 5;
      const barW = 3;
      const startX = screenX + 8;
      for (let b = 0; b < numBars; b++) {
        const barH = 4 + Math.abs(Math.sin(timeNow * 0.006 + b * 1.2)) * 14;
        ctx.fillRect(startX + b * 6, screenY + TILE_SIZE - 8 - barH, barW, barH);
      }

      // Blinking status dot
      const blink = Math.sin(timeNow * 0.01) > 0;
      ctx.fillStyle = blink ? '#22c55e' : '#15803d';
      ctx.beginPath();
      ctx.arc(screenX + TILE_SIZE - 9, screenY + 9, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deco_light': {
      // Ambient radial neon spotlight
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, TILE_SIZE * 0.9);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, TILE_SIZE * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Center light emitter fixture
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // ==========================================
    // 6. FOREST & NATURE THEMED OBJECTS
    // ==========================================
    case 'block_wood': {
      // Ancient Bark & Carved Timber Block
      ctx.fillStyle = '#451a03';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Woodgrain planks and tree ring center
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(screenX + 4, screenY + 12);
      ctx.lineTo(screenX + TILE_SIZE - 4, screenY + 12);
      ctx.moveTo(screenX + 4, screenY + TILE_SIZE - 12);
      ctx.lineTo(screenX + TILE_SIZE - 4, screenY + TILE_SIZE - 12);
      ctx.stroke();
      break;
    }
    case 'block_moss': {
      // Weathered Stone with Emerald Moss Crown
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

      // Lush moss top cap
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.roundRect(screenX, screenY, TILE_SIZE, 12, [4, 4, 2, 2]);
      ctx.fill();
      // Moss droplets / sprouts
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(screenX + 6, screenY + 12, 5, 4);
      ctx.fillRect(screenX + 18, screenY + 12, 6, 6);
      ctx.fillRect(screenX + 32, screenY + 12, 4, 3);
      break;
    }
    case 'block_stone': {
      // Carved Ancient Temple Stone
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 2, screenY + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      // Chiseled geometric inlay
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX + 10, screenY + 10, TILE_SIZE - 20, TILE_SIZE - 20);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(screenX + TILE_SIZE / 2 - 3, screenY + TILE_SIZE / 2 - 3, 6, 6);
      break;
    }
    case 'block_leaves': {
      // Bioluminescent Canopy Foliage
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

      // Stylized leaf veins
      ctx.fillStyle = '#059669';
      [8, 22, 34].forEach(lx => {
        ctx.beginPath();
        ctx.ellipse(screenX + lx, screenY + 16, 6, 10, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(screenX + lx + 6, screenY + 30, 6, 10, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'hazard_thorns': {
      // Sharp Forest Bramble Spikes
      ctx.fillStyle = '#14532d';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      const tSteps = 4;
      const tW = TILE_SIZE / tSteps;
      for (let i = 0; i < tSteps; i++) {
        const tx = screenX + i * tW;
        ctx.beginPath();
        ctx.moveTo(tx + tW / 2, screenY + 6);
        ctx.lineTo(tx + tW - 1, screenY + TILE_SIZE);
        ctx.lineTo(tx + 1, screenY + TILE_SIZE);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // Red thorn tips
      ctx.fillStyle = '#ef4444';
      for (let i = 0; i < tSteps; i++) {
        const tx = screenX + i * tW;
        ctx.fillRect(tx + tW / 2 - 1, screenY + 4, 2, 4);
      }
      break;
    }
    case 'hazard_spore': {
      // Toxic Pulsing Spore Mushroom Hazard
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2 + 4;
      const pulse = Math.sin(timeNow * 0.008) * 2;
      ctx.fillStyle = '#581c87';
      ctx.strokeStyle = '#c084fc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      // Cap
      ctx.beginPath();
      ctx.arc(cx, cy, 15 + pulse, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Toxic spots
      ctx.fillStyle = '#f0abfc';
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 6, 3, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy - 7, 2.5, 0, Math.PI * 2);
      ctx.arc(cx, cy - 11, 2, 0, Math.PI * 2);
      ctx.fill();
      // Stem
      ctx.fillStyle = '#3b0764';
      ctx.fillRect(cx - 4, cy, 8, TILE_SIZE / 2 - 4);
      break;
    }
    case 'deco_vine': {
      // Hanging Ivy Vine (Decor)
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(screenX + TILE_SIZE / 2, screenY);
      ctx.bezierCurveTo(
        screenX + 8, screenY + 16,
        screenX + TILE_SIZE - 8, screenY + 32,
        screenX + TILE_SIZE / 2, screenY + TILE_SIZE
      );
      ctx.stroke();

      // Hanging leaves
      ctx.fillStyle = '#22c55e';
      [10, 22, 36].forEach((ly, idx) => {
        const lx = idx % 2 === 0 ? screenX + 12 : screenX + 32;
        ctx.beginPath();
        ctx.ellipse(lx, screenY + ly, 5, 8, idx % 2 === 0 ? -0.4 : 0.4, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'deco_mushroom': {
      // Glowing Bioluminescent Shrooms (Decor)
      ctx.fillStyle = '#0284c7';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      // Mushroom 1
      ctx.beginPath();
      ctx.arc(screenX + 14, screenY + TILE_SIZE - 10, 8, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(screenX + 12, screenY + TILE_SIZE - 10, 4, 10);
      // Mushroom 2 (smaller)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#f472b6';
      ctx.beginPath();
      ctx.arc(screenX + 30, screenY + TILE_SIZE - 7, 6, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fce7f3';
      ctx.fillRect(screenX + 28, screenY + TILE_SIZE - 7, 4, 7);
      break;
    }
    case 'deco_lantern': {
      // Enchanted Hanging Lantern (Decor)
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(screenX + TILE_SIZE / 2, screenY);
      ctx.lineTo(screenX + TILE_SIZE / 2, screenY + 14);
      ctx.stroke();

      // Golden warm glow
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(screenX + TILE_SIZE / 2 - 7, screenY + 14, 14, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(screenX + TILE_SIZE / 2 - 3, screenY + 18, 6, 10);
      break;
    }
    case 'deco_tree': {
      // Mystic Bonsai Tree Trunk (Decor)
      ctx.fillStyle = '#292524';
      ctx.fillRect(screenX + TILE_SIZE / 2 - 5, screenY + 18, 10, TILE_SIZE - 18);
      // Foliage cloud
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.arc(screenX + TILE_SIZE / 2, screenY + 14, 14, 0, Math.PI * 2);
      ctx.arc(screenX + TILE_SIZE / 2 - 8, screenY + 18, 9, 0, Math.PI * 2);
      ctx.arc(screenX + TILE_SIZE / 2 + 8, screenY + 18, 9, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // --- EXPANDED JUNGLE BLOCKS ---
    case 'block_jungle_ruin': {
      // Ancient Mayan/Inca Temple Ruin Block with Inlaid Gold Glyphs
      ctx.fillStyle = '#292524';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Carved stone stepped relief border
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX + 5, screenY + 5, TILE_SIZE - 10, TILE_SIZE - 10);

      // Ancient solar glyph motif
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      ctx.fillRect(screenX + TILE_SIZE / 2 - 5, screenY + TILE_SIZE / 2 - 5, 10, 10);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(screenX + TILE_SIZE / 2 - 2, screenY + TILE_SIZE / 2 - 2, 4, 4);

      // Weathered moss patches in corners
      ctx.fillStyle = '#15803d';
      ctx.fillRect(screenX + 2, screenY + 2, 4, 3);
      ctx.fillRect(screenX + TILE_SIZE - 6, screenY + TILE_SIZE - 5, 4, 3);
      break;
    }

    case 'block_bamboo': {
      // Bundled Tropical Bamboo Stalks
      ctx.fillStyle = '#14532d';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

      const caneW = TILE_SIZE / 4;
      for (let i = 0; i < 4; i++) {
        const cx = screenX + i * caneW;
        // Cane body with light/shadow
        ctx.fillStyle = i % 2 === 0 ? '#16a34a' : '#22c55e';
        ctx.fillRect(cx + 1, screenY, caneW - 2, TILE_SIZE);

        // Bamboo node joints
        [10, 24, 38].forEach(ny => {
          ctx.fillStyle = '#15803d';
          ctx.fillRect(cx, screenY + ny, caneW, 2.5);
          ctx.fillStyle = '#bbf7d0';
          ctx.fillRect(cx + 1, screenY + ny + 1, caneW - 2, 1);
        });
      }

      // Golden woven hemp rope bindings
      ctx.fillStyle = '#92400e';
      ctx.fillRect(screenX, screenY + 16, TILE_SIZE, 4);
      ctx.fillRect(screenX, screenY + 32, TILE_SIZE, 4);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY + 16, TILE_SIZE, 4);
      ctx.strokeRect(screenX, screenY + 32, TILE_SIZE, 4);
      break;
    }

    case 'block_sun_stone': {
      // Ancient Aztec Sun Idol Stone
      ctx.fillStyle = '#78350f';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;

      // Radiating sunburst triangles
      ctx.fillStyle = '#fbbf24';
      for (let a = 0; a < 8; a++) {
        const rad = (a * Math.PI) / 4;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(rad) * 14, cy + Math.sin(rad) * 14, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Central Golden Solar Disc
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();

      // Jade Eye Core
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'block_root': {
      // Gnarled Living Ancient Rainforest Roots
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

      // Entwined twisting banyan roots
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(screenX + 4, screenY);
      ctx.quadraticCurveTo(screenX + 18, screenY + 24, screenX + 12, screenY + TILE_SIZE);
      ctx.moveTo(screenX + TILE_SIZE - 6, screenY);
      ctx.quadraticCurveTo(screenX + 26, screenY + 18, screenX + TILE_SIZE - 4, screenY + TILE_SIZE);
      ctx.stroke();

      // Cross root
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + 22);
      ctx.quadraticCurveTo(screenX + TILE_SIZE / 2, screenY + 28, screenX + TILE_SIZE, screenY + 20);
      ctx.stroke();

      // Glowing bioluminescent root moss sprouts
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(screenX + 16, screenY + 22, 2.5, 0, Math.PI * 2);
      ctx.arc(screenX + 32, screenY + 16, 2.5, 0, Math.PI * 2);
      ctx.arc(screenX + 24, screenY + 36, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'block_jungle_slab': {
      // Mossy Rainforest Half-Slab Step (Half Height)
      const slabH = TILE_SIZE / 2;
      const slabY = screenY + slabH;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(screenX, slabY, TILE_SIZE, slabH);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX + 1, slabY + 1, TILE_SIZE - 2, slabH - 2);

      // Lush carpet of moss on top
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.roundRect(screenX, slabY, TILE_SIZE, 6, [3, 3, 0, 0]);
      ctx.fill();

      // Dangling moss tendrils
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(screenX + 6, slabY + 5, 3, 4);
      ctx.fillRect(screenX + 18, slabY + 5, 4, 6);
      ctx.fillRect(screenX + 32, slabY + 5, 3, 3);
      break;
    }

    case 'block_canopy_bark': {
      // Deep Rainforest Teak & Mahogany Bark
      ctx.fillStyle = '#3f1d18';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#291410';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

      // Deep bark furrows
      ctx.strokeStyle = '#1c0d0a';
      ctx.lineWidth = 1.5;
      [8, 18, 28, 38].forEach(fx => {
        ctx.beginPath();
        ctx.moveTo(screenX + fx, screenY + 2);
        ctx.lineTo(screenX + fx + 2, screenY + 18);
        ctx.lineTo(screenX + fx - 1, screenY + TILE_SIZE - 2);
        ctx.stroke();
      });

      // Turquoise tree lichen fungus
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(screenX + 12, screenY + 14, 4, 0, Math.PI * 2);
      ctx.arc(screenX + 34, screenY + 32, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6ee7b7';
      ctx.beginPath();
      ctx.arc(screenX + 12, screenY + 14, 2, 0, Math.PI * 2);
      ctx.arc(screenX + 34, screenY + 32, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // --- MAYAN TEMPLE ARCHITECTURAL BLOCKS ---
    case 'block_temple_stone': {
      // Megalithic Carved Mayan Temple Stone Block with Stepped Fret Relief
      ctx.fillStyle = '#44403c'; // Basalt stone base
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Chiseled beveled inner panel
      ctx.fillStyle = '#57534e';
      ctx.fillRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      // Traditional Mayan stepped fret (Xicalcoliuhqui) geometric engraving
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Upper step
      ctx.moveTo(screenX + 8, screenY + 10);
      ctx.lineTo(screenX + 20, screenY + 10);
      ctx.lineTo(screenX + 20, screenY + 18);
      ctx.lineTo(screenX + 32, screenY + 18);
      ctx.lineTo(screenX + 32, screenY + 30);
      // Lower inner return
      ctx.lineTo(screenX + 24, screenY + 30);
      ctx.lineTo(screenX + 24, screenY + 24);
      ctx.lineTo(screenX + 14, screenY + 24);
      ctx.lineTo(screenX + 14, screenY + 16);
      ctx.lineTo(screenX + 8, screenY + 16);
      ctx.closePath();
      ctx.stroke();

      // Ancient temple gold leaf inlay dot
      ctx.fillStyle = '#eab308';
      ctx.fillRect(screenX + 10, screenY + 28, 4, 4);

      // Weathered jungle moss in crevices
      ctx.fillStyle = '#15803d';
      ctx.fillRect(screenX + 2, screenY + 2, 5, 2);
      ctx.fillRect(screenX + 33, screenY + 35, 5, 3);
      break;
    }

    case 'block_temple_brick': {
      // Ancient Weathered Sandstone Temple Brickwork
      ctx.fillStyle = '#78350f'; // Warm deep clay-stone
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

      // Staggered horizontal brick courses
      const rowH = TILE_SIZE / 3;
      for (let r = 0; r < 3; r++) {
        const ry = screenY + r * rowH;
        // Brick rows
        ctx.fillStyle = r % 2 === 0 ? '#92400e' : '#b45309';
        ctx.fillRect(screenX + 1, ry + 1, TILE_SIZE - 2, rowH - 2);

        // Mortar lines
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(screenX + 1, ry + 1, TILE_SIZE - 2, rowH - 2);

        // Vertical split joints
        const offset = (r % 2) * (TILE_SIZE / 2);
        const splitX1 = screenX + (offset || TILE_SIZE / 2);
        ctx.beginPath();
        ctx.moveTo(splitX1, ry + 1);
        ctx.lineTo(splitX1, ry + rowH - 1);
        ctx.stroke();
      }

      // Lichen & moss flecks
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(screenX + 4, screenY + rowH + 2, 4, 2);
      ctx.fillRect(screenX + 24, screenY + 2 * rowH + 1, 5, 2);
      break;
    }

    case 'block_temple_slope_l': {
      // Stepped Pyramid Incline (Left-facing tiered masonry)
      ctx.fillStyle = '#292524';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

      // Tiered stepped silhouette
      const stepW = TILE_SIZE / 3;
      const stepH = TILE_SIZE / 3;

      // Tier 1 (bottom full)
      ctx.fillStyle = '#44403c';
      ctx.fillRect(screenX, screenY + 2 * stepH, TILE_SIZE, stepH);
      // Tier 2 (middle two-thirds)
      ctx.fillStyle = '#57534e';
      ctx.fillRect(screenX + stepW, screenY + stepH, 2 * stepW, stepH);
      // Tier 3 (top one-third)
      ctx.fillStyle = '#78716c';
      ctx.fillRect(screenX + 2 * stepW, screenY, stepW, stepH);

      // Gold carved accent edges on steps
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + 2 * stepH);
      ctx.lineTo(screenX + stepW, screenY + 2 * stepH);
      ctx.lineTo(screenX + stepW, screenY + stepH);
      ctx.lineTo(screenX + 2 * stepW, screenY + stepH);
      ctx.lineTo(screenX + 2 * stepW, screenY);
      ctx.lineTo(screenX + TILE_SIZE, screenY);
      ctx.stroke();

      // Creeping moss
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(screenX + stepW + 2, screenY + stepH + 2, 4, 3);
      break;
    }

    case 'block_temple_slope_r': {
      // Stepped Pyramid Incline (Right-facing tiered masonry)
      ctx.fillStyle = '#292524';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

      const stepW = TILE_SIZE / 3;
      const stepH = TILE_SIZE / 3;

      // Tier 1 (bottom full)
      ctx.fillStyle = '#44403c';
      ctx.fillRect(screenX, screenY + 2 * stepH, TILE_SIZE, stepH);
      // Tier 2 (middle two-thirds on left)
      ctx.fillStyle = '#57534e';
      ctx.fillRect(screenX, screenY + stepH, 2 * stepW, stepH);
      // Tier 3 (top one-third on left)
      ctx.fillStyle = '#78716c';
      ctx.fillRect(screenX, screenY, stepW, stepH);

      // Gold carved accent edges on steps
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX + stepW, screenY);
      ctx.lineTo(screenX + stepW, screenY + stepH);
      ctx.lineTo(screenX + 2 * stepW, screenY + stepH);
      ctx.lineTo(screenX + 2 * stepW, screenY + 2 * stepH);
      ctx.lineTo(screenX + TILE_SIZE, screenY + 2 * stepH);
      ctx.stroke();

      // Creeping moss
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(screenX + 4, screenY + stepH + 2, 4, 3);
      break;
    }

    case 'block_temple_cornice': {
      // Overhanging Carved Temple Cornice / Roof Lintel
      // Upper overhang slab
      ctx.fillStyle = '#57534e';
      ctx.fillRect(screenX, screenY, TILE_SIZE, 14);
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX, screenY, TILE_SIZE, 14);

      // Golden decorative frieze band
      ctx.fillStyle = '#b45309';
      ctx.fillRect(screenX + 2, screenY + 14, TILE_SIZE - 4, 12);
      ctx.strokeStyle = '#f59e0b';
      ctx.strokeRect(screenX + 2, screenY + 14, TILE_SIZE - 4, 12);

      // Dental tooth relief in frieze
      ctx.fillStyle = '#fef08a';
      for (let tx = 6; tx < TILE_SIZE - 6; tx += 7) {
        ctx.fillRect(screenX + tx, screenY + 16, 4, 8);
      }

      // Lower carved stone support bed
      ctx.fillStyle = '#44403c';
      ctx.fillRect(screenX + 4, screenY + 26, TILE_SIZE - 8, TILE_SIZE - 26);
      ctx.strokeStyle = '#292524';
      ctx.strokeRect(screenX + 4, screenY + 26, TILE_SIZE - 8, TILE_SIZE - 26);

      // Center green jade amulet inset
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 6;
      ctx.fillRect(screenX + TILE_SIZE / 2 - 3, screenY + 30, 6, 6);
      break;
    }

    case 'block_temple_relief': {
      // Sacred Stone Glyph Wall Panel (Mayan Jaguar / Deity Mask Relief)
      ctx.fillStyle = '#292524';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Stepped carved inner recess
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;

      // Stylized Mesoamerican Deity Face Relief
      // Forehead headdress band
      ctx.fillStyle = '#d97706';
      ctx.fillRect(cx - 10, cy - 12, 20, 5);

      // Cheek / jaw stone blocks
      ctx.fillStyle = '#71717a';
      ctx.fillRect(cx - 9, cy - 6, 18, 14);

      // Glowing Jade Eyes
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 8;
      ctx.fillRect(cx - 7, cy - 4, 4, 4);
      ctx.fillRect(cx + 3, cy - 4, 4, 4);

      // Stone snout & fangs
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx - 2, cy + 2, 4, 4);
      ctx.fillStyle = '#e4e4e7';
      ctx.fillRect(cx - 6, cy + 5, 3, 4);
      ctx.fillRect(cx + 3, cy + 5, 3, 4);
      break;
    }

    case 'block_temple_platform': {
      // Stepped Ceremonial Dais Stone Platform (Half-Height Base Block)
      const platY = screenY + TILE_SIZE / 2;
      ctx.fillStyle = '#44403c';
      ctx.fillRect(screenX, platY, TILE_SIZE, TILE_SIZE / 2);
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 1, platY, TILE_SIZE - 2, TILE_SIZE / 2 - 1);

      // Top polished flagstone tread
      ctx.fillStyle = '#78716c';
      ctx.fillRect(screenX + 2, platY + 1, TILE_SIZE - 4, 4);

      // Ceremonial geometric border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX + 4, platY + 7, TILE_SIZE - 8, 8);

      // Moss creep
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(screenX + 2, platY + 12, 6, 4);
      break;
    }
    case 'hazard_acid_bog': {
      // Bubbling Emerald Acid Swamp Bog
      ctx.fillStyle = '#052e16';
      ctx.fillRect(screenX, screenY + 16, TILE_SIZE, TILE_SIZE - 16);

      // Acid liquid gradient
      const acidGrad = ctx.createLinearGradient(screenX, screenY + 20, screenX, screenY + TILE_SIZE);
      acidGrad.addColorStop(0, '#10b981');
      acidGrad.addColorStop(0.5, '#059669');
      acidGrad.addColorStop(1, '#022c22');
      ctx.fillStyle = acidGrad;
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(screenX + 2, screenY + 20, TILE_SIZE - 4, TILE_SIZE - 22, [4, 4, 0, 0]);
      ctx.fill();

      // Animated rising popping bubbles
      const bubbleTime = timeNow * 0.005;
      const b1 = (bubbleTime * 14) % 18;
      const b2 = ((bubbleTime + 1.5) * 12) % 16;
      ctx.fillStyle = '#a7f3d0';
      ctx.beginPath();
      ctx.arc(screenX + 12, screenY + TILE_SIZE - 8 - b1, 3.5, 0, Math.PI * 2);
      ctx.arc(screenX + 32, screenY + TILE_SIZE - 6 - b2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Toxic warning skull silhouette at the surface
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(screenX + TILE_SIZE / 2, screenY + 30, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'hazard_snapper_plant': {
      // Carnivorous Rainforest Pitcher / Snapper Plant
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + 22;
      const snap = Math.abs(Math.sin(timeNow * 0.006));

      // Thorny plant stalk
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, screenY + TILE_SIZE);
      ctx.lineTo(cx, cy + 10);
      ctx.stroke();

      // Carnivorous jaw mouth (upper & lower)
      ctx.fillStyle = '#991b1b';
      ctx.strokeStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;

      // Upper jaw
      ctx.beginPath();
      ctx.ellipse(cx, cy - 2 - snap * 4, 15, 8, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Lower jaw
      ctx.beginPath();
      ctx.ellipse(cx, cy + 6 + snap * 4, 15, 8, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sharp white predatory fangs
      ctx.fillStyle = '#fef08a';
      for (let t = -10; t <= 10; t += 5) {
        // Upper fangs pointing down
        ctx.beginPath();
        ctx.moveTo(cx + t - 2, cy - snap * 4);
        ctx.lineTo(cx + t + 2, cy - snap * 4);
        ctx.lineTo(cx + t, cy + 4 - snap * 4);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'hazard_dart_trap': {
      // Ancient Aztec Stone Dart Spitter Trap
      ctx.fillStyle = '#334155';
      ctx.fillRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;

      // Carved idol eyes
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 10, cy - 8, 5, 4);
      ctx.fillRect(cx + 5, cy - 8, 5, 4);

      // Dart blow mouth orifice
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, cy + 4, 6, 0, Math.PI * 2);
      ctx.fill();

      // Poison dart projecting outwards with purple poison tip
      const dartPulse = (timeNow * 0.012) % 10;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(cx - 2, cy + 2 - dartPulse, 4, 10);
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 2 - dartPulse);
      ctx.lineTo(cx + 3, cy - 2 - dartPulse);
      ctx.lineTo(cx, cy - 8 - dartPulse);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'hazard_bamboo_spikes': {
      // Sharpened Bamboo Punji Stake Pit
      const stakes = 4;
      const sW = TILE_SIZE / stakes;
      for (let i = 0; i < stakes; i++) {
        const sx = screenX + i * sW;
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.moveTo(sx + 2, screenY + TILE_SIZE);
        ctx.lineTo(sx + sW - 2, screenY + TILE_SIZE);
        ctx.lineTo(sx + sW / 2 + 3, screenY + 4);
        ctx.closePath();
        ctx.fill();

        // Bamboo node line
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx + 3, screenY + 22);
        ctx.lineTo(sx + sW - 3, screenY + 22);
        ctx.stroke();

        // Dipped venom tip (sharp diagonal slice)
        ctx.fillStyle = '#4ade80';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(sx + sW / 2 + 3, screenY + 4);
        ctx.lineTo(sx + sW - 2, screenY + 12);
        ctx.lineTo(sx + 4, screenY + 10);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'hazard_jungle_saw': {
      // Ancient Mayan Sun Disc Sawblade
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;
      const radius = (TILE_SIZE / 2) - 8;
      const rot = (timeNow * 0.008) % (Math.PI * 2);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Gold serrated sun teeth
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#d97706';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5;

      const numTeeth = 10;
      ctx.beginPath();
      for (let i = 0; i < numTeeth; i++) {
        const a1 = (i * 2 * Math.PI) / numTeeth;
        const a2 = a1 + (Math.PI / numTeeth);
        const rOuter = radius + 5;
        const rInner = radius - 3;
        ctx.lineTo(Math.cos(a1) * rInner, Math.sin(a1) * rInner);
        ctx.lineTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
        ctx.lineTo(Math.cos(a2) * rInner, Math.sin(a2) * rInner);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ancient core disc
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
      ctx.fill();

      // Center glowing jade jewel
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      break;
    }

    // --- EXPANDED JUNGLE VISUAL DECOR ---
    case 'deco_monstera': {
      // Giant Tropical Rainforest Monstera Palm Frond (Decor)
      const sway = Math.sin(timeNow * 0.002) * 0.08;
      ctx.save();
      ctx.translate(screenX + 10, screenY + TILE_SIZE);
      ctx.rotate(sway);

      // Stem
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(10, -20, 26, -34);
      ctx.stroke();

      // Lush broad leaf
      ctx.fillStyle = '#15803d';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.ellipse(20, -26, 16, 10, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Monstera leaf fenestrations / splits
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(16, -28, 2.5, 0, Math.PI * 2);
      ctx.arc(24, -24, 3, 0, Math.PI * 2);
      ctx.fill();

      // Golden light vein
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8, -14);
      ctx.lineTo(26, -32);
      ctx.stroke();

      ctx.restore();
      break;
    }

    case 'deco_totem': {
      // Ancient Jungle Tiki Totem Face
      const cx = screenX + TILE_SIZE / 2;
      ctx.fillStyle = '#451a03';
      ctx.fillRect(cx - 12, screenY + 4, 24, TILE_SIZE - 4);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 12, screenY + 4, 24, TILE_SIZE - 4);

      // Tribal War Paint
      ctx.fillStyle = '#eab308';
      ctx.fillRect(cx - 10, screenY + 8, 20, 3);
      ctx.fillRect(cx - 10, screenY + 28, 20, 3);

      // Glowing Jade Eyes
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 10;
      ctx.fillRect(cx - 8, screenY + 14, 5, 4);
      ctx.fillRect(cx + 3, screenY + 14, 5, 4);

      // Fanged mouth
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(cx - 7, screenY + 21, 14, 4);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx - 5, screenY + 21, 3, 3);
      ctx.fillRect(cx + 2, screenY + 21, 3, 3);
      break;
    }

    case 'deco_fireflies': {
      // Swarm of Drifting Bioluminescent Golden-Green Fireflies (Decor)
      const t = timeNow * 0.003;
      const flies = [
        { x: 10 + Math.sin(t) * 6, y: 14 + Math.cos(t * 0.8) * 5, r: 2.5, color: '#facc15' },
        { x: 30 + Math.cos(t * 1.2) * 8, y: 18 + Math.sin(t * 0.7) * 7, r: 3, color: '#4ade80' },
        { x: 22 + Math.sin(t * 0.9 + 2) * 7, y: 32 + Math.cos(t * 1.1) * 6, r: 2, color: '#fef08a' },
        { x: 12 + Math.cos(t * 0.7 + 1) * 5, y: 36 + Math.sin(t * 0.9) * 5, r: 2.2, color: '#a3e635' }
      ];

      flies.forEach(f => {
        const pulse = Math.sin(t * 3 + f.x) * 0.5 + 0.8;
        ctx.fillStyle = f.color;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 10 * pulse;
        ctx.beginPath();
        ctx.arc(screenX + f.x, screenY + f.y, f.r * pulse, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }

    case 'deco_jungle_flower': {
      // Exotic Tropical Rainforest Orchid / Hibiscus (Decor)
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2 + 2;

      // Stem & foliage base
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, screenY + TILE_SIZE);
      ctx.lineTo(cx, cy + 6);
      ctx.stroke();

      // 5 Vibrant coral/magenta petals
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#fb7185';
      ctx.shadowBlur = 8;
      for (let p = 0; p < 5; p++) {
        const angle = (p * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = cx + Math.cos(angle) * 8;
        const py = cy + Math.sin(angle) * 8;
        ctx.beginPath();
        ctx.ellipse(px, py, 6, 9, angle, 0, Math.PI * 2);
        ctx.fill();
      }

      // Golden pollen stamen center
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#fef08a';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deco_waterfall': {
      // Shimmering Waterfall Mist & Spray (Decor)
      const wGrad = ctx.createLinearGradient(screenX, screenY, screenX, screenY + TILE_SIZE);
      wGrad.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
      wGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.7)');
      wGrad.addColorStop(1, 'rgba(255, 255, 255, 0.85)');

      ctx.fillStyle = wGrad;
      ctx.fillRect(screenX + 10, screenY, TILE_SIZE - 20, TILE_SIZE - 4);

      // Cascading water streaks
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.5;
      const streamOffset = (timeNow * 0.04) % 12;
      for (let sx = screenX + 14; sx <= screenX + TILE_SIZE - 14; sx += 6) {
        ctx.beginPath();
        ctx.moveTo(sx, screenY + streamOffset);
        ctx.lineTo(sx, screenY + TILE_SIZE - 6);
        ctx.stroke();
      }

      // Splash mist cloud at the bottom
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(screenX + 14, screenY + TILE_SIZE - 3, 5, 0, Math.PI * 2);
      ctx.arc(screenX + 24, screenY + TILE_SIZE - 5, 6, 0, Math.PI * 2);
      ctx.arc(screenX + 34, screenY + TILE_SIZE - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deco_torch': {
      // Temple Wall Torch with Flickering Amber Flame
      const cx = screenX + TILE_SIZE / 2;
      // Stone wall mount
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 8, screenY + 20, 16, 6);

      // Torch handle
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 3, screenY + 14, 6, 20);

      // Bronze cup
      ctx.fillStyle = '#b45309';
      ctx.fillRect(cx - 6, screenY + 12, 12, 5);

      // Animated dancing flame
      const flicker = Math.sin(timeNow * 0.018) * 2;
      const flickerY = Math.cos(timeNow * 0.022) * 2;

      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(cx, screenY + 9 + flickerY, 6 + Math.abs(flicker) * 0.5, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Yellow hot core
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(cx + flicker * 0.5, screenY + 10 + flickerY, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deco_mayan_mask': {
      // Golden Aztec Ceremonial Sun Mask (Decor)
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;

      // Gold mask plate
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#d97706';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 13, cy - 14, 26, 28, [8, 8, 4, 4]);
      ctx.fill();
      ctx.stroke();

      // Turquoise Idol Eyes
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(cx - 9, cy - 6, 6, 5);
      ctx.fillRect(cx + 3, cy - 6, 6, 5);

      // Headdress feather rays
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 14);
      ctx.lineTo(cx - 8, cy - 20);
      ctx.lineTo(cx - 4, cy - 14);
      ctx.moveTo(cx - 2, cy - 14);
      ctx.lineTo(cx, cy - 22);
      ctx.lineTo(cx + 2, cy - 14);
      ctx.moveTo(cx + 4, cy - 14);
      ctx.lineTo(cx + 8, cy - 20);
      ctx.lineTo(cx + 8, cy - 14);
      ctx.fill();
      break;
    }

    case 'deco_creeper': {
      // Hanging Weeping Moss Tendrils (Decor)
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2;
      const strands = [8, 16, 24, 32, 40];
      strands.forEach((sx, idx) => {
        const h = 16 + ((idx * 7) % 22);
        const wave = Math.sin(timeNow * 0.002 + idx) * 3;
        ctx.beginPath();
        ctx.moveTo(screenX + sx, screenY);
        ctx.quadraticCurveTo(screenX + sx + wave, screenY + h / 2, screenX + sx + wave * 0.5, screenY + h);
        ctx.stroke();
      });

      // Sprouting leaves along tendrils
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.arc(screenX + 16, screenY + 12, 2.5, 0, Math.PI * 2);
      ctx.arc(screenX + 32, screenY + 20, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deco_temple_pillar': {
      // Ancient Mayan Carved Stone Pillar / Column (Decor)
      const cx = screenX + TILE_SIZE / 2;
      // Capital & plinth
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 14, screenY + 2, 28, 6);
      ctx.fillRect(cx - 14, screenY + TILE_SIZE - 8, 28, 6);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 14, screenY + 2, 28, 6);
      ctx.strokeRect(cx - 14, screenY + TILE_SIZE - 8, 28, 6);

      // Main shaft
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 10, screenY + 8, 20, TILE_SIZE - 16);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(cx - 10, screenY + 8, 20, TILE_SIZE - 16);

      // Carved glyph relief lines
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, screenY + 16);
      ctx.lineTo(cx + 6, screenY + 16);
      ctx.moveTo(cx - 4, screenY + 22);
      ctx.lineTo(cx, screenY + 26);
      ctx.lineTo(cx + 4, screenY + 22);
      ctx.moveTo(cx - 6, screenY + 32);
      ctx.lineTo(cx + 6, screenY + 32);
      ctx.stroke();

      // Creeping moss overlay
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(cx - 8, screenY + 12, 3, 0, Math.PI * 2);
      ctx.arc(cx + 7, screenY + 24, 3.5, 0, Math.PI * 2);
      ctx.arc(cx - 7, screenY + 36, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deco_altar': {
      // Ancient Stone Sacrifice Altar / Shrine (Decor)
      const cx = screenX + TILE_SIZE / 2;
      // Stone base & plinth
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 16, screenY + 24, 32, 14);
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 14, screenY + 18, 28, 6);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 16, screenY + 24, 32, 14);
      ctx.strokeRect(cx - 14, screenY + 18, 28, 6);

      // Golden ceremonial offering basin
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, screenY + 16, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sacred offering aura glow
      const auraPulse = Math.sin(timeNow * 0.008) * 3;
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8 + auraPulse;
      ctx.beginPath();
      ctx.arc(cx, screenY + 12, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deco_sun_disc': {
      // Ceremonial Aztec Golden Sun Disc Plaque (Decor)
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;
      const radius = 14;

      // Radiating sunbeams
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      const rays = 8;
      for (let r = 0; r < rays; r++) {
        const ang = (r * Math.PI * 2) / rays;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang - 0.2) * (radius - 2), cy + Math.sin(ang - 0.2) * (radius - 2));
        ctx.lineTo(cx + Math.cos(ang) * (radius + 6), cy + Math.sin(ang) * (radius + 6));
        ctx.lineTo(cx + Math.cos(ang + 0.2) * (radius - 2), cy + Math.sin(ang + 0.2) * (radius - 2));
        ctx.closePath();
        ctx.fill();
      }

      // Outer gold circle
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner engraved ring
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();

      // Center glowing jade jewel
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deco_serpent_idol': {
      // Quetzalcoatl Feathered Serpent Stone Statue (Decor)
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2 + 2;

      // Stone plinth
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 14, screenY + TILE_SIZE - 8, 28, 6);

      // Serpent head stone snout
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 11, cy - 8, 22, 16, [6, 6, 2, 2]);
      ctx.fill();
      ctx.stroke();

      // Stone serpent fangs
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy + 8);
      ctx.lineTo(cx - 4, cy + 8);
      ctx.lineTo(cx - 5.5, cy + 13);
      ctx.closePath();
      ctx.moveTo(cx + 4, cy + 8);
      ctx.lineTo(cx + 7, cy + 8);
      ctx.lineTo(cx + 5.5, cy + 13);
      ctx.closePath();
      ctx.fill();

      // Feathered headdress crown crest
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 8);
      ctx.lineTo(cx - 14, cy - 16);
      ctx.lineTo(cx - 6, cy - 8);
      ctx.moveTo(cx - 5, cy - 8);
      ctx.lineTo(cx, cy - 18);
      ctx.lineTo(cx + 5, cy - 8);
      ctx.moveTo(cx + 6, cy - 8);
      ctx.lineTo(cx + 14, cy - 16);
      ctx.lineTo(cx + 10, cy - 8);
      ctx.fill();

      // Glowing emerald serpent eyes
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 8;
      ctx.fillRect(cx - 8, cy - 4, 4, 3);
      ctx.fillRect(cx + 4, cy - 4, 4, 3);
      break;
    }

    case 'deco_temple_urn': {
      // Ancient Terracotta Urn / Clay Vessel (Decor)
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + 26;

      // Rounded pottery vessel belly
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 11, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pottery rim & neck
      ctx.fillStyle = '#92400e';
      ctx.fillRect(cx - 7, cy - 14, 14, 4);
      ctx.fillRect(cx - 9, cy - 16, 18, 3);

      // Mayan geometric paint stripe
      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx - 10, cy - 3, 20, 3);
      ctx.fillStyle = '#78350f';
      for (let p = cx - 8; p < cx + 9; p += 4) {
        ctx.fillRect(p, cy - 3, 2, 3);
      }

      // Sprouting jungle fern fronds from urn rim
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - 16);
      ctx.quadraticCurveTo(cx - 12, cy - 22, cx - 14, cy - 18);
      ctx.moveTo(cx + 2, cy - 16);
      ctx.quadraticCurveTo(cx + 12, cy - 22, cx + 14, cy - 18);
      ctx.stroke();
      break;
    }

    case 'deco_tribal_banner': {
      // Woven Ceremonial Temple Tapestry Banner (Decor)
      const cx = screenX + TILE_SIZE / 2;
      const sway = Math.sin(timeNow * 0.003) * 1.5;

      // Wooden wall rod
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 15, screenY + 4, 30, 4);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx - 16, screenY + 3, 3, 6);
      ctx.fillRect(cx + 13, screenY + 3, 3, 6);

      // Crimson ceremonial banner cloth
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.moveTo(cx - 11, screenY + 8);
      ctx.lineTo(cx + 11, screenY + 8);
      ctx.lineTo(cx + 11 + sway, screenY + 34);
      ctx.lineTo(cx + sway, screenY + 38);
      ctx.lineTo(cx - 11 + sway, screenY + 34);
      ctx.closePath();
      ctx.fill();

      // Gold embroidered Aztec diamond pattern
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + sway * 0.5, screenY + 14);
      ctx.lineTo(cx + 5 + sway * 0.5, screenY + 20);
      ctx.lineTo(cx + sway * 0.5, screenY + 26);
      ctx.lineTo(cx - 5 + sway * 0.5, screenY + 20);
      ctx.closePath();
      ctx.stroke();

      // Golden fringe tassels at bottom
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      for (let t = -8; t <= 8; t += 4) {
        ctx.beginPath();
        ctx.moveTo(cx + t + sway, screenY + 35);
        ctx.lineTo(cx + t + sway * 1.2, screenY + 41);
        ctx.stroke();
      }
      break;
    }

    case 'deco_jade_statue': {
      // Sacred Carved Jade Idol Statue (Decor)
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + 20;

      // Obsidian stepped plinth
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 12, screenY + TILE_SIZE - 10, 24, 8);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 9, screenY + TILE_SIZE - 14, 18, 5);

      // Shimmering carved jade idol body
      ctx.fillStyle = '#059669';
      ctx.strokeStyle = '#34d399';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 8, cy - 8, 16, 18, [6, 6, 2, 2]);
      ctx.fill();
      ctx.stroke();

      // Translucent inner jewel core
      ctx.fillStyle = '#6ee7b7';
      ctx.beginPath();
      ctx.arc(cx, cy - 1, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deco_temple_stairs': {
      // Ancient Stepped Temple Masonry Ruins (Decor)
      // Tier 1 (bottom)
      ctx.fillStyle = '#334155';
      ctx.fillRect(screenX + 2, screenY + 28, TILE_SIZE - 4, 18);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX + 2, screenY + 28, TILE_SIZE - 4, 18);

      // Tier 2 (middle)
      ctx.fillStyle = '#475569';
      ctx.fillRect(screenX + 8, screenY + 16, TILE_SIZE - 16, 13);
      ctx.strokeStyle = '#64748b';
      ctx.strokeRect(screenX + 8, screenY + 16, TILE_SIZE - 16, 13);

      // Tier 3 (top)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(screenX + 14, screenY + 6, TILE_SIZE - 28, 11);
      ctx.strokeStyle = '#94a3b8';
      ctx.strokeRect(screenX + 14, screenY + 6, TILE_SIZE - 28, 11);

      // Moss creep accents on steps
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(screenX + 6, screenY + 28, 3, 0, Math.PI * 2);
      ctx.arc(screenX + 12, screenY + 16, 2.5, 0, Math.PI * 2);
      ctx.arc(screenX + 34, screenY + 28, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // --- EXPANDED MAYAN TEMPLE ARCHITECTURE & PROP DECORS ---
    case 'deco_temple_doorway': {
      // Sacred Temple Sanctum Corbel Archway Portal
      // Outer stepped stone frame
      ctx.fillStyle = '#292524';
      ctx.fillRect(screenX + 4, screenY, TILE_SIZE - 8, TILE_SIZE);
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX + 4, screenY, TILE_SIZE - 8, TILE_SIZE);

      // Deep dark mystical interior void
      ctx.fillStyle = '#0c0a09';
      ctx.beginPath();
      // Stepped Corbel Arch interior
      ctx.moveTo(screenX + 10, screenY + TILE_SIZE);
      ctx.lineTo(screenX + 10, screenY + 16);
      ctx.lineTo(screenX + 13, screenY + 16);
      ctx.lineTo(screenX + 13, screenY + 10);
      ctx.lineTo(screenX + 16, screenY + 10);
      ctx.lineTo(screenX + 16, screenY + 6);
      ctx.lineTo(screenX + 24, screenY + 6);
      ctx.lineTo(screenX + 24, screenY + 10);
      ctx.lineTo(screenX + 27, screenY + 10);
      ctx.lineTo(screenX + 27, screenY + 16);
      ctx.lineTo(screenX + 30, screenY + 16);
      ctx.lineTo(screenX + 30, screenY + TILE_SIZE);
      ctx.closePath();
      ctx.fill();

      // Golden ceremonial threshold & lintel
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(screenX + 8, screenY + 2, TILE_SIZE - 16, 3);
      ctx.fillRect(screenX + 6, screenY + TILE_SIZE - 3, TILE_SIZE - 12, 3);

      // Mystical inner amber eye glow inside sanctum
      const glowAlpha = 0.5 + 0.3 * Math.sin(timeNow * 0.003);
      ctx.fillStyle = `rgba(245, 158, 11, ${glowAlpha})`;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(screenX + TILE_SIZE / 2, screenY + 22, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deco_temple_roof_comb': {
      // Towering Pierced Stone Roof Comb (Temple Pinnacle Crest)
      ctx.fillStyle = '#44403c';
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 1.5;

      // Central stepped stone crest spire
      ctx.beginPath();
      ctx.moveTo(screenX + 8, screenY + TILE_SIZE);
      ctx.lineTo(screenX + 8, screenY + 14);
      ctx.lineTo(screenX + 14, screenY + 14);
      ctx.lineTo(screenX + 14, screenY + 6);
      ctx.lineTo(screenX + 20, screenY + 2);
      ctx.lineTo(screenX + 26, screenY + 6);
      ctx.lineTo(screenX + 26, screenY + 14);
      ctx.lineTo(screenX + 32, screenY + 14);
      ctx.lineTo(screenX + 32, screenY + TILE_SIZE);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pierced openwork vertical slots (hallmark of Maya architecture)
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(screenX + 12, screenY + 18, 4, 16);
      ctx.fillRect(screenX + 18, screenY + 10, 4, 24);
      ctx.fillRect(screenX + 24, screenY + 18, 4, 16);

      // Crown gold finial ornament
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(screenX + 20, screenY + 4, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'deco_brazier': {
      // Ancient Ceremonial Stone Fire Brazier / Basin
      const cx = screenX + TILE_SIZE / 2;
      const baseTopY = screenY + 22;

      // Stepped stone pedestal
      ctx.fillStyle = '#292524';
      ctx.fillRect(cx - 10, screenY + 34, 20, 6);
      ctx.fillRect(cx - 6, screenY + 28, 12, 6);
      ctx.strokeStyle = '#57534e';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 10, screenY + 34, 20, 6);

      // Wide stone fire bowl
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.moveTo(cx - 14, baseTopY);
      ctx.lineTo(cx + 14, baseTopY);
      ctx.lineTo(cx + 8, baseTopY + 8);
      ctx.lineTo(cx - 8, baseTopY + 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.stroke();

      // Glowing hot coal bed
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(cx - 10, baseTopY + 1, 20, 3);

      // Dancing Sacred Ceremonial Flames
      const flicker1 = Math.sin(timeNow * 0.012) * 2;
      const flicker2 = Math.cos(timeNow * 0.015) * 2;
      const flameH = 14 + Math.sin(timeNow * 0.009) * 3;

      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cx - 10, baseTopY + 2);
      ctx.quadraticCurveTo(cx - 6 + flicker1, baseTopY - flameH * 0.6, cx + flicker2, baseTopY - flameH);
      ctx.quadraticCurveTo(cx + 6 + flicker2, baseTopY - flameH * 0.6, cx + 10, baseTopY + 2);
      ctx.closePath();
      ctx.fill();

      // Inner white-hot flame core
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#fef08a';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 5, baseTopY + 2);
      ctx.quadraticCurveTo(cx - 2, baseTopY - flameH * 0.4, cx + flicker1 * 0.5, baseTopY - flameH * 0.7);
      ctx.quadraticCurveTo(cx + 2, baseTopY - flameH * 0.4, cx + 5, baseTopY + 2);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'deco_wall_torch': {
      // Wall-Mounted Sconce Torch (Designed to be placed ON blocks & walls!)
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;

      // Stone & Bronze wall bracket plate (anchored to the block)
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(cx - 6, cy + 2, 12, 14);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 6, cy + 2, 12, 14);

      // Bronze bracket rivets
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx - 4, cy + 4, 2, 2);
      ctx.fillRect(cx + 2, cy + 4, 2, 2);
      ctx.fillRect(cx - 4, cy + 12, 2, 2);
      ctx.fillRect(cx + 2, cy + 12, 2, 2);

      // Angled wooden/iron torch stalk
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 12);
      ctx.lineTo(cx, cy - 2);
      ctx.stroke();

      // Hemp fiber wrapping around torch head
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 4, cy - 6, 8, 6);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 4, cy - 6, 8, 6);

      // Flickering Sconce Flame
      const flameW = 12 + Math.sin(timeNow * 0.015) * 3;
      const flameH = 16 + Math.cos(timeNow * 0.012) * 4;
      const flameSway = Math.sin(timeNow * 0.01) * 2;

      // Torch outer amber fire glow
      ctx.fillStyle = '#f97316';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 6);
      ctx.quadraticCurveTo(cx - flameW / 2, cy - 6 - flameH * 0.5, cx + flameSway, cy - 6 - flameH);
      ctx.quadraticCurveTo(cx + flameW / 2, cy - 6 - flameH * 0.5, cx + 4, cy - 6);
      ctx.closePath();
      ctx.fill();

      // Inner intense golden core
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - 6);
      ctx.quadraticCurveTo(cx - 2, cy - 6 - flameH * 0.4, cx + flameSway * 0.6, cy - 6 - flameH * 0.7);
      ctx.quadraticCurveTo(cx + 2, cy - 6 - flameH * 0.4, cx + 2, cy - 6);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'deco_skull_relief': {
      // Mayan Tzompantli Ceremonial Carved Stone Skull Wall
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(screenX + 2, screenY + 6, TILE_SIZE - 4, TILE_SIZE - 12);
      ctx.strokeStyle = '#57534e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX + 2, screenY + 6, TILE_SIZE - 4, TILE_SIZE - 12);

      // Dual carved stone skulls
      [screenX + 11, screenX + 27].forEach(skX => {
        const skY = screenY + 18;
        // Cranium
        ctx.fillStyle = '#d6d3d1';
        ctx.beginPath();
        ctx.arc(skX, skY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Maxilla / teeth block
        ctx.fillRect(skX - 4, skY + 3, 8, 5);

        // Dark hollow eye sockets
        ctx.fillStyle = '#0c0a09';
        ctx.beginPath();
        ctx.arc(skX - 2.5, skY - 1, 1.8, 0, Math.PI * 2);
        ctx.arc(skX + 2.5, skY - 1, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Nasal cavity
        ctx.fillRect(skX - 1, skY + 2, 2, 2);

        // Teeth vertical slits
        ctx.strokeStyle = '#44403c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(skX - 2, skY + 4);
        ctx.lineTo(skX - 2, skY + 8);
        ctx.moveTo(skX + 2, skY + 4);
        ctx.lineTo(skX + 2, skY + 8);
        ctx.stroke();
      });

      // Blood red ceremonial pigment accent lines
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(screenX + 4, screenY + 8);
      ctx.lineTo(screenX + TILE_SIZE - 4, screenY + 8);
      ctx.stroke();
      break;
    }

    case 'deco_mayan_hieroglyphs': {
      // Horizontal Mayan Calendar Hieroglyphic Stone Band
      ctx.fillStyle = '#292524';
      ctx.fillRect(screenX, screenY + 8, TILE_SIZE, TILE_SIZE - 16);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX, screenY + 8, TILE_SIZE, TILE_SIZE - 16);

      // 3 Square Maya glyph cartouches
      const glyphW = 10;
      for (let g = 0; g < 3; g++) {
        const gx = screenX + 3 + g * 12;
        const gy = screenY + 11;
        // Cartouche box
        ctx.fillStyle = '#44403c';
        ctx.fillRect(gx, gy, glyphW, 18);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.strokeRect(gx, gy, glyphW, 18);

        // Number dots and bars on top
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(gx + 2, gy + 2, 6, 2); // 5-bar
        ctx.beginPath();
        ctx.arc(gx + 3, gy + 7, 1, 0, Math.PI * 2); // 1-dot
        ctx.arc(gx + 7, gy + 7, 1, 0, Math.PI * 2); // 1-dot
        ctx.fill();

        // Stylized inner sign curve
        ctx.strokeStyle = '#34d399'; // jade accent
        ctx.beginPath();
        ctx.arc(gx + 5, gy + 13, 2.5, 0, Math.PI * 1.5);
        ctx.stroke();
      }
      break;
    }

    case 'deco_hanging_roots': {
      // Deep Rainforest Hanging Roots & Strangler Fig Tendrils (drapes from blocks/ceilings)
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.5;

      // 3 organic dangling root vines
      const rootOffsets = [8, 20, 32];
      rootOffsets.forEach((rx, idx) => {
        const sway = Math.sin(timeNow * 0.002 + idx) * 3;
        const rootLen = 22 + (idx % 2) * 12;
        ctx.beginPath();
        ctx.moveTo(screenX + rx, screenY);
        ctx.quadraticCurveTo(screenX + rx + sway, screenY + rootLen * 0.5, screenX + rx + sway * 0.6, screenY + rootLen);
        ctx.stroke();

        // Little green root buds / moss tufts
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(screenX + rx + sway * 0.6, screenY + rootLen, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Smaller side hanging air roots
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(screenX + 14, screenY);
      ctx.lineTo(screenX + 12, screenY + 16);
      ctx.moveTo(screenX + 26, screenY);
      ctx.lineTo(screenX + 28, screenY + 18);
      ctx.stroke();
      break;
    }

    case 'deco_golden_sun_altar': {
      // Sacred Golden Solar Deity Chamber Shrine
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;

      // Dark basalt recess disc
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Radiating golden solar rays (12 rays)
      ctx.fillStyle = '#f59e0b';
      for (let r = 0; r < 12; r++) {
        const ang = (r * Math.PI) / 6;
        const tipX = cx + Math.cos(ang) * 15;
        const tipY = cy + Math.sin(ang) * 15;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Central Golden Face Disc
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();

      // Jade Amulet Center
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a7f3d0';
      ctx.beginPath();
      ctx.arc(cx - 1, cy - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    // ==========================================
    case 'block_amethyst': {
      // Faceted Purple Crystal Block
      ctx.fillStyle = '#2e1065';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Crystal facet cuts
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(screenX + TILE_SIZE / 2, screenY + 4);
      ctx.lineTo(screenX + TILE_SIZE - 4, screenY + TILE_SIZE / 2);
      ctx.lineTo(screenX + TILE_SIZE / 2, screenY + TILE_SIZE - 4);
      ctx.lineTo(screenX + 4, screenY + TILE_SIZE / 2);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = '#d8b4fe';
      ctx.beginPath();
      ctx.arc(screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'block_slate': {
      // Deep-Slate Basalt Bedrock
      ctx.fillStyle = '#09090b';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

      // Brick strata lines
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + TILE_SIZE / 2);
      ctx.lineTo(screenX + TILE_SIZE, screenY + TILE_SIZE / 2);
      ctx.moveTo(screenX + TILE_SIZE / 2, screenY);
      ctx.lineTo(screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
      ctx.moveTo(screenX + TILE_SIZE / 4, screenY + TILE_SIZE / 2);
      ctx.lineTo(screenX + TILE_SIZE / 4, screenY + TILE_SIZE);
      ctx.stroke();
      break;
    }
    case 'block_gem_cyan': {
      // Cyan Radiant Gem Prism Block
      ctx.fillStyle = '#083344';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Diagonal prism facets
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(screenX + 6, screenY + 6);
      ctx.lineTo(screenX + TILE_SIZE - 6, screenY + TILE_SIZE - 6);
      ctx.stroke();
      break;
    }
    case 'hazard_crystal': {
      // Sharp Amethyst Spikes Hazard
      ctx.fillStyle = '#6b21a8';
      ctx.strokeStyle = '#c084fc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;

      const cSteps = 3;
      const cW = TILE_SIZE / cSteps;
      for (let i = 0; i < cSteps; i++) {
        const cx = screenX + i * cW;
        ctx.beginPath();
        ctx.moveTo(cx + cW / 2, screenY + 4);
        ctx.lineTo(cx + cW - 1, screenY + TILE_SIZE);
        ctx.lineTo(cx + 1, screenY + TILE_SIZE);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'hazard_magma': {
      // Molten Magma Pit Hazard
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(screenX, screenY + TILE_SIZE - 16, TILE_SIZE, 16);
      ctx.strokeStyle = '#f97316';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      // Glowing lava waves
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + TILE_SIZE - 12);
      ctx.bezierCurveTo(
        screenX + 12, screenY + TILE_SIZE - 20,
        screenX + 28, screenY + TILE_SIZE - 4,
        screenX + TILE_SIZE, screenY + TILE_SIZE - 12
      );
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(screenX + 10, screenY + TILE_SIZE - 8, 8, 4);
      ctx.fillRect(screenX + 28, screenY + TILE_SIZE - 10, 6, 4);
      break;
    }
    case 'deco_crystal': {
      // Prismatic Crystal Cluster (Decor)
      ctx.save();
      ctx.fillStyle = 'rgba(168, 85, 247, 0.7)';
      ctx.strokeStyle = '#e9d5ff';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5;

      // Center tall crystal
      ctx.beginPath();
      ctx.moveTo(screenX + TILE_SIZE / 2, screenY + 6);
      ctx.lineTo(screenX + TILE_SIZE / 2 + 7, screenY + TILE_SIZE - 4);
      ctx.lineTo(screenX + TILE_SIZE / 2 - 7, screenY + TILE_SIZE - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Left angled shard
      ctx.beginPath();
      ctx.moveTo(screenX + 12, screenY + 16);
      ctx.lineTo(screenX + 18, screenY + TILE_SIZE - 4);
      ctx.lineTo(screenX + 8, screenY + TILE_SIZE - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'deco_rune': {
      // Glowing Mystic Arcane Rune (Decor)
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#0ea5e9';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.stroke();
      // Triangle rune inside
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9);
      ctx.lineTo(cx + 8, cy + 6);
      ctx.lineTo(cx - 8, cy + 6);
      ctx.closePath();
      ctx.stroke();
      break;
    }

    // ==========================================
    // 8. INDUSTRIAL & FACTORY THEMED OBJECTS
    // ==========================================
    case 'block_hazard_stripe': {
      // Caution Black & Yellow Industrial Diagonal Chevron Block
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.rect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.clip();

      ctx.fillStyle = '#eab308';
      const stripeW = 10;
      for (let s = -TILE_SIZE; s < TILE_SIZE * 2; s += stripeW * 2) {
        ctx.beginPath();
        ctx.moveTo(screenX + s, screenY);
        ctx.lineTo(screenX + s + stripeW, screenY);
        ctx.lineTo(screenX + s + stripeW + TILE_SIZE, screenY + TILE_SIZE);
        ctx.lineTo(screenX + s + TILE_SIZE, screenY + TILE_SIZE);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      break;
    }
    case 'block_grate': {
      // Industrial Steel Catwalk Grating
      ctx.fillStyle = '#18181b';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

      // Mesh holes
      const spacing = 8;
      ctx.fillStyle = '#09090b';
      for (let gx = screenX + 4; gx < screenX + TILE_SIZE - 4; gx += spacing) {
        for (let gy = screenY + 4; gy < screenY + TILE_SIZE - 4; gy += spacing) {
          ctx.fillRect(gx, gy, 4, 4);
        }
      }
      break;
    }
    case 'block_rivet': {
      // Heavy Steel Reinforced Girder with Bolts
      ctx.fillStyle = '#27272a';
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 2, screenY + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      // Diagonal girder brace
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(screenX + 4, screenY + 4);
      ctx.lineTo(screenX + TILE_SIZE - 4, screenY + TILE_SIZE - 4);
      ctx.stroke();

      // Corner industrial rivets
      ctx.fillStyle = '#e4e4e7';
      [6, TILE_SIZE - 8].forEach(rx => {
        [6, TILE_SIZE - 8].forEach(ry => {
          ctx.beginPath();
          ctx.arc(screenX + rx, screenY + ry, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      break;
    }
    case 'hazard_laser': {
      // Electric Zap Laser Emitter Beam Hazard
      const cy = screenY + TILE_SIZE / 2;
      // Laser core
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#f87171';
      ctx.shadowBlur = 12;
      ctx.fillRect(screenX, cy - 4, TILE_SIZE, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(screenX, cy - 1.5, TILE_SIZE, 3);

      // Emitter mounts on sides
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(screenX, cy - 8, 4, 16);
      ctx.fillRect(screenX + TILE_SIZE - 4, cy - 8, 4, 16);
      break;
    }
    case 'hazard_steam': {
      // High Pressure Scalding Steam Hazard
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(screenX + 8, screenY + TILE_SIZE - 8, TILE_SIZE - 16, 8);
      // Steam plume
      ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(screenX + TILE_SIZE / 2, screenY + 16, 12, 0, Math.PI * 2);
      ctx.arc(screenX + 16, screenY + 24, 8, 0, Math.PI * 2);
      ctx.arc(screenX + 32, screenY + 24, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'deco_cog': {
      // Rotating Industrial Cog / Gear (Decor)
      const cx = screenX + TILE_SIZE / 2;
      const cy = screenY + TILE_SIZE / 2;
      const rotGear = (timeNow * 0.003) % (Math.PI * 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotGear);
      ctx.fillStyle = '#52525b';
      ctx.strokeStyle = '#a1a1aa';
      ctx.lineWidth = 1.5;

      const numTeeth = 6;
      ctx.beginPath();
      for (let t = 0; t < numTeeth; t++) {
        const a = (Math.PI * 2 * t) / numTeeth;
        ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
        ctx.lineTo(Math.cos(a + 0.25) * 12, Math.sin(a + 0.25) * 12);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center hole
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'deco_vent': {
      // Factory Ventilation Louvers (Decor)
      ctx.fillStyle = '#27272a';
      ctx.fillRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      // Louvers
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 2;
      for (let ly = screenY + 12; ly < screenY + TILE_SIZE - 8; ly += 6) {
        ctx.beginPath();
        ctx.moveTo(screenX + 8, ly);
        ctx.lineTo(screenX + TILE_SIZE - 8, ly);
        ctx.stroke();
      }
      break;
    }
    case 'deco_cables': {
      // Hanging Heavy Power Conduit Bundle (Decor)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + 6);
      ctx.quadraticCurveTo(screenX + TILE_SIZE / 2, screenY + 28, screenX + TILE_SIZE, screenY + 6);
      ctx.stroke();

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + 14);
      ctx.quadraticCurveTo(screenX + TILE_SIZE / 2, screenY + 38, screenX + TILE_SIZE, screenY + 14);
      ctx.stroke();
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

/**
 * Draws animated portal arches.
 */
function drawPortal(ctx, type, screenX, screenY, timeNow) {
  const portalColors = {
    portal_gravity_inv: { color: '#38bdf8', label: 'GRAV ▲' },
    portal_gravity_norm: { color: '#eab308', label: 'GRAV ▼' },
    portal_speed_slow: { color: '#0284c7', label: '0.7x' },
    portal_speed_normal: { color: '#eab308', label: '1.0x' },
    portal_speed_fast: { color: '#ef4444', label: '1.5x' },
    portal_fly: { color: '#ec4899', label: 'ROCKET' },
    portal_runner: { color: '#10b981', label: 'RUNNER' }
  }[type] || { color: '#06b6d4', label: 'PORTAL' };

  const height = TILE_SIZE * 2;
  const topY = screenY - TILE_SIZE;

  ctx.save();
  // Outer frame arch
  ctx.strokeStyle = portalColors.color;
  ctx.shadowColor = portalColors.color;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(screenX + TILE_SIZE / 2, topY + height / 2, TILE_SIZE / 3, height / 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Swirling vortex center
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.ellipse(screenX + TILE_SIZE / 2, topY + height / 2, TILE_SIZE / 4, height / 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mini label tag above portal
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px "Chakra Petch", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(portalColors.label, screenX + TILE_SIZE / 2, topY - 6);

  ctx.restore();
}

/**
 * Practice mode checkpoint diamond marker.
 */
function drawCheckpointMarker(ctx, x, y, timeNow) {
  ctx.save();
  const pulse = Math.sin(timeNow * 0.008) * 3;
  ctx.fillStyle = '#22c55e';
  ctx.shadowColor = '#22c55e';
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.moveTo(x, y - 12 - pulse);
  ctx.lineTo(x + 10 + pulse, y);
  ctx.lineTo(x, y + 12 + pulse);
  ctx.lineTo(x - 10 - pulse, y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CP', x, y + 3);
  ctx.restore();
}
