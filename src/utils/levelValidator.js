/**
 * Validation engine for level data with rigorous error checking.
 */

export const VALID_OBJECT_TYPES = [
  'block_neon',
  'block_metal',
  'block_grid',
  'block_half',
  'spike_floor',
  'spike_ceiling',
  'spike_triple',
  'saw_blade',
  'orb_yellow',
  'orb_pink',
  'orb_blue',
  'orb_green',
  'orb_black',
  'orb_dash_green',
  'orb_dash_magenta',
  'pad_yellow',
  'pad_pink',
  'pad_red',
  'pad_blue',
  'portal_gravity_inv',
  'portal_gravity_norm',
  'portal_speed_slow',
  'portal_speed_normal',
  'portal_speed_fast',
  'portal_fly',
  'portal_runner',
  'collectable_coin',
  'finish_gate',
  'finish_gate_full',
  // Visual Decorative Objects (Non-solid scenery, layer configurable: behind or in front of player)
  'deco_pillar',
  'deco_chain',
  'deco_arrow',
  'deco_hazard',
  'deco_beacon',
  'deco_grid',
  'deco_pipe',
  'deco_screen',
  'deco_light',
  // Forest & Jungle Environment Objects
  'block_wood',
  'block_moss',
  'block_stone',
  'block_leaves',
  'block_jungle_ruin',
  'block_bamboo',
  'block_sun_stone',
  'block_root',
  'block_jungle_slab',
  'block_canopy_bark',
  // Mayan Temple Architectural Blocks
  'block_temple_stone',
  'block_temple_brick',
  'block_temple_slope_l',
  'block_temple_slope_r',
  'block_temple_cornice',
  'block_temple_relief',
  'block_temple_platform',
  'hazard_thorns',
  'hazard_spore',
  'hazard_acid_bog',
  'hazard_snapper_plant',
  'hazard_dart_trap',
  'hazard_bamboo_spikes',
  'hazard_jungle_saw',
  'deco_vine',
  'deco_mushroom',
  'deco_lantern',
  'deco_tree',
  'deco_monstera',
  'deco_totem',
  'deco_fireflies',
  'deco_jungle_flower',
  'deco_waterfall',
  'deco_torch',
  'deco_mayan_mask',
  'deco_creeper',
  'deco_temple_pillar',
  'deco_altar',
  'deco_sun_disc',
  'deco_serpent_idol',
  'deco_temple_urn',
  'deco_tribal_banner',
  'deco_jade_statue',
  'deco_temple_stairs',
  // Mayan Temple Architecture & Prop Decors
  'deco_temple_doorway',
  'deco_temple_roof_comb',
  'deco_brazier',
  'deco_wall_torch',
  'deco_skull_relief',
  'deco_mayan_hieroglyphs',
  'deco_hanging_roots',
  'deco_golden_sun_altar',
  // Crystal / Cavern Environment Objects
  'block_amethyst',
  'block_slate',
  'block_gem_cyan',
  'hazard_crystal',
  'hazard_magma',
  'deco_crystal',
  'deco_rune',
  // Industrial / Factory Environment Objects
  'block_hazard_stripe',
  'block_grate',
  'block_rivet',
  'hazard_laser',
  'hazard_steam',
  'deco_cog',
  'deco_vent',
  'deco_cables'
];

/**
 * Validates and cleans a level object.
 * @param {any} rawLevel 
 * @returns {{ valid: boolean, level: object|null, error: string|null }}
 */
export function validateLevelData(rawLevel) {
  if (!rawLevel || typeof rawLevel !== 'object') {
    return { valid: false, level: null, error: 'Level data must be a valid JSON object.' };
  }

  // Check required strings
  const id = typeof rawLevel.id === 'string' && rawLevel.id.trim() ? rawLevel.id.trim() : `custom_${Date.now()}`;
  const name = typeof rawLevel.name === 'string' && rawLevel.name.trim() ? rawLevel.name.trim().slice(0, 40) : 'Untitled Level';
  const creator = typeof rawLevel.creator === 'string' && rawLevel.creator.trim() ? rawLevel.creator.trim().slice(0, 30) : 'Anonymous';
  const difficulty = ['Easy', 'Medium', 'Hard', 'Insane', 'Demon'].includes(rawLevel.difficulty) ? rawLevel.difficulty : 'Medium';
  const theme = typeof rawLevel.theme === 'string' ? rawLevel.theme : 'neon_pulse';
  const backgroundUrl = typeof rawLevel.backgroundUrl === 'string' && rawLevel.backgroundUrl.trim()
    ? rawLevel.backgroundUrl.trim()
    : null;
  const bgParallaxSpeed = typeof rawLevel.bgParallaxSpeed === 'number' && !isNaN(rawLevel.bgParallaxSpeed)
    ? Math.max(0.05, Math.min(1.0, rawLevel.bgParallaxSpeed))
    : 0.3;
  
  // Numerical sanity bounds
  let bpm = Number(rawLevel.bpm);
  if (!Number.isFinite(bpm) || bpm < 60 || bpm > 240) {
    bpm = 130;
  }

  let levelLength = Number(rawLevel.length);
  if (!Number.isFinite(levelLength) || levelLength < 50 || levelLength > 1000) {
    levelLength = 120; // in grid blocks
  }

  // Validate objects array
  if (!Array.isArray(rawLevel.objects)) {
    return { valid: false, level: null, error: 'Level "objects" property must be an array.' };
  }

  const cleanedObjects = [];
  let hasFinish = false;

  for (let i = 0; i < rawLevel.objects.length; i++) {
    const obj = rawLevel.objects[i];
    if (!obj || typeof obj !== 'object') continue;

    // Validate type (supports built-in types and custom blueprints)
    const isCustomType = typeof obj.type === 'string' && (obj.type.startsWith('bp_') || obj.type.startsWith('custom_') || Boolean(obj.customAsset));
    if (!VALID_OBJECT_TYPES.includes(obj.type) && !isCustomType) {
      continue; // Ignore unknown or malformed types safely
    }

    // Validate grid coordinates
    const x = Number(obj.x);
    const y = Number(obj.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue; // Skip invalid coordinates
    }

    // Clamp coordinates safely
    const cleanX = Math.max(0, Math.min(x, levelLength + 50));
    const cleanY = Math.max(0, Math.min(y, 30));

    const rotation = Number(obj.rotation) || 0;
    const layer = (obj.layer === 'foreground' || obj.layer === 'fg' || Boolean(obj.inFront)) ? 'foreground' : 'background';

    cleanedObjects.push({
      type: obj.type,
      x: cleanX,
      y: cleanY,
      rotation: (Math.round(rotation / 90) * 90) % 360,
      layer,
      spanFull: Boolean(obj.spanFull || obj.type === 'finish_gate_full'),
      customId: obj.customId || `obj_${i}_${Date.now()}`,
      imageUrl: obj.imageUrl || (obj.customAsset?.imageUrl) || undefined,
      customAsset: obj.customAsset || undefined,
      role: obj.role || (obj.customAsset?.role) || undefined
    });

    if (obj.type === 'finish_gate' || obj.type === 'finish_gate_full') {
      hasFinish = true;
    }
  }

  // If no finish gate was provided, auto-place one near the end safely
  if (!hasFinish) {
    cleanedObjects.push({
      type: 'finish_gate',
      x: levelLength - 2,
      y: 1,
      rotation: 0,
      spanFull: false,
      customId: `finish_${Date.now()}`
    });
  }

  // Sanitize player start position (defaults to x=1, y=0)
  const rawStartX = Number(rawLevel.startX ?? rawLevel.playerStart?.x ?? 1);
  const rawStartY = Number(rawLevel.startY ?? rawLevel.playerStart?.y ?? 0);
  const cleanStartX = Math.max(0, Math.min(Number.isFinite(rawStartX) ? rawStartX : 1, Math.max(0, levelLength - 5)));
  const cleanStartY = Math.max(0, Math.min(Number.isFinite(rawStartY) ? rawStartY : 0, 24));

  const sanitized = {
    id,
    name,
    creator,
    difficulty,
    bpm: Math.round(bpm),
    theme,
    environment: typeof rawLevel.environment === 'string' ? rawLevel.environment : undefined,
    backgroundUrl,
    bgParallaxSpeed,
    parallaxLayers: Array.isArray(rawLevel.parallaxLayers) ? rawLevel.parallaxLayers : [],
    customBlueprints: Array.isArray(rawLevel.customBlueprints) ? rawLevel.customBlueprints : [],
    length: Math.round(levelLength),
    startX: Math.round(cleanStartX),
    startY: Math.round(cleanStartY),
    playerStart: { x: Math.round(cleanStartX), y: Math.round(cleanStartY) },
    objects: cleanedObjects,
    verified: Boolean(rawLevel.verified),
    verifiedAt: rawLevel.verifiedAt || null,
    finishSpan: rawLevel.finishSpan === 'full' ? 'full' : 'standard',
    gameStyle: typeof rawLevel.gameStyle === 'string' ? rawLevel.gameStyle : 'runner',
    chaseHazard: rawLevel.chaseHazard && typeof rawLevel.chaseHazard === 'object' ? rawLevel.chaseHazard : { type: 'none', speed: 290, delay: 1.8 },
    version: 1,
    createdAt: rawLevel.createdAt || new Date().toISOString()
  };

  return { valid: true, level: sanitized, error: null };
}

/**
 * Safely parses raw JSON string with validation.
 * @param {string} jsonString 
 * @returns {{ valid: boolean, level: object|null, error: string|null }}
 */
export function parseAndValidateLevelString(jsonString) {
  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    return { valid: false, level: null, error: 'Empty level text provided.' };
  }

  try {
    const parsed = JSON.parse(jsonString.trim());
    return validateLevelData(parsed);
  } catch (err) {
    return { valid: false, level: null, error: `Invalid JSON syntax: ${err.message}` };
  }
}
