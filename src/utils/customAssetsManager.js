/**
 * Custom Assets & Blueprints Manager
 * Provides persistent blueprints, ZIP extraction, sprite caching, and level asset utilities.
 */
import JSZip from 'jszip';

const BLUEPRINTS_STORAGE_KEY = 'dash_runner_custom_blueprints';

// In-memory image cache for high-performance canvas rendering
const customImageCache = new Map();

/**
 * Loads and caches an HTMLImageElement safely
 * @param {string} url Image URL or data URL
 * @returns {HTMLImageElement|null}
 */
export function getCachedCustomImage(url) {
  if (!url || typeof url !== 'string') return null;

  if (customImageCache.has(url)) {
    const cached = customImageCache.get(url);
    return cached.loaded ? cached.img : null;
  }

  try {
    const img = new Image();
    const entry = { img, loaded: false, error: false };
    customImageCache.set(url, entry);

    img.onload = () => {
      entry.loaded = true;
    };
    img.onerror = () => {
      entry.error = true;
    };
    img.src = url;
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Preload a list of image URLs
 * @param {string[]} urls
 */
export function preloadCustomImages(urls = []) {
  if (!Array.isArray(urls)) return;
  urls.forEach(url => {
    if (url) getCachedCustomImage(url);
  });
}

/**
 * Get all stored blueprints from localStorage
 * @returns {Array}
 */
export function getSavedBlueprints() {
  try {
    const raw = localStorage.getItem(BLUEPRINTS_STORAGE_KEY);
    if (!raw) return getDefaultStarterBlueprints();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultStarterBlueprints();
  } catch (err) {
    console.warn('Error reading saved blueprints from localStorage:', err);
    return getDefaultStarterBlueprints();
  }
}

/**
 * Save blueprints list to localStorage
 * @param {Array} blueprints
 */
export function saveBlueprints(blueprints) {
  try {
    if (!Array.isArray(blueprints)) return;
    localStorage.setItem(BLUEPRINTS_STORAGE_KEY, JSON.stringify(blueprints));
  } catch (err) {
    console.warn('Error saving blueprints to localStorage:', err);
  }
}

/**
 * Save or update a single blueprint
 * @param {Object} blueprint
 * @returns {Array} Updated blueprints list
 */
export function upsertBlueprint(blueprint) {
  try {
    const list = getSavedBlueprints();
    const index = list.findIndex(b => b.id === blueprint.id);
    let updated;
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...list[index], ...blueprint, updatedAt: Date.now() };
    } else {
      updated = [{ ...blueprint, createdAt: Date.now() }, ...list];
    }
    saveBlueprints(updated);
    return updated;
  } catch (err) {
    console.warn('Error upserting blueprint:', err);
    return getSavedBlueprints();
  }
}

/**
 * Delete a blueprint by ID
 * @param {string} id
 * @returns {Array} Updated blueprints list
 */
export function deleteBlueprint(id) {
  try {
    const list = getSavedBlueprints();
    const updated = list.filter(b => b.id !== id);
    saveBlueprints(updated);
    return updated;
  } catch (err) {
    console.warn('Error deleting blueprint:', err);
    return getSavedBlueprints();
  }
}

/**
 * Extract image files from a ZIP archive (Blob or ArrayBuffer or File)
 * @param {Blob|File|ArrayBuffer} zipData
 * @returns {Promise<Array<{ name: string, dataUrl: string, size: number, type: string }>>}
 */
export async function extractZipAssets(zipData) {
  try {
    const zip = await JSZip.loadAsync(zipData);
    const results = [];
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];

    const filePromises = [];
    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;
      const lower = relativePath.toLowerCase();
      const isImg = imageExtensions.some(ext => lower.endsWith(ext));
      if (!isImg) return;

      const p = (async () => {
        try {
          const blob = await zipEntry.async('blob');
          const dataUrl = await blobToDataUrl(blob);
          const cleanName = relativePath.split('/').pop().replace(/\.[^/.]+$/, '');
          return {
            name: cleanName,
            path: relativePath,
            dataUrl,
            size: blob.size,
            type: blob.type || 'image/png'
          };
        } catch (fileErr) {
          console.warn(`Error extracting file ${relativePath}:`, fileErr);
          return null;
        }
      })();
      filePromises.push(p);
    });

    const resolved = await Promise.all(filePromises);
    resolved.forEach(item => {
      if (item && item.dataUrl) results.push(item);
    });

    return results;
  } catch (err) {
    console.error('Failed to extract ZIP assets:', err);
    throw new Error('Could not parse ZIP file. Please ensure it is a valid .zip archive containing PNG, JPG, or WEBP images.');
  }
}

/**
 * Helper: Convert Blob to Data URL
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Starter blueprints so the user immediately has custom asset examples to play with!
 */
export function getDefaultStarterBlueprints() {
  return [
    {
      id: 'bp_golden_relic_altar',
      name: 'Golden Sun Altar',
      role: 'block', // 'block', 'half_block', 'hazard', 'saw', 'decor', 'orb', 'pad', 'collectable'
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=128&q=80',
      isAnimated: false,
      frameCount: 1,
      fps: 8,
      loopMode: 'loop',
      layer: 'background',
      width: 64,
      height: 64,
      tag: 'Temple',
      description: 'Solid ancient carved gold altar with ceremonial sun glyphs'
    },
    {
      id: 'bp_flaming_fire_crystal',
      name: 'Pulsing Flame Crystal',
      role: 'hazard',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=128&q=80',
      isAnimated: true,
      frameCount: 4,
      fps: 10,
      loopMode: 'pingpong',
      layer: 'background',
      width: 64,
      height: 64,
      tag: 'Hazards',
      description: 'Animated pulsating fire crystal hazard. Contact destroys the runner!'
    },
    {
      id: 'bp_mystic_energy_orb',
      name: 'Cosmic Jump Orb',
      role: 'orb',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=128&q=80',
      isAnimated: true,
      frameCount: 6,
      fps: 12,
      loopMode: 'loop',
      layer: 'foreground',
      width: 64,
      height: 64,
      tag: 'Interactive',
      description: 'Custom animated celestial orb that triggers a mid-air jump impulse'
    },
    {
      id: 'bp_jungle_hanging_ivy',
      name: 'Ancient Hanging Ivy',
      role: 'decor',
      imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=128&q=80',
      isAnimated: false,
      frameCount: 1,
      fps: 6,
      loopMode: 'loop',
      layer: 'foreground',
      width: 64,
      height: 64,
      tag: 'Visual Decor',
      description: 'Lush decorative ivy canopy draping in front of the runner'
    }
  ];
}
