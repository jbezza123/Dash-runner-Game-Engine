/**
 * Level Package ZIP Manager
 * Bundles levels, custom blueprints, spritesheets, and assets into portable .zip archives,
 * and extracts them seamlessly back into the level editor engine.
 */
import JSZip from 'jszip';
import { getSavedBlueprints, upsertBlueprint, preloadCustomImages } from './customAssetsManager.js';
import { getSavedSpritesheets, upsertSpritesheet } from './spritesheetManager.js';

/**
 * Export the complete level project as a self-contained ZIP archive
 * @param {Object} levelData Current level state
 * @returns {Promise<void>}
 */
export async function exportLevelPackageZip(levelData) {
  try {
    if (!levelData) throw new Error('No level data provided to package.');

    const zip = new JSZip();
    const cleanLevelName = (levelData.name || 'custom_level').toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    // 1. Gather relevant blueprints
    const storedBlueprints = getSavedBlueprints();
    const levelBlueprints = Array.isArray(levelData.customBlueprints) ? levelData.customBlueprints : [];
    
    // Combine unique blueprints
    const blueprintMap = new Map();
    storedBlueprints.forEach(b => { if (b && b.id) blueprintMap.set(b.id, b); });
    levelBlueprints.forEach(b => { if (b && b.id) blueprintMap.set(b.id, b); });
    const allBlueprints = Array.from(blueprintMap.values());

    // 2. Gather relevant spritesheets
    const storedSheets = getSavedSpritesheets();
    const levelSheets = Array.isArray(levelData.spritesheets) ? levelData.spritesheets : [];
    const sheetMap = new Map();
    storedSheets.forEach(s => { if (s && s.id) sheetMap.set(s.id, s); });
    levelSheets.forEach(s => { if (s && s.id) sheetMap.set(s.id, s); });
    const allSheets = Array.from(sheetMap.values());

    // 3. Prepare Clean Level Object
    const cleanLevel = {
      ...levelData,
      customBlueprints: allBlueprints,
      spritesheets: allSheets,
      exportedAt: new Date().toISOString(),
      engineVersion: '2.0.0'
    };

    // Add level.json
    zip.file('level.json', JSON.stringify(cleanLevel, null, 2));

    // Add blueprints.json
    zip.file('blueprints.json', JSON.stringify(allBlueprints, null, 2));

    // Add spritesheets.json
    zip.file('spritesheets.json', JSON.stringify(allSheets, null, 2));

    // Add human-readable manifest
    const readmeContent = [
      `=============================================================`,
      `  DASH RUNNER LEVEL PACKAGE: ${levelData.name || 'Untitled Level'}`,
      `=============================================================`,
      `Exported: ${new Date().toLocaleString()}`,
      `Objects: ${levelData.objects?.length || 0}`,
      `BPM: ${levelData.bpm || 120}`,
      `Difficulty: ${levelData.difficulty || 'Normal'}`,
      `Verified: ${levelData.verified ? 'YES' : 'NO'}`,
      `Custom Blueprints: ${allBlueprints.length}`,
      `Spritesheets: ${allSheets.length}`,
      `Parallax Layers: ${levelData.parallaxLayers?.length || 0}`,
      ``,
      `This ZIP archive contains the complete game level and all asset dependencies.`,
      `Import this file directly into Dash Runner Level Editor using the "Import" button.`,
      `=============================================================`
    ].join('\n');
    zip.file('README.txt', readmeContent);

    // Generate ZIP Blob
    const contentBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Trigger download in browser
    const downloadUrl = URL.createObjectURL(contentBlob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `${cleanLevelName}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 2000);
  } catch (err) {
    console.error('Failed to export level package ZIP:', err);
    throw err;
  }
}

/**
 * Import a level from either a .zip archive or legacy .json file
 * @param {File|Blob} file
 * @returns {Promise<{ level: Object, blueprintsCount: number, sheetsCount: number }>}
 */
export async function importLevelPackage(file) {
  try {
    if (!file) throw new Error('No file selected.');

    const fileName = file.name || '';
    const isZip = fileName.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';

    if (isZip) {
      const zip = await JSZip.loadAsync(file);

      // Find level.json
      const levelFileEntry = zip.file('level.json') || zip.file(/^.*level\.json$/i)[0];
      if (!levelFileEntry) {
        throw new Error('Invalid level package ZIP: "level.json" not found inside archive.');
      }

      const levelJsonText = await levelFileEntry.async('string');
      let parsedLevel;
      try {
        parsedLevel = JSON.parse(levelJsonText);
      } catch (e) {
        throw new Error('Failed to parse level.json: Invalid JSON format.');
      }

      let importedBlueprintsCount = 0;
      let importedSheetsCount = 0;

      // Unpack blueprints if present
      const bpFileEntry = zip.file('blueprints.json') || zip.file(/^.*blueprints\.json$/i)[0];
      if (bpFileEntry) {
        try {
          const bpText = await bpFileEntry.async('string');
          const bps = JSON.parse(bpText);
          if (Array.isArray(bps)) {
            bps.forEach(bp => {
              if (bp && bp.id) {
                upsertBlueprint(bp);
                importedBlueprintsCount++;
              }
            });
          }
        } catch (bpErr) {
          console.warn('Could not unpack blueprints from zip:', bpErr);
        }
      }

      // Unpack spritesheets if present
      const sheetFileEntry = zip.file('spritesheets.json') || zip.file(/^.*spritesheets\.json$/i)[0];
      if (sheetFileEntry) {
        try {
          const sheetText = await sheetFileEntry.async('string');
          const sheets = JSON.parse(sheetText);
          if (Array.isArray(sheets)) {
            sheets.forEach(s => {
              if (s && s.id) {
                upsertSpritesheet(s);
                importedSheetsCount++;
              }
            });
          }
        } catch (sErr) {
          console.warn('Could not unpack spritesheets from zip:', sErr);
        }
      }

      // Also upsert any blueprints directly in parsedLevel.customBlueprints
      if (Array.isArray(parsedLevel.customBlueprints)) {
        parsedLevel.customBlueprints.forEach(bp => {
          if (bp && bp.id) upsertBlueprint(bp);
        });
      }

      // Preload images
      const imagesToPreload = [];
      if (Array.isArray(parsedLevel.customBlueprints)) {
        parsedLevel.customBlueprints.forEach(bp => {
          if (bp.imageUrl) imagesToPreload.push(bp.imageUrl);
          if (Array.isArray(bp.frames)) imagesToPreload.push(...bp.frames);
        });
      }
      if (Array.isArray(parsedLevel.parallaxLayers)) {
        parsedLevel.parallaxLayers.forEach(l => {
          if (l.url) imagesToPreload.push(l.url);
        });
      }
      preloadCustomImages(imagesToPreload);

      return {
        level: parsedLevel,
        blueprintsCount: importedBlueprintsCount,
        sheetsCount: importedSheetsCount
      };
    } else {
      // Legacy JSON fallback
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON structure.');
      }
      return {
        level: parsed,
        blueprintsCount: parsed.customBlueprints?.length || 0,
        sheetsCount: parsed.spritesheets?.length || 0
      };
    }
  } catch (err) {
    console.error('Error importing level package:', err);
    throw err;
  }
}
