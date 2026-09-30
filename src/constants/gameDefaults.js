/**
 * Game constants, physics variables, skin presets, and pre-packaged community levels.
 */

export { VALID_OBJECT_TYPES } from '../utils/levelValidator.js';

export const TILE_SIZE = 54; // Grid tile size in pixels
export const BASE_SPEED = 420; // Pixels per second at 1x speed

export const SPEED_MULTIPLIERS = {
  slow: 0.75,
  normal: 1.0,
  fast: 1.35,
  superfast: 1.65,
};

export const PHYSICS = {
  gravity: 2400, // Pixels / sec^2
  jumpForce: 840, // Upward initial velocity
  orbJumpForce: 920,
  padJumpForce: 1100,
  superPadForce: 1350,
  jetpackThrust: 2100,
  maxFallSpeed: 1200,
  playerWidth: 40,
  playerHeight: 48,
};

export const CHARACTER_ARCHETYPES = [
  { id: 'ninja', name: 'Cyber Ninja', desc: 'Sleek runner with dynamic headband tails' },
  { id: 'cyborg', name: 'Neon Android', desc: 'Armored mechanical frame with optic glow' },
  { id: 'astro', name: 'Cosmic Explorer', desc: 'Heavy pressurized gear with bubble visor' },
  { id: 'shadow', name: 'Shadow Stalker', desc: 'Cloaked specter with glowing eyes' },
  { id: 'retro', name: 'Pixel Vanguard', desc: 'Chunky arcade hero silhouette' },
  { id: 'dynamo', name: 'Electrum Dynamo', desc: 'Futuristic runner with energized aura' },
];

export const VEHICLE_ARCHETYPES = [
  { id: 'spaceship_viper', name: 'Viper Starfighter', category: 'spaceship', desc: 'Forward swept-wing delta interceptor with twin plasma blasters' },
  { id: 'spaceship_stealth', name: 'Stealth Phantom', category: 'spaceship', desc: 'Angular stealth craft with ion drive and low radar cross-section' },
  { id: 'car_neon_drifter', name: 'Neon Supercar', category: 'car', desc: 'Cyberpunk racing machine with neon underglow and rear wing' },
  { id: 'car_retro_muscle', name: 'Retro Muscle GT', category: 'car', desc: 'Turbocharged street cruiser with twin chrome side exhaust flames' },
  { id: 'truck_hauler', name: 'Armored Hauler', category: 'truck', desc: 'Heavy combat cyber truck with ramming grille and dual smokestacks' },
  { id: 'truck_rover', name: 'Offroad Titan', category: 'truck', desc: '6-wheel heavy planetary explorer with reinforced chassis' },
  { id: 'sub_nautilus', name: 'Nautilus Sub', category: 'submersible', desc: 'Deep-sea exploration submarine with bubble wake and front searchlight' },
  { id: 'hovercraft_skimmer', name: 'Plasma Skimmer', category: 'hovercraft', desc: 'High-speed frictionless hovercraft with dual turbine jets' },
  { id: 'mech_strider', name: 'Assault Mech', category: 'mech', desc: 'Bi-pedal combat walker with hydraulic legs and shoulder armor' },
  { id: 'custom_asset', name: 'Imported Custom Asset', category: 'custom', desc: 'Custom imported vehicle/character from the Asset Browser' },
];

export const ACCESSORIES = [
  { id: 'none', name: 'None' },
  { id: 'headband', name: 'Ninja Ribbon' },
  { id: 'visor', name: 'Cyber Visor' },
  { id: 'halo', name: 'Neon Halo' },
  { id: 'horns', name: 'Cyber Horns' },
  { id: 'crown', name: 'Golden Crown' },
  { id: 'headphones', name: 'Pulse Headphones' },
  { id: 'astronaut', name: 'Dome Helmet' },
  { id: 'mohawk', name: 'Laser Mohawk' },
];

export const TRAILS = [
  { id: 'neon', name: 'Neon Ghost', color: '#06b6d4' },
  { id: 'fire', name: 'Plasma Flame', color: '#f97316' },
  { id: 'rainbow', name: 'Prismatic', color: '#ec4899' },
  { id: 'matrix', name: 'Digital Grid', color: '#22c55e' },
  { id: 'void', name: 'Void Spark', color: '#a855f7' },
  { id: 'solar', name: 'Solar Flare', color: '#eab308' },
];

export const DEATH_EFFECTS = [
  { id: 'ring_burst', name: 'Shockwave Ring' },
  { id: 'pixel_scatter', name: 'Fragment Shatter' },
  { id: 'fire_nova', name: 'Plasma Nova' },
  { id: 'confetti', name: 'Neon Confetti' },
];

export const DEFAULT_SKIN = {
  archetype: 'cyborg',
  primaryColor: '#06b6d4', // Cyan
  secondaryColor: '#3b82f6', // Electric Blue
  glowColor: '#67e8f9',
  eyeColor: '#ffffff',
  accessory: 'visor',
  trail: 'neon',
  deathEffect: 'pixel_scatter',
};

export const PRESET_SKINS = [
  {
    name: 'Cyber Blade',
    archetype: 'ninja',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    glowColor: '#34d399',
    eyeColor: '#ffffff',
    accessory: 'headband',
    trail: 'matrix',
    deathEffect: 'ring_burst'
  },
  {
    name: 'Solar Overlord',
    archetype: 'cyborg',
    primaryColor: '#f59e0b',
    secondaryColor: '#dc2626',
    glowColor: '#fbbf24',
    eyeColor: '#ffffff',
    accessory: 'crown',
    trail: 'solar',
    deathEffect: 'fire_nova'
  },
  {
    name: 'Void Specter',
    archetype: 'shadow',
    primaryColor: '#8b5cf6',
    secondaryColor: '#4c1d95',
    glowColor: '#c084fc',
    eyeColor: '#f43f5e',
    accessory: 'horns',
    trail: 'void',
    deathEffect: 'pixel_scatter'
  },
  {
    name: 'Astro Neon',
    archetype: 'astro',
    primaryColor: '#38bdf8',
    secondaryColor: '#0284c7',
    glowColor: '#7dd3fc',
    eyeColor: '#38bdf8',
    accessory: 'astronaut',
    trail: 'neon',
    deathEffect: 'confetti'
  },
  {
    name: 'Hyper Beats',
    archetype: 'dynamo',
    primaryColor: '#ec4899',
    secondaryColor: '#be185d',
    glowColor: '#f472b6',
    eyeColor: '#fdf2f8',
    accessory: 'headphones',
    trail: 'rainbow',
    deathEffect: 'ring_burst'
  }
];

export const VEHICLE_PRESETS = [
  {
    name: 'Cosmic Interceptor',
    archetype: 'spaceship_viper',
    category: 'vehicle',
    primaryColor: '#06b6d4',
    secondaryColor: '#1e40af',
    glowColor: '#38bdf8',
    eyeColor: '#ffffff',
    trail: 'neon',
    deathEffect: 'fire_nova',
    hitbox: {
      type: 'polygon',
      points: [
        { x: 0.95, y: 0.5 },
        { x: 0.15, y: 0.08 },
        { x: 0.28, y: 0.35 },
        { x: 0.05, y: 0.5 },
        { x: 0.28, y: 0.65 },
        { x: 0.15, y: 0.92 }
      ]
    }
  },
  {
    name: 'Stealth Phantom',
    archetype: 'spaceship_stealth',
    category: 'vehicle',
    primaryColor: '#6366f1',
    secondaryColor: '#1e1b4b',
    glowColor: '#a855f7',
    eyeColor: '#c084fc',
    trail: 'void',
    deathEffect: 'pixel_scatter',
    hitbox: {
      type: 'polygon',
      points: [
        { x: 0.92, y: 0.5 },
        { x: 0.2, y: 0.12 },
        { x: 0.35, y: 0.4 },
        { x: 0.08, y: 0.5 },
        { x: 0.35, y: 0.6 },
        { x: 0.2, y: 0.88 }
      ]
    }
  },
  {
    name: 'Neon Cyber Drift',
    archetype: 'car_neon_drifter',
    category: 'vehicle',
    primaryColor: '#ec4899',
    secondaryColor: '#831843',
    glowColor: '#f43f5e',
    eyeColor: '#fef08a',
    trail: 'fire',
    deathEffect: 'ring_burst',
    hitbox: {
      type: 'polygon',
      points: [
        { x: 0.08, y: 0.42 },
        { x: 0.28, y: 0.22 },
        { x: 0.72, y: 0.22 },
        { x: 0.92, y: 0.42 },
        { x: 0.96, y: 0.78 },
        { x: 0.78, y: 0.88 },
        { x: 0.22, y: 0.88 },
        { x: 0.04, y: 0.78 }
      ]
    }
  },
  {
    name: 'Armored Titan Hauler',
    archetype: 'truck_hauler',
    category: 'vehicle',
    primaryColor: '#f59e0b',
    secondaryColor: '#78350f',
    glowColor: '#fbbf24',
    eyeColor: '#fef3c7',
    trail: 'solar',
    deathEffect: 'fire_nova',
    hitbox: {
      type: 'polygon',
      points: [
        { x: 0.06, y: 0.25 },
        { x: 0.75, y: 0.25 },
        { x: 0.95, y: 0.45 },
        { x: 0.95, y: 0.88 },
        { x: 0.06, y: 0.88 },
        { x: 0.06, y: 0.45 }
      ]
    }
  },
  {
    name: 'Abyssal Nautilus',
    archetype: 'sub_nautilus',
    category: 'vehicle',
    primaryColor: '#0ea5e9',
    secondaryColor: '#0c4a6e',
    glowColor: '#38bdf8',
    eyeColor: '#facc15',
    trail: 'matrix',
    deathEffect: 'ring_burst',
    hitbox: {
      type: 'polygon',
      points: [
        { x: 0.1, y: 0.5 },
        { x: 0.25, y: 0.2 },
        { x: 0.75, y: 0.2 },
        { x: 0.95, y: 0.5 },
        { x: 0.75, y: 0.8 },
        { x: 0.25, y: 0.8 }
      ]
    }
  }
];

// Curated built-in community levels (carefully planned and mathematically balanced)
export const BUILTIN_COMMUNITY_LEVELS = [
  {
    id: 'lvl_neon_velocity',
    name: 'Neon Velocity',
    creator: 'PulseArchitect',
    difficulty: 'Easy',
    bpm: 124,
    theme: 'cyber_cyan',
    length: 115,
    likes: 540,
    plays: 2120,
    objects: [
      // Introduction runway and first single jump
      { type: 'spike_floor', x: 14, y: 0 },
      // Second rhythm jump
      { type: 'spike_floor', x: 21, y: 0 },
      // Stepping platform: Ground step then 1-tile elevated
      { type: 'block_neon', x: 27, y: 0 },
      { type: 'block_neon', x: 28, y: 0 },
      { type: 'block_neon', x: 29, y: 0 },
      { type: 'block_neon', x: 30, y: 1 },
      { type: 'block_neon', x: 31, y: 1 },
      // Secret Coin 1: Hovering above elevated stepping blocks
      { type: 'collectable_coin', x: 31, y: 3 },
      { type: 'block_neon', x: 32, y: 1 },
      // Hazard below the drop-off
      { type: 'spike_floor', x: 34, y: 0 },
      // Launch pad over spike bed into landing platform
      { type: 'pad_yellow', x: 40, y: 0 },
      { type: 'spike_floor', x: 42, y: 0 },
      { type: 'spike_floor', x: 43, y: 0 },
      { type: 'spike_floor', x: 44, y: 0 },
      // Elevated landing zone
      { type: 'block_grid', x: 47, y: 1 },
      { type: 'block_grid', x: 48, y: 1 },
      { type: 'block_grid', x: 49, y: 1 },
      { type: 'block_grid', x: 50, y: 1 },
      // Yellow orb jump over hazard pit
      { type: 'spike_floor', x: 55, y: 0 },
      { type: 'spike_floor', x: 56, y: 0 },
      { type: 'orb_yellow', x: 54, y: 2 },
      // Secret Coin 2: High arc above orb jump
      { type: 'collectable_coin', x: 54, y: 4 },
      // High decorative sawblade (safe clearance underneath)
      { type: 'saw_blade', x: 63, y: 4 },
      // Double spike jump on beat
      { type: 'spike_floor', x: 70, y: 0 },
      { type: 'spike_floor', x: 71, y: 0 },
      // Pink hop pad into stepping platform
      { type: 'pad_pink', x: 77, y: 0 },
      { type: 'block_metal', x: 81, y: 1 },
      { type: 'block_metal', x: 82, y: 1 },
      // Secret Coin 3: Precision jump right before speed portal
      { type: 'collectable_coin', x: 83, y: 3 },
      { type: 'block_metal', x: 83, y: 1 },
      // Speed portal excitement
      { type: 'portal_speed_fast', x: 88, y: 1 },
      // Final celebratory leap
      { type: 'spike_floor', x: 95, y: 0 },
      // Course finish gate
      { type: 'finish_gate', x: 108, y: 1 }
    ]
  },
  {
    id: 'lvl_pulse_circuit',
    name: 'Pulse Circuit',
    creator: 'BeatShifter',
    difficulty: 'Medium',
    bpm: 132,
    theme: 'violet_synth',
    length: 135,
    likes: 780,
    plays: 2890,
    objects: [
      // Warm up rhythm jumps
      { type: 'spike_floor', x: 13, y: 0 },
      { type: 'spike_floor', x: 19, y: 0 },
      { type: 'spike_floor', x: 20, y: 0 },
      // Orb leap
      { type: 'orb_yellow', x: 26, y: 2 },
      // Secret Coin 1: High above first yellow orb
      { type: 'collectable_coin', x: 26, y: 4 },
      { type: 'spike_floor', x: 27, y: 0 },
      { type: 'spike_floor', x: 28, y: 0 },
      // Invert Gravity Portal
      { type: 'portal_gravity_inv', x: 34, y: 1 },
      // Inverted ceiling runway
      { type: 'block_metal', x: 40, y: 6 },
      { type: 'block_metal', x: 41, y: 6 },
      { type: 'block_metal', x: 42, y: 6 },
      { type: 'spike_ceiling', x: 45, y: 7 },
      // Inverted yellow orb jump
      { type: 'orb_yellow', x: 49, y: 5 },
      // Secret Coin 2: Inverted ceiling clearance
      { type: 'collectable_coin', x: 49, y: 3 },
      { type: 'block_metal', x: 54, y: 6 },
      { type: 'block_metal', x: 55, y: 6 },
      // Return to Normal Gravity
      { type: 'portal_gravity_norm', x: 62, y: 3 },
      // Launch pad to high platform
      { type: 'pad_yellow', x: 70, y: 0 },
      { type: 'spike_floor', x: 72, y: 0 },
      { type: 'spike_floor', x: 73, y: 0 },
      { type: 'block_grid', x: 76, y: 2 },
      { type: 'block_grid', x: 77, y: 2 },
      { type: 'block_grid', x: 78, y: 2 },
      // Blue gravity-flip orb in mid-air
      { type: 'orb_blue', x: 84, y: 3 },
      // Secret Coin 3: Mid-air gravity shift route
      { type: 'collectable_coin', x: 87, y: 4 },
      { type: 'block_metal', x: 90, y: 6 },
      { type: 'block_metal', x: 91, y: 6 },
      // Gravity normalizer
      { type: 'portal_gravity_norm', x: 97, y: 3 },
      // Sawblade jump
      { type: 'saw_blade', x: 104, y: 1 },
      { type: 'spike_floor', x: 111, y: 0 },
      { type: 'finish_gate', x: 125, y: 1 }
    ]
  },
  {
    id: 'lvl_neon_runner_course',
    name: 'Neon Horizon',
    creator: 'NeonRunner',
    difficulty: 'Medium',
    bpm: 130,
    theme: 'cyber_cyan',
    length: 120,
    likes: 890,
    plays: 3420,
    objects: [
      { type: 'saw_blade', x: 14, y: 0 },
      { type: 'spike_triple', x: 15, y: 0 },
      { type: 'spike_triple', x: 16, y: 0 },
      { type: 'spike_triple', x: 17, y: 0 },
      { type: 'block_neon', x: 18, y: 0 },
      { type: 'block_neon', x: 19, y: 0 },
      { type: 'block_neon', x: 20, y: 0 },
      { type: 'block_neon', x: 21, y: 0 },
      { type: 'block_neon', x: 22, y: 0 },
      { type: 'block_neon', x: 23, y: 0 },
      { type: 'block_neon', x: 24, y: 0 },
      { type: 'block_neon', x: 25, y: 0 },
      { type: 'block_neon', x: 26, y: 0 },
      { type: 'block_neon', x: 26, y: 1 },
      { type: 'block_neon', x: 27, y: 0 },
      { type: 'block_neon', x: 27, y: 1 },
      { type: 'block_neon', x: 28, y: 0 },
      { type: 'block_neon', x: 28, y: 1 },
      { type: 'block_neon', x: 29, y: 0 },
      { type: 'block_neon', x: 29, y: 1 },
      { type: 'block_neon', x: 30, y: 0 },
      { type: 'block_neon', x: 30, y: 1 },
      { type: 'block_neon', x: 30, y: 2, rotation: 90 },
      { type: 'block_neon', x: 31, y: 0 },
      { type: 'block_neon', x: 31, y: 1 },
      { type: 'block_neon', x: 31, y: 2 },
      { type: 'collectable_coin', x: 31, y: 3 },
      { type: 'block_neon', x: 32, y: 0 },
      { type: 'block_neon', x: 32, y: 1 },
      { type: 'block_neon', x: 32, y: 2 },
      { type: 'spike_floor', x: 33, y: 0 },
      { type: 'spike_floor', x: 34, y: 0 },
      { type: 'block_neon', x: 35, y: 3 },
      { type: 'block_neon', x: 36, y: 3 },
      { type: 'block_neon', x: 37, y: 3 },
      { type: 'spike_ceiling', x: 37, y: 2 },
      { type: 'block_neon', x: 38, y: 3 },
      { type: 'saw_blade', x: 38, y: 4 },
      { type: 'spike_ceiling', x: 38, y: 2 },
      { type: 'block_neon', x: 39, y: 3 },
      { type: 'block_neon', x: 39, y: 4 },
      { type: 'spike_ceiling', x: 39, y: 2 },
      { type: 'block_neon', x: 40, y: 3 },
      { type: 'block_neon', x: 40, y: 4 },
      { type: 'spike_ceiling', x: 40, y: 2 },
      { type: 'block_neon', x: 41, y: 3 },
      { type: 'block_neon', x: 41, y: 4 },
      { type: 'block_neon', x: 41, y: 5 },
      { type: 'spike_ceiling', x: 41, y: 2 },
      { type: 'collectable_coin', x: 41, y: 6 },
      { type: 'spike_ceiling', x: 42, y: 3, rotation: 270 },
      { type: 'spike_ceiling', x: 42, y: 4, rotation: 270 },
      { type: 'pad_red', x: 46, y: 0 },
      { type: 'block_neon', x: 49, y: 4 },
      { type: 'block_neon', x: 50, y: 4 },
      { type: 'block_neon', x: 51, y: 4, rotation: 90 },
      { type: 'collectable_coin', x: 51, y: 5 },
      { type: 'block_neon', x: 52, y: 4 },
      { type: 'block_neon', x: 53, y: 4 },
      { type: 'finish_gate', x: 110, y: 1 }
    ]
  },
  {
    id: 'lvl_cyber_overdrive',
    name: 'Cyber Overdrive',
    creator: 'HexMaster',
    difficulty: 'Hard',
    bpm: 144,
    theme: 'crimson_rush',
    length: 150,
    likes: 1020,
    plays: 4250,
    objects: [
      { type: 'portal_speed_fast', x: 8, y: 1 },
      // Fast single jumps
      { type: 'spike_floor', x: 15, y: 0 },
      { type: 'spike_floor', x: 22, y: 0 },
      { type: 'spike_floor', x: 23, y: 0 },
      // Pink hop orb onto platform
      { type: 'orb_pink', x: 29, y: 1 },
      { type: 'block_neon', x: 33, y: 1 },
      { type: 'block_neon', x: 34, y: 1 },
      // Secret Coin 1: Precision jump on fast platform
      { type: 'collectable_coin', x: 34, y: 3 },
      { type: 'block_neon', x: 35, y: 1 },
      // Sawblade jump
      { type: 'saw_blade', x: 41, y: 1 },
      // Pad into high platform
      { type: 'pad_yellow', x: 47, y: 0 },
      { type: 'block_grid', x: 53, y: 2 },
      { type: 'block_grid', x: 54, y: 2 },
      { type: 'block_grid', x: 55, y: 2 },
      // Blue gravity-flip orb
      { type: 'orb_blue', x: 61, y: 3 },
      // Secret Coin 2: High gravity ceiling corridor
      { type: 'collectable_coin', x: 64, y: 5 },
      { type: 'block_metal', x: 67, y: 6 },
      { type: 'block_metal', x: 68, y: 6 },
      { type: 'portal_gravity_norm', x: 74, y: 3 },
      // Multi-orb combo: yellow then pink
      { type: 'spike_triple', x: 82, y: 0 },
      { type: 'orb_yellow', x: 81, y: 2 },
      { type: 'orb_pink', x: 88, y: 3 },
      // Secret Coin 3: Orb chaining reward
      { type: 'collectable_coin', x: 89, y: 5 },
      { type: 'block_neon', x: 94, y: 1 },
      { type: 'block_neon', x: 95, y: 1 },
      // High speed sawblade gauntlet
      { type: 'saw_blade', x: 102, y: 2 },
      { type: 'spike_floor', x: 109, y: 0 },
      { type: 'pad_red', x: 114, y: 0 },
      { type: 'block_grid', x: 122, y: 3 },
      { type: 'finish_gate', x: 140, y: 1 }
    ]
  },
  {
    id: 'lvl_starlight_demon',
    name: 'Starlight Demon',
    creator: 'NovaGlitch',
    difficulty: 'Demon',
    bpm: 156,
    theme: 'dark_abyss',
    length: 165,
    likes: 1890,
    plays: 8650,
    objects: [
      { type: 'portal_speed_fast', x: 8, y: 1 },
      { type: 'spike_triple', x: 15, y: 0 },
      { type: 'orb_yellow', x: 20, y: 2 },
      // Jetpack Flight Mode Portal!
      { type: 'portal_fly', x: 28, y: 2 },
      // Well-spaced wave corridor for jetpack (generous vertical passage)
      { type: 'saw_blade', x: 36, y: 1 },
      // Secret Coin 1: Risky high altitude inside jetpack slalom
      { type: 'collectable_coin', x: 44, y: 5 },
      { type: 'saw_blade', x: 44, y: 6 },
      { type: 'saw_blade', x: 52, y: 1 },
      { type: 'saw_blade', x: 60, y: 7 },
      // Exit Flight Mode back to runner
      { type: 'portal_runner', x: 68, y: 2 },
      // Double spike jump
      { type: 'spike_floor', x: 76, y: 0 },
      { type: 'spike_floor', x: 77, y: 0 },
      // Gravity Inversion
      { type: 'portal_gravity_inv', x: 84, y: 2 },
      { type: 'block_metal', x: 90, y: 6 },
      { type: 'block_metal', x: 91, y: 6 },
      { type: 'spike_ceiling', x: 95, y: 7 },
      { type: 'orb_yellow', x: 99, y: 5 },
      // Secret Coin 2: Inverted ceiling corridor
      { type: 'collectable_coin', x: 102, y: 4 },
      { type: 'portal_gravity_norm', x: 106, y: 3 },
      // Final precision stretch
      { type: 'pad_yellow', x: 114, y: 0 },
      { type: 'orb_yellow', x: 120, y: 4 },
      // Secret Coin 3: Final leap over hazard gauntlet
      { type: 'collectable_coin', x: 124, y: 5 },
      { type: 'saw_blade', x: 128, y: 1 },
      { type: 'spike_triple', x: 136, y: 0 },
      { type: 'finish_gate', x: 152, y: 1 }
    ]
  },
  {
    id: 'lvl_electro_blitz',
    name: 'Electro Blitz',
    creator: 'VoltVanguard',
    difficulty: 'Insane',
    bpm: 148,
    theme: 'solar_flare',
    length: 155,
    likes: 1420,
    plays: 5310,
    objects: [
      { type: 'spike_floor', x: 12, y: 0 },
      { type: 'spike_floor', x: 18, y: 0 },
      { type: 'pad_yellow', x: 24, y: 0 },
      { type: 'block_neon', x: 28, y: 2 },
      { type: 'block_neon', x: 29, y: 2 },
      // Secret Coin 1: Floating above high neon step
      { type: 'collectable_coin', x: 29, y: 4 },
      { type: 'spike_floor', x: 34, y: 0 },
      { type: 'orb_dash_green', x: 38, y: 2 },
      { type: 'block_grid', x: 46, y: 2 },
      { type: 'block_grid', x: 47, y: 2 },
      { type: 'portal_gravity_inv', x: 54, y: 2 },
      { type: 'block_metal', x: 60, y: 6 },
      { type: 'block_metal', x: 61, y: 6 },
      // Secret Coin 2: High ceiling precision flip
      { type: 'collectable_coin', x: 65, y: 4 },
      { type: 'saw_blade', x: 68, y: 5 },
      { type: 'portal_gravity_norm', x: 76, y: 3 },
      { type: 'pad_pink', x: 82, y: 0 },
      { type: 'orb_yellow', x: 88, y: 3 },
      // Secret Coin 3: Late-stage timing gap
      { type: 'collectable_coin', x: 94, y: 3 },
      { type: 'spike_triple', x: 98, y: 0 },
      { type: 'portal_speed_fast', x: 106, y: 1 },
      { type: 'saw_blade', x: 114, y: 1 },
      { type: 'pad_yellow', x: 120, y: 0 },
      { type: 'finish_gate', x: 142, y: 1 }
    ]
  },
  {
    id: 'lvl_hyper_singularity',
    name: 'Cosmic Singularity',
    creator: 'ApexOverload',
    difficulty: 'Demon',
    bpm: 160,
    theme: 'cyber_cyan',
    length: 170,
    likes: 2430,
    plays: 9870,
    objects: [
      { type: 'portal_speed_fast', x: 6, y: 1 },
      { type: 'spike_floor', x: 14, y: 0 },
      { type: 'spike_triple', x: 20, y: 0 },
      { type: 'orb_yellow', x: 26, y: 2 },
      { type: 'block_neon', x: 30, y: 2 },
      // Secret Coin 1: Risky ascent over first saw
      { type: 'collectable_coin', x: 30, y: 4 },
      { type: 'saw_blade', x: 36, y: 2 },
      { type: 'portal_fly', x: 42, y: 2 },
      { type: 'saw_blade', x: 50, y: 1 },
      { type: 'saw_blade', x: 58, y: 6 },
      // Secret Coin 2: Dangerous pocket in jetpack flight
      { type: 'collectable_coin', x: 64, y: 2 },
      { type: 'saw_blade', x: 70, y: 7 },
      { type: 'portal_runner', x: 78, y: 2 },
      { type: 'spike_floor', x: 86, y: 0 },
      { type: 'pad_red', x: 92, y: 0 },
      { type: 'orb_blue', x: 98, y: 4 },
      { type: 'block_metal', x: 104, y: 6 },
      { type: 'portal_gravity_norm', x: 112, y: 3 },
      { type: 'spike_triple', x: 120, y: 0 },
      { type: 'orb_yellow', x: 126, y: 3 },
      // Secret Coin 3: Final demon leap
      { type: 'collectable_coin', x: 132, y: 5 },
      { type: 'saw_blade', x: 138, y: 1 },
      { type: 'spike_floor', x: 146, y: 0 },
      { type: 'finish_gate', x: 158, y: 1 }
    ]
  }
];
