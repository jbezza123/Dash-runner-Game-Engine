/**
 * Spritesheet & Atlas Manager
 * Provides packing, slicing, storing, and exporting of 2D spritesheets.
 */

const SPRITESHEETS_STORAGE_KEY = 'dash_runner_spritesheets';

/**
 * Get all stored spritesheets from localStorage
 * @returns {Array}
 */
export function getSavedSpritesheets() {
  try {
    const raw = localStorage.getItem(SPRITESHEETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Error reading saved spritesheets from localStorage:', err);
    return [];
  }
}

/**
 * Save spritesheets list to localStorage
 * @param {Array} sheets
 */
export function saveSpritesheets(sheets) {
  try {
    if (!Array.isArray(sheets)) return;
    localStorage.setItem(SPRITESHEETS_STORAGE_KEY, JSON.stringify(sheets));
  } catch (err) {
    console.warn('Error saving spritesheets to localStorage:', err);
  }
}

/**
 * Save or update a single spritesheet
 * @param {Object} sheet
 * @returns {Array}
 */
export function upsertSpritesheet(sheet) {
  try {
    if (!sheet || !sheet.id) return getSavedSpritesheets();
    const list = getSavedSpritesheets();
    const index = list.findIndex(s => s.id === sheet.id);
    let updated;
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...list[index], ...sheet, updatedAt: Date.now() };
    } else {
      updated = [{ ...sheet, createdAt: Date.now(), updatedAt: Date.now() }, ...list];
    }
    saveSpritesheets(updated);
    return updated;
  } catch (err) {
    console.warn('Error upserting spritesheet:', err);
    return getSavedSpritesheets();
  }
}

/**
 * Delete a spritesheet by ID
 * @param {string} id
 * @returns {Array}
 */
export function deleteSpritesheet(id) {
  try {
    const list = getSavedSpritesheets();
    const updated = list.filter(s => s.id !== id);
    saveSpritesheets(updated);
    return updated;
  } catch (err) {
    console.warn('Error deleting spritesheet:', err);
    return getSavedSpritesheets();
  }
}

/**
 * Pack multiple images into a single spritesheet canvas and return atlas data
 * @param {Array<{ id: string, name: string, img: HTMLImageElement, dataUrl: string }>} imageItems
 * @param {Object} options { padding: number, maxSheetWidth: number }
 * @returns {Promise<{ dataUrl: string, width: number, height: number, sprites: Array }>}
 */
export async function packImagesToSpritesheet(imageItems, options = {}) {
  try {
    if (!Array.isArray(imageItems) || imageItems.length === 0) {
      throw new Error('No images provided to pack.');
    }

    const padding = typeof options.padding === 'number' ? options.padding : 2;
    const maxSheetWidth = options.maxSheetWidth || 1024;

    // Measure and sort items by height descending for better packing
    const rects = imageItems.map(item => {
      const w = Math.max(1, item.img?.naturalWidth || item.width || 64);
      const h = Math.max(1, item.img?.naturalHeight || item.height || 64);
      return {
        id: item.id || `spr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: item.name || 'Sprite',
        w,
        h,
        img: item.img,
        sourceUrl: item.dataUrl || item.url || ''
      };
    }).sort((a, b) => b.h - a.h);

    // Simple shelf/row packer
    let currentX = padding;
    let currentY = padding;
    let rowHeight = 0;
    let sheetWidth = 0;
    let sheetHeight = 0;

    const placements = [];

    for (const rect of rects) {
      if (currentX + rect.w + padding > maxSheetWidth && currentX > padding) {
        // Move to next shelf
        currentX = padding;
        currentY += rowHeight + padding;
        rowHeight = 0;
      }

      placements.push({
        ...rect,
        x: currentX,
        y: currentY
      });

      rowHeight = Math.max(rowHeight, rect.h);
      sheetWidth = Math.max(sheetWidth, currentX + rect.w + padding);
      sheetHeight = Math.max(sheetHeight, currentY + rect.h + padding);

      currentX += rect.w + padding;
    }

    // Power of two or rounded dimensions
    sheetWidth = Math.max(64, Math.ceil(sheetWidth));
    sheetHeight = Math.max(64, Math.ceil(sheetHeight));

    // Paint onto canvas
    const canvas = document.createElement('canvas');
    canvas.width = sheetWidth;
    canvas.height = sheetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create 2D canvas context.');

    ctx.clearRect(0, 0, sheetWidth, sheetHeight);

    const generatedSprites = [];

    for (const p of placements) {
      if (p.img) {
        ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
      }

      // Extract individual sprite data URL for standalone use
      const spriteCanvas = document.createElement('canvas');
      spriteCanvas.width = p.w;
      spriteCanvas.height = p.h;
      const sctx = spriteCanvas.getContext('2d');
      if (sctx && p.img) {
        sctx.drawImage(p.img, 0, 0, p.w, p.h);
      }

      const spriteDataUrl = spriteCanvas.toDataURL('image/png');

      generatedSprites.push({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        width: p.w,
        height: p.h,
        dataUrl: spriteDataUrl
      });
    }

    const sheetDataUrl = canvas.toDataURL('image/png');

    return {
      dataUrl: sheetDataUrl,
      width: sheetWidth,
      height: sheetHeight,
      sprites: generatedSprites
    };
  } catch (err) {
    console.error('Error packing spritesheet:', err);
    throw err;
  }
}

/**
 * Slice an image aligned over a multi-block grid into individual blocks
 * @param {HTMLImageElement} img
 * @param {Object} config { gridCols: number, gridRows: number, blockSize: number, offsetX: number, offsetY: number, scale: number, baseName: string }
 * @returns {Array<{ col: number, row: number, name: string, dataUrl: string, width: number, height: number }>}
 */
export function sliceImageToBlocks(img, config = {}) {
  try {
    if (!img) throw new Error('Valid Image element required for block slicing.');

    const gridCols = Math.max(1, Math.min(32, Number(config.gridCols) || 2));
    const gridRows = Math.max(1, Math.min(32, Number(config.gridRows) || 2));
    const blockSize = Math.max(16, Number(config.blockSize) || 64);
    const offsetX = Number(config.offsetX) || 0;
    const offsetY = Number(config.offsetY) || 0;
    const scale = Number(config.scale) || 1;
    const baseName = (config.baseName || 'Block').trim();

    const totalWidth = gridCols * blockSize;
    const totalHeight = gridRows * blockSize;

    // Render the aligned composite first
    const compCanvas = document.createElement('canvas');
    compCanvas.width = totalWidth;
    compCanvas.height = totalHeight;
    const cctx = compCanvas.getContext('2d');
    if (!cctx) throw new Error('Could not create composite canvas.');

    cctx.clearRect(0, 0, totalWidth, totalHeight);

    // Draw the image transformed according to user scale and offset
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    cctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    // Now slice out each grid cell (block)
    const blocks = [];

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const cellX = c * blockSize;
        const cellY = r * blockSize;

        const cellCanvas = document.createElement('canvas');
        cellCanvas.width = blockSize;
        cellCanvas.height = blockSize;
        const cellCtx = cellCanvas.getContext('2d');

        if (cellCtx) {
          cellCtx.clearRect(0, 0, blockSize, blockSize);
          cellCtx.drawImage(
            compCanvas,
            cellX, cellY, blockSize, blockSize,
            0, 0, blockSize, blockSize
          );
        }

        const dataUrl = cellCanvas.toDataURL('image/png');
        
        let positionDesc = `(${c},${r})`;
        if (gridCols === 2 && gridRows === 2) {
          if (r === 0 && c === 0) positionDesc = 'Top-Left';
          else if (r === 0 && c === 1) positionDesc = 'Top-Right';
          else if (r === 1 && c === 0) positionDesc = 'Bottom-Left';
          else if (r === 1 && c === 1) positionDesc = 'Bottom-Right';
        }

        blocks.push({
          id: `blk_${Date.now()}_r${r}_c${c}_${Math.random().toString(36).substr(2, 4)}`,
          col: c,
          row: r,
          name: `${baseName} [${positionDesc}]`,
          width: blockSize,
          height: blockSize,
          dataUrl
        });
      }
    }

    return blocks;
  } catch (err) {
    console.error('Error slicing image to blocks:', err);
    throw err;
  }
}

/**
 * Generate texture atlas export text in multiple formats
 * @param {Object} spritesheet
 * @param {'json'|'csv'|'text'} format
 * @returns {string}
 */
export function generateAtlasExportText(spritesheet, format = 'json') {
  try {
    if (!spritesheet || !Array.isArray(spritesheet.sprites)) return '';

    if (format === 'json') {
      const atlas = {
        meta: {
          app: 'Dash Runner Spritesheet Studio',
          version: '1.0',
          image: spritesheet.name ? `${spritesheet.name.toLowerCase().replace(/\s+/g, '_')}.png` : 'spritesheet.png',
          size: { w: spritesheet.width || 0, h: spritesheet.height || 0 },
          scale: '1'
        },
        frames: {}
      };

      spritesheet.sprites.forEach(spr => {
        atlas.frames[spr.name || spr.id] = {
          frame: { x: spr.x, y: spr.y, w: spr.width, h: spr.height },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: spr.width, h: spr.height },
          sourceSize: { w: spr.width, h: spr.height }
        };
      });

      return JSON.stringify(atlas, null, 2);
    }

    if (format === 'csv') {
      const rows = ['name,x,y,width,height'];
      spritesheet.sprites.forEach(spr => {
        rows.push(`"${spr.name || spr.id}",${spr.x},${spr.y},${spr.width},${spr.height}`);
      });
      return rows.join('\n');
    }

    // Simple plain text
    const lines = [
      `# Spritesheet Atlas: ${spritesheet.name || 'Atlas'} (${spritesheet.width}x${spritesheet.height})`,
      '# Format: [Name] -> X: Y: Width: Height:',
      '-------------------------------------------------------'
    ];
    spritesheet.sprites.forEach(spr => {
      lines.push(`${spr.name || spr.id.padEnd(20)} -> x:${spr.x}, y:${spr.y}, w:${spr.width}, h:${spr.height}`);
    });
    return lines.join('\n');
  } catch (err) {
    console.error('Error generating atlas text:', err);
    return '';
  }
}

/**
 * Extract a single sub-region from an image (used by Multi-Region Slicer)
 * Can extract either as a single block/image (e.g. background, parallax, prop)
 * OR sliced into a grid of tiles (e.g. tileset).
 *
 * @param {HTMLImageElement} img The full sheet image
 * @param {Object} region { id, name, type: 'tileset'|'single', x, y, width, height, gridCols, gridRows, targetRole }
 * @returns {Array<{ id: string, name: string, dataUrl: string, width: number, height: number, regionType: string, targetRole: string }>}
 */
export function extractRegionFromImage(img, region) {
  if (!img) return [];
  const rx = Math.max(0, Math.round(Number(region.x) || 0));
  const ry = Math.max(0, Math.round(Number(region.y) || 0));
  const rw = Math.max(8, Math.min(img.naturalWidth - rx, Math.round(Number(region.width) || 64)));
  const rh = Math.max(8, Math.min(img.naturalHeight - ry, Math.round(Number(region.height) || 64)));

  if (rw <= 0 || rh <= 0) return [];

  const regName = (region.name || 'Extracted Region').trim();
  const regType = region.type || 'single'; // 'single' | 'tileset'
  const targetRole = region.targetRole || (regType === 'tileset' ? 'block' : 'decor');

  // If single (e.g. background layer, giant parallax image, or prop)
  if (regType === 'single') {
    const canvas = document.createElement('canvas');
    canvas.width = rw;
    canvas.height = rh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    ctx.clearRect(0, 0, rw, rh);
    ctx.drawImage(img, rx, ry, rw, rh, 0, 0, rw, rh);

    return [{
      id: region.id || `reg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: regName,
      dataUrl: canvas.toDataURL('image/png'),
      width: rw,
      height: rh,
      regionType: 'single',
      targetRole,
      isBackgroundOrParallax: Boolean(region.isBackgroundOrParallax)
    }];
  }

  // If tileset: slice the region into cols x rows tiles
  const cols = Math.max(1, Math.min(32, Number(region.gridCols) || 1));
  const rows = Math.max(1, Math.min(32, Number(region.gridRows) || 1));
  const tileW = Math.max(4, Math.floor(rw / cols));
  const tileH = Math.max(4, Math.floor(rh / rows));

  const results = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = rx + c * tileW;
      const sy = ry + r * tileH;

      const cellCanvas = document.createElement('canvas');
      cellCanvas.width = tileW;
      cellCanvas.height = tileH;
      const cctx = cellCanvas.getContext('2d');
      if (cctx) {
        cctx.clearRect(0, 0, tileW, tileH);
        cctx.drawImage(img, sx, sy, tileW, tileH, 0, 0, tileW, tileH);
      }

      results.push({
        id: `tile_${Date.now()}_r${r}_c${c}_${Math.random().toString(36).substr(2, 4)}`,
        name: `${regName} [${c},${r}]`,
        dataUrl: cellCanvas.toDataURL('image/png'),
        width: tileW,
        height: tileH,
        col: c,
        row: r,
        regionType: 'tileset',
        targetRole
      });
    }
  }

  return results;
}

/**
 * Extract multiple regions batch from an image
 * @param {HTMLImageElement} img
 * @param {Array<Object>} regions
 * @returns {Array} All extracted items
 */
export function extractRegionsBatch(img, regions = []) {
  if (!img || !Array.isArray(regions)) return [];
  const allExtracted = [];
  regions.forEach(reg => {
    try {
      const pieces = extractRegionFromImage(img, reg);
      allExtracted.push(...pieces);
    } catch (err) {
      console.warn('Error extracting region:', reg.name, err);
    }
  });
  return allExtracted;
}

