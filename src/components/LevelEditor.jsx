/**
 * Integrated Community Level Editor (Vanilla JS / React).
 * Provides interactive grid editing, object palettes, test play, undo/redo,
 * community JSON export/import with validation, and local persistence.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { TILE_SIZE } from '../constants/gameDefaults.js';
import { VALID_OBJECT_TYPES, validateLevelData, parseAndValidateLevelString } from '../utils/levelValidator.js';
import { drawLevelObject, drawParallaxBackground } from '../engine/levelRenderer.js';
import { soundEngine } from '../engine/audioEngine.js';
import PaletteItemPreview from './PaletteItemPreview.jsx';
import AssetBrowser from './AssetBrowser/AssetBrowser.jsx';
import ParallaxStudioModal from './ParallaxStudio/ParallaxStudioModal.jsx';
import SpriteStudioModal from './SpriteStudio/SpriteStudioModal.jsx';
import { exportLevelPackageZip, importLevelPackage } from '../utils/levelZipManager.js';
import { getSavedBlueprints } from '../utils/customAssetsManager.js';
import { GAME_STYLES } from '../constants/gameStyles.js';
import { getVisibleObjects } from '../utils/occlusionCulling.js';
import {
  Play,
  Pause,
  Save,
  RotateCcw,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Upload,
  Settings,
  Grid,
  Sparkles,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Eraser,
  PenTool,
  Hand,
  RotateCw,
  Activity,
  Crosshair,
  Image as ImageIcon,
  ShieldCheck,
  ShieldAlert,
  Route,
  Flag,
  Layers,
  Zap,
  Gauge,
  ArrowLeft,
  ArrowDownToLine,
  Maximize2,
  Minimize2,
  GripHorizontal,
  Folder,
  MapPin,
  Navigation,
  Gamepad2,
  Flame,
  Sword
} from 'lucide-react';

const EDITOR_FLOOR_MARGIN_BOTTOM = 52;

const PALETTE_CATEGORIES = [
  {
    id: 'blocks',
    name: 'Blocks',
    environments: [
      {
        id: 'neon',
        name: 'Cyber Neon',
        iconType: 'block_neon',
        items: [
          { type: 'block_neon', label: 'Neon Block' },
          { type: 'block_metal', label: 'Metal Plate' },
          { type: 'block_grid', label: 'Grid Block' },
          { type: 'block_half', label: 'Half Block' },
        ]
      },
      {
        id: 'forest',
        name: 'Enchanted Forest & Jungle',
        iconType: 'block_wood',
        items: [
          { type: 'block_wood', label: 'Carved Wood' },
          { type: 'block_moss', label: 'Moss Stone' },
          { type: 'block_stone', label: 'Temple Slate' },
          { type: 'block_leaves', label: 'Canopy Leaves' },
          { type: 'block_jungle_ruin', label: 'Ancient Ruin' },
          { type: 'block_bamboo', label: 'Bamboo Stalks' },
          { type: 'block_sun_stone', label: 'Sun Idol Stone' },
          { type: 'block_root', label: 'Living Roots' },
          { type: 'block_jungle_slab', label: 'Mossy Half-Slab' },
          { type: 'block_canopy_bark', label: 'Canopy Bark' },
          { type: 'block_temple_stone', label: 'Temple Stone' },
          { type: 'block_temple_brick', label: 'Temple Brickwork' },
          { type: 'block_temple_slope_l', label: 'Pyramid Incline (L)' },
          { type: 'block_temple_slope_r', label: 'Pyramid Incline (R)' },
          { type: 'block_temple_cornice', label: 'Temple Cornice' },
          { type: 'block_temple_relief', label: 'Glyph Wall Relief' },
          { type: 'block_temple_platform', label: 'Temple Platform' },
        ]
      },
      {
        id: 'crystal',
        name: 'Crystal Cavern',
        iconType: 'block_amethyst',
        items: [
          { type: 'block_amethyst', label: 'Amethyst Crystal' },
          { type: 'block_slate', label: 'Basalt Bedrock' },
          { type: 'block_gem_cyan', label: 'Cyan Prism' },
        ]
      },
      {
        id: 'factory',
        name: 'Industrial Factory',
        iconType: 'block_hazard_stripe',
        items: [
          { type: 'block_hazard_stripe', label: 'Hazard Chevron' },
          { type: 'block_grate', label: 'Catwalk Grate' },
          { type: 'block_rivet', label: 'Riveted Girder' },
        ]
      }
    ]
  },
  {
    id: 'hazards',
    name: 'Hazards',
    environments: [
      {
        id: 'neon',
        name: 'Cyber Spikes',
        iconType: 'spike_floor',
        items: [
          { type: 'spike_floor', label: 'Floor Spike' },
          { type: 'spike_triple', label: 'Triple Spike' },
          { type: 'spike_ceiling', label: 'Ceiling Spike' },
          { type: 'saw_blade', label: 'Saw Blade' },
        ]
      },
      {
        id: 'forest',
        name: 'Jungle & Forest Hazards',
        iconType: 'hazard_thorns',
        items: [
          { type: 'hazard_thorns', label: 'Bramble Thorns' },
          { type: 'hazard_spore', label: 'Toxic Spores' },
          { type: 'hazard_acid_bog', label: 'Acid Bog' },
          { type: 'hazard_snapper_plant', label: 'Snapper Plant' },
          { type: 'hazard_dart_trap', label: 'Dart Trap' },
          { type: 'hazard_bamboo_spikes', label: 'Bamboo Spikes' },
          { type: 'hazard_jungle_saw', label: 'Sun Disc Saw' },
        ]
      },
      {
        id: 'crystal',
        name: 'Cavern Hazards',
        iconType: 'hazard_crystal',
        items: [
          { type: 'hazard_crystal', label: 'Crystal Spikes' },
          { type: 'hazard_magma', label: 'Molten Magma' },
        ]
      },
      {
        id: 'factory',
        name: 'Industrial Hazards',
        iconType: 'hazard_laser',
        items: [
          { type: 'hazard_laser', label: 'Death Laser' },
          { type: 'hazard_steam', label: 'Scalding Steam' },
        ]
      }
    ]
  },
  {
    id: 'decorations',
    name: 'Visual Decor',
    environments: [
      {
        id: 'neon',
        name: 'Cyber Scenery',
        iconType: 'deco_beacon',
        items: [
          { type: 'deco_pillar', label: 'Tech Pillar' },
          { type: 'deco_chain', label: 'Cyber Chain' },
          { type: 'deco_arrow', label: 'Neon Chevron' },
          { type: 'deco_hazard', label: 'Hazard Beam' },
          { type: 'deco_beacon', label: 'Light Beacon' },
          { type: 'deco_grid', label: 'Cyber Lattice' },
          { type: 'deco_pipe', label: 'Conduit Pipe' },
          { type: 'deco_screen', label: 'Holo Screen' },
          { type: 'deco_light', label: 'Ambient Spot' },
        ]
      },
      {
        id: 'forest',
        name: 'Jungle & Temple Decor',
        iconType: 'deco_monstera',
        items: [
          { type: 'deco_monstera', label: 'Monstera Palm' },
          { type: 'deco_temple_pillar', label: 'Carved Column' },
          { type: 'deco_altar', label: 'Sacrifice Altar' },
          { type: 'deco_sun_disc', label: 'Gold Sun Disc' },
          { type: 'deco_serpent_idol', label: 'Serpent Idol' },
          { type: 'deco_temple_urn', label: 'Terracotta Urn' },
          { type: 'deco_tribal_banner', label: 'Tribal Banner' },
          { type: 'deco_jade_statue', label: 'Jade Idol' },
          { type: 'deco_temple_stairs', label: 'Temple Ruins' },
          { type: 'deco_mayan_mask', label: 'Mayan Gold Mask' },
          { type: 'deco_torch', label: 'Temple Torch' },
          { type: 'deco_totem', label: 'Tiki Totem' },
          { type: 'deco_fireflies', label: 'Firefly Swarm' },
          { type: 'deco_jungle_flower', label: 'Exotic Orchid' },
          { type: 'deco_vine', label: 'Jungle Vine' },
          { type: 'deco_waterfall', label: 'Jungle Mist' },
          { type: 'deco_creeper', label: 'Weeping Moss' },
          { type: 'deco_mushroom', label: 'Glow Mushroom' },
          { type: 'deco_lantern', label: 'Fairy Lantern' },
          { type: 'deco_tree', label: 'Bonsai Tree' },
          { type: 'deco_temple_doorway', label: 'Temple Entrance' },
          { type: 'deco_temple_roof_comb', label: 'Roof Comb Crest' },
          { type: 'deco_brazier', label: 'Fire Brazier' },
          { type: 'deco_wall_torch', label: 'Wall Sconce Torch' },
          { type: 'deco_skull_relief', label: 'Skull Rack Wall' },
          { type: 'deco_mayan_hieroglyphs', label: 'Hieroglyph Band' },
          { type: 'deco_hanging_roots', label: 'Temple Vines' },
          { type: 'deco_golden_sun_altar', label: 'Golden Sun Altar' },
        ]
      },
      {
        id: 'crystal',
        name: 'Cavern Decor',
        iconType: 'deco_crystal',
        items: [
          { type: 'deco_crystal', label: 'Prism Shard' },
          { type: 'deco_rune', label: 'Mystic Rune' },
        ]
      },
      {
        id: 'factory',
        name: 'Factory Decor',
        iconType: 'deco_cog',
        items: [
          { type: 'deco_cog', label: 'Mechanical Cog' },
          { type: 'deco_vent', label: 'Air Vent' },
          { type: 'deco_cables', label: 'Power Cables' },
        ]
      }
    ]
  },
  {
    id: 'orbs',
    name: 'Jump Orbs',
    items: [
      { type: 'orb_yellow', label: 'Yellow Orb' },
      { type: 'orb_pink', label: 'Pink Orb' },
      { type: 'orb_blue', label: 'Gravity Orb' },
      { type: 'orb_green', label: 'Flip Orb' },
      { type: 'orb_black', label: 'Slam Orb' },
      { type: 'orb_dash_green', label: 'Dash Orb' },
      { type: 'orb_dash_magenta', label: 'Pink Dash' },
    ]
  },
  {
    id: 'pads',
    name: 'Launch Pads',
    items: [
      { type: 'pad_yellow', label: 'Yellow Pad' },
      { type: 'pad_pink', label: 'Pink Pad' },
      { type: 'pad_red', label: 'Super Pad' },
      { type: 'pad_blue', label: 'Gravity Pad' },
    ]
  },
  {
    id: 'portals',
    name: 'Portals',
    items: [
      { type: 'portal_gravity_inv', label: 'Invert Gravity' },
      { type: 'portal_gravity_norm', label: 'Normal Gravity' },
      { type: 'portal_speed_slow', label: 'Speed 0.7x' },
      { type: 'portal_speed_fast', label: 'Speed 1.5x' },
      { type: 'portal_fly', label: 'Rocket Portal' },
      { type: 'portal_runner', label: 'Runner Portal' },
      { type: 'finish_gate', label: 'Finish Gate (3T)' },
      { type: 'finish_gate_full', label: 'Full Finish Line (Ceiling to Floor)' }
    ]
  },
  {
    id: 'collectibles',
    name: 'Items & Coins',
    items: [
      { type: 'collectable_coin', label: 'Secret Coin' }
    ]
  }
];

function getInitialEnvironment(level) {
  if (!level) return 'neon';
  if (level.environment && ['neon', 'forest', 'crystal', 'factory'].includes(level.environment)) {
    return level.environment;
  }
  const theme = (level.theme || '').toLowerCase();
  if (theme.includes('jungle') || theme.includes('forest') || theme.includes('ruins')) return 'forest';
  if (theme.includes('crystal') || theme.includes('cavern') || theme.includes('amethyst')) return 'crystal';
  if (theme.includes('industrial') || theme.includes('factory') || theme.includes('metal')) return 'factory';

  if (Array.isArray(level.objects)) {
    const counts = { forest: 0, crystal: 0, factory: 0, neon: 0 };
    for (const obj of level.objects) {
      if (!obj || !obj.type) continue;
      if (obj.type.includes('jungle') || obj.type.includes('temple') || obj.type.includes('monstera') || obj.type.includes('torch') || obj.type.includes('brazier') || obj.type.includes('bamboo')) {
        counts.forest++;
      } else if (obj.type.includes('crystal') || obj.type.includes('stalactite') || obj.type.includes('amethyst')) {
        counts.crystal++;
      } else if (obj.type.includes('factory') || obj.type.includes('steam') || obj.type.includes('pipe') || obj.type.includes('piston') || obj.type.includes('hazard_stripe')) {
        counts.factory++;
      } else if (obj.type.includes('neon')) {
        counts.neon++;
      }
    }
    const maxCat = Object.entries(counts).reduce((max, [k, v]) => v > max[1] ? [k, v] : max, ['neon', 0]);
    if (maxCat[1] > 0) return maxCat[0];
  }
  return 'neon';
}

export default function LevelEditor({
  initialLevel,
  onPlaytest,
  onSaveLevel,
  onExit,
  trajectory = null,
  onClearTrajectory = null
}) {
  const [levelData, setLevelData] = useState(() => {
    const val = validateLevelData(initialLevel);
    return val.valid ? val.level : {
      id: `custom_${Date.now()}`,
      name: 'New Community Level',
      creator: 'Creator',
      difficulty: 'Medium',
      bpm: 130,
      theme: 'cyber_cyan',
      length: 120,
      verified: false,
      objects: [
        { type: 'finish_gate', x: 110, y: 1 }
      ]
    };
  });

  // Recorded player trajectory from last playtest
  const [playerTrajectory, setPlayerTrajectory] = useState(trajectory);
  const [showTrajectory, setShowTrajectory] = useState(true);

  // Placement visual layer: 'background' (behind player) vs 'foreground' (in front of player)
  const [activeLayer, setActiveLayer] = useState('background');

  // Multi-layer editing mode: 'all' (Dual-layer coexistence: blocks & visuals share tile), 'l1' (Layer 1: Blocks only), 'l2' (Layer 2: Visuals/Decor only)
  const [editLayerMode, setEditLayerMode] = useState('all');

  // Interactive Replay & Dynamic Reaction Simulation Engine
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1.0); // 0.5, 1.0, 2.0
  const [replayLoop, setReplayLoop] = useState(true);
  const [replayFollowCamera, setReplayFollowCamera] = useState(true);
  const [showReplayDock, setShowReplayDock] = useState(true);
  const [activeSimulationReaction, setActiveSimulationReaction] = useState(null);

  // Docking & Floating Replay state (can dock to bottom above items or float anywhere)
  const [isReplayDocked, setIsReplayDocked] = useState(true);
  const [isReplayMinimized, setIsReplayMinimized] = useState(false);
  const [replayFloatPos, setReplayFloatPos] = useState({ x: 80, y: 40 });
  const [isDraggingReplay, setIsDraggingReplay] = useState(false);
  const replayDragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  // Parallax Studio & 2D Spritesheet Studio Modal states
  const [showParallaxModal, setShowParallaxModal] = useState(false);
  const [showSpriteStudioModal, setShowSpriteStudioModal] = useState(false);

  // Asset Browser UI state (collapsible Unreal/Unity drawer style)
  const [isAssetBrowserCollapsed, setIsAssetBrowserCollapsed] = useState(false);
  const [assetBrowserTab, setAssetBrowserTab] = useState('builtin');

  // Environment subcategory state initialized intelligently from level theme or objects
  const initialEnv = getInitialEnvironment(initialLevel);
  const [activeEnvironment, setActiveEnvironment] = useState(() => initialEnv);

  // Independent state per category: remembers which environment and which item was active
  const categoryStateRef = useRef({
    blocks: {
      env: initialEnv,
      item: initialEnv === 'forest' ? 'block_jungle' : (initialEnv === 'crystal' ? 'block_crystal' : (initialEnv === 'factory' ? 'block_factory' : 'block_neon'))
    },
    hazards: {
      env: initialEnv,
      item: initialEnv === 'forest' ? 'hazard_jungle_bamboo' : (initialEnv === 'crystal' ? 'hazard_crystal_spike' : (initialEnv === 'factory' ? 'hazard_factory_steam' : 'spike_floor'))
    },
    decorations: {
      env: initialEnv,
      item: initialEnv === 'forest' ? 'deco_monstera' : (initialEnv === 'crystal' ? 'deco_crystal_cluster' : (initialEnv === 'factory' ? 'deco_factory_pipe' : 'deco_neon_light'))
    },
    orbs: { env: null, item: 'orb_yellow' },
    pads: { env: null, item: 'pad_yellow' },
    portals: { env: null, item: 'portal_gravity_inv' },
    collectibles: { env: null, item: 'collectable_coin' }
  });

  // Drag listeners for floating replay bar
  const handleReplayDragStart = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    e.preventDefault();
    setIsDraggingReplay(true);
    replayDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: replayFloatPos.x,
      posY: replayFloatPos.y
    };
  };

  useEffect(() => {
    if (!isDraggingReplay) return;
    const onMouseMove = (e) => {
      const dx = e.clientX - replayDragStartRef.current.mouseX;
      const dy = e.clientY - replayDragStartRef.current.mouseY;
      setReplayFloatPos({
        x: Math.max(10, Math.min(window.innerWidth - 340, replayDragStartRef.current.posX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 120, replayDragStartRef.current.posY + dy))
      });
    };
    const onMouseUp = () => {
      setIsDraggingReplay(false);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingReplay]);

  const lastReplayTimeRef = useRef(performance.now());
  const isReplayingRef = useRef(isReplaying);
  isReplayingRef.current = isReplaying;
  const replayIndexRef = useRef(replayIndex);
  replayIndexRef.current = replayIndex;
  const replaySpeedRef = useRef(replaySpeed);
  replaySpeedRef.current = replaySpeed;
  const replayLoopRef = useRef(replayLoop);
  replayLoopRef.current = replayLoop;
  const playerTrajectoryRef = useRef(playerTrajectory);
  playerTrajectoryRef.current = playerTrajectory;

  useEffect(() => {
    if (trajectory && Array.isArray(trajectory) && trajectory.length > 0) {
      setPlayerTrajectory(trajectory);
      setShowTrajectory(true);
      setReplayIndex(0);
      replayIndexRef.current = 0;
      setShowReplayDock(true);
    }
  }, [trajectory]);

  const getReactionBannerInfo = () => {
    if (!playerTrajectory || playerTrajectory.length === 0) {
      return { text: 'Scrub slider to replay playtest actions', colorClass: 'text-neutral-400' };
    }
    const pt = playerTrajectory[Math.min(playerTrajectory.length - 1, Math.floor(replayIndex))];
    if (!pt) return { text: 'Scrub slider to replay playtest actions', colorClass: 'text-neutral-400' };
    const ghostGx = pt.gx;
    const ghostGy = pt.gy;
    const hitObj = Array.isArray(levelData.objects) && levelData.objects.find(o => Math.abs(o.x - ghostGx) < 0.95 && Math.abs(o.y - ghostGy) < 1.25);
    if (hitObj) {
      const hType = typeof hitObj.type === 'string' ? hitObj.type : '';
      if (hType.startsWith('pad_')) {
        return { text: `🚀 Launch Pad at (${hitObj.x}, ${hitObj.y}) — Impulse Active!`, colorClass: 'text-amber-400 font-semibold' };
      }
      if (hType.startsWith('spike_') || hType.startsWith('hazard_') || hType === 'saw_blade') {
        return { text: `⚠️ Danger Hazard at (${hitObj.x}, ${hitObj.y})`, colorClass: 'text-rose-400 font-semibold' };
      }
      if (hType.startsWith('orb_')) {
        return { text: `✨ In Range of Jump Orb at (${hitObj.x}, ${hitObj.y})`, colorClass: 'text-cyan-400 font-semibold' };
      }
      if (hType.startsWith('portal_')) {
        return { text: `🌀 In Range of Portal at (${hitObj.x}, ${hitObj.y})`, colorClass: 'text-purple-400 font-semibold' };
      }
      if (hType.startsWith('deco_')) {
        return { text: `Passing ${hitObj.layer === 'foreground' ? 'in front of' : 'behind'} Decor: ${hType}`, colorClass: 'text-neutral-300' };
      }
      return { text: `Passing Placed Object: ${hType}`, colorClass: 'text-emerald-400' };
    }
    return { text: 'Place items along trajectory to test reactions live', colorClass: 'text-neutral-400' };
  };

  const [activeCategory, setActiveCategory] = useState('blocks');
  const [selectedTool, setSelectedTool] = useState('place'); // 'place', 'erase', 'pan'
  const [selectedObjectType, setSelectedObjectType] = useState('block_neon');
  const [selectedRotation, setSelectedRotation] = useState(0); // 0, 90, 180, 270
  const [showBeatGuides, setShowBeatGuides] = useState(true); // BPM 4/4 Beat grid guides
  const [scrollGridX, setScrollGridX] = useState(0);
  const [panOffsetX, setPanOffsetX] = useState(0); // Sub-tile horizontal pixel offset for smooth hand grabbing
  const [panOffsetY, setPanOffsetY] = useState(0); // Vertical pixel offset to move floor & level up/down
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  // Mouse hover grid coordinates for instant visual cursor preview
  const [hoverGridPos, setHoverGridPos] = useState({ gx: 0, gy: 0, visible: false, isBelowFloor: false });
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1200, height: 480 });

  // Undo / Redo history
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Sync state if initialLevel changes
  useEffect(() => {
    if (initialLevel) {
      const val = validateLevelData(initialLevel);
      if (val.valid) {
        setLevelData(val.level);
      }
    }
  }, [initialLevel]);

  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isPointerDownRef = useRef(false);
  const lastActionPosRef = useRef(null);
  const isPanningRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const panStartRef = useRef({
    clientX: 0,
    clientY: 0,
    startCameraX: 0,
    startPanY: 0
  });

  // Push state to undo history
  const pushHistory = useCallback((newObjects) => {
    setHistory(prev => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, JSON.stringify(newObjects)];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const showNotification = (msg, isError = false) => {
    setStatusMessage({ text: msg, isError });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Keep canvas buffer resolution 1:1 with real screen layout pixels
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        setCanvasDimensions({ width: w, height: h });
      }
    };

    updateSize();

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(canvas);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Precise canvas interaction coordinates helper (calibrated for 1:1 square grid, zoom, and panning)
  const getGridPosFromMouse = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { gx: 0, gy: 0, isBelowFloor: false, isValid: false };
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { gx: 0, gy: 0, isBelowFloor: false, isValid: false };

    // Convert CSS pixel mouse coordinates into exact canvas buffer pixel space
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = (e.clientX - rect.left) * scaleX;
    const clientY = (e.clientY - rect.top) * scaleY;

    // Mathematical square tile size
    const effectiveTile = Math.round(TILE_SIZE * zoomScale);
    const baseFloorY = canvas.height - EDITOR_FLOOR_MARGIN_BOTTOM;
    const floorY = baseFloorY + panOffsetY;
    const cameraPixelX = scrollGridX * effectiveTile + panOffsetX;

    // Column in world coordinates
    const worldPixelX = clientX + cameraPixelX;
    const gx = Math.floor(worldPixelX / effectiveTile);

    // Vertical distance from the floor line upwards
    const relativeY = floorY - clientY;
    const gy = Math.floor(relativeY / effectiveTile);

    return {
      gx: Math.max(0, Math.min(levelData.length + 5, gx)),
      gy: Math.max(0, Math.min(24, gy)),
      isBelowFloor: relativeY < 0,
      isValid: true
    };
  }, [zoomScale, scrollGridX, panOffsetX, panOffsetY, levelData.length]);

  // Execute placement, start setting, or deletion at a grid cell
  const executeActionAt = useCallback((gx, gy, toolOverride = null) => {
    const tool = toolOverride || selectedTool;
    try {
      setLevelData(prev => {
        const currentObjects = [...prev.objects];

        // 1. SET PLAYER START LOCATION
        if (tool === 'start') {
          const cleanStartX = Math.max(0, Math.min(prev.length - 3, gx));
          const cleanStartY = Math.max(0, Math.min(20, gy));
          if (soundEngine && typeof soundEngine.playCheckpoint === 'function') {
            soundEngine.playCheckpoint();
          } else {
            soundEngine.playClick();
          }
          setStatusMessage(`Player Start Location set to (X: ${cleanStartX}, Y: ${cleanStartY})`);
          return {
            ...prev,
            verified: false,
            startX: cleanStartX,
            startY: cleanStartY,
            playerStart: { x: cleanStartX, y: cleanStartY }
          };
        }

        // 2. BULLDOZER / ERASE
        if (tool === 'erase') {
          let remaining;
          if (editLayerMode === 'l2') {
            // Only erase Layer 2 (Visuals/Decor)
            remaining = currentObjects.filter(obj => !(obj.x === gx && obj.y === gy && (obj.type?.startsWith('deco_') || obj.role === 'decor')));
          } else if (editLayerMode === 'l1') {
            // Only erase Layer 1 (Blocks & Gameplay Hazards)
            remaining = currentObjects.filter(obj => !(obj.x === gx && obj.y === gy && !obj.type?.startsWith('deco_') && obj.role !== 'decor'));
          } else {
            // Dual Layer: If a tile has both a decor (lamp/torch) AND a solid block,
            // remove the decor first, preserving the block underneath!
            const objectsAtTile = currentObjects.filter(obj => obj.x === gx && obj.y === gy);
            if (objectsAtTile.length > 1) {
              remaining = currentObjects.filter(obj => !(obj.x === gx && obj.y === gy && (obj.type?.startsWith('deco_') || obj.role === 'decor')));
            } else {
              remaining = currentObjects.filter(obj => !(obj.x === gx && obj.y === gy));
            }
          }

          if (remaining.length !== currentObjects.length) {
            pushHistory(currentObjects);
            soundEngine.playClick();
            return { ...prev, verified: false, objects: remaining };
          }
        }

        // 3. PLACE OBJECT
        else if (tool === 'place') {
          if (!selectedObjectType) return prev;
          // Custom blueprint resolution
          const customBp = (prev.customBlueprints || []).find(b => b.id === selectedObjectType) ||
                           getSavedBlueprints().find(b => b.id === selectedObjectType);
          const isDeco = (typeof selectedObjectType === 'string' && selectedObjectType.startsWith('deco_')) || (customBp?.role === 'decor');

          // Check if an existing object in the SAME visual layer already occupies this cell to cycle rotation & layer
          const existingInSameLayer = currentObjects.find(obj =>
            obj.x === gx && obj.y === gy && (isDeco ? (obj.type?.startsWith('deco_') || obj.role === 'decor') : (!obj.type?.startsWith('deco_') && obj.role !== 'decor'))
          );

          if (existingInSameLayer && existingInSameLayer.type === selectedObjectType) {
            const nextRot = ((existingInSameLayer.rotation || 0) + 90) % 360;
            const nextLayer = activeLayer || existingInSameLayer.layer || 'background';
            const updated = currentObjects.map(obj =>
              obj === existingInSameLayer ? { ...obj, rotation: nextRot, layer: nextLayer } : obj
            );
            pushHistory(currentObjects);
            soundEngine.playClick();
            setStatusMessage(`Rotated ${isDeco ? 'Decor' : 'Object'} to ${nextRot}° (${nextLayer === 'foreground' ? 'In Front' : 'Behind'})`);
            return { ...prev, verified: false, objects: updated };
          }

          // DUAL-LAYER SEPARATION:
          let filtered;
          if (isDeco) {
            filtered = currentObjects.filter(obj => !(obj.x === gx && obj.y === gy && (obj.type?.startsWith('deco_') || obj.role === 'decor')));
          } else {
            filtered = currentObjects.filter(obj => !(obj.x === gx && obj.y === gy && !obj.type?.startsWith('deco_') && obj.role !== 'decor'));
          }

          const isFullFinish = selectedObjectType === 'finish_gate_full';
          const newObj = {
            type: isFullFinish ? 'finish_gate' : selectedObjectType,
            x: gx,
            y: isFullFinish ? 1 : gy,
            spanFull: isFullFinish ? true : undefined,
            rotation: selectedRotation,
            layer: (customBp?.layer) || activeLayer, // 'background' (behind player) or 'foreground' (in front of player)
            customId: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            imageUrl: customBp?.imageUrl,
            customAsset: customBp,
            role: customBp?.role
          };

          let updatedBlueprints = prev.customBlueprints || [];
          if (customBp && !updatedBlueprints.some(b => b.id === customBp.id)) {
            updatedBlueprints = [...updatedBlueprints, customBp];
          }

          pushHistory(currentObjects);
          soundEngine.playClick();
          return {
            ...prev,
            verified: false,
            objects: [...filtered, newObj],
            customBlueprints: updatedBlueprints
          };
        }
        return prev;
      });
    } catch (err) {
      console.error('Error modifying canvas object:', err);
    }
  }, [selectedTool, selectedObjectType, selectedRotation, activeLayer, editLayerMode, pushHistory]);

  // Pointer event handlers for drawing, bulldozing, and hand panning
  const handlePointerDown = (e) => {
    const isPanMode = selectedTool === 'pan' || e.button === 1 || isSpacePressedRef.current;

    if (isPanMode) {
      isPanningRef.current = true;
      setIsGrabbing(true);
      const effectiveTile = Math.round(TILE_SIZE * zoomScale);
      const currentCameraX = scrollGridX * effectiveTile + panOffsetX;
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        startCameraX: currentCameraX,
        startPanY: panOffsetY
      };
      return;
    }

    if (e.button === 2) {
      // Right click: Instant Bulldoze / Quick Erase
      const pos = getGridPosFromMouse(e);
      if (pos.isValid && !pos.isBelowFloor) {
        executeActionAt(pos.gx, pos.gy, 'erase');
      }
      return;
    }

    isPointerDownRef.current = true;
    const pos = getGridPosFromMouse(e);
    if (pos.isValid && !pos.isBelowFloor) {
      lastActionPosRef.current = `${pos.gx},${pos.gy}`;
      executeActionAt(pos.gx, pos.gy);
    }
  };

  const handlePointerMove = (e) => {
    if (isPanningRef.current) {
      const deltaX = e.clientX - panStartRef.current.clientX;
      const deltaY = e.clientY - panStartRef.current.clientY;

      const effectiveTile = Math.round(TILE_SIZE * zoomScale);
      const newCameraX = Math.max(0, Math.min(levelData.length * effectiveTile, panStartRef.current.startCameraX - deltaX));
      const newScrollTile = Math.floor(newCameraX / effectiveTile);
      const newSubTile = newCameraX - (newScrollTile * effectiveTile);

      setScrollGridX(newScrollTile);
      setPanOffsetX(newSubTile);

      // Vertical panning: moving mouse down pulls the level down, moving mouse up raises the level up
      const newPanY = panStartRef.current.startPanY + deltaY;
      setPanOffsetY(Math.max(-1200, Math.min(800, newPanY)));
      return;
    }

    const pos = getGridPosFromMouse(e);
    if (pos.isValid) {
      setHoverGridPos({
        gx: pos.gx,
        gy: pos.gy,
        visible: true,
        isBelowFloor: pos.isBelowFloor
      });

      // Smooth drag placement or bulldozing
      if (isPointerDownRef.current && !pos.isBelowFloor && selectedTool !== 'pan') {
        const key = `${pos.gx},${pos.gy}`;
        if (key !== lastActionPosRef.current) {
          lastActionPosRef.current = key;
          executeActionAt(pos.gx, pos.gy);
        }
      }
    }
  };

  const handlePointerUp = () => {
    isPanningRef.current = false;
    if (!isSpacePressedRef.current) {
      setIsGrabbing(false);
    }
    isPointerDownRef.current = false;
    lastActionPosRef.current = null;
  };

  const handlePointerLeave = () => {
    isPanningRef.current = false;
    if (!isSpacePressedRef.current) {
      setIsGrabbing(false);
    }
    isPointerDownRef.current = false;
    lastActionPosRef.current = null;
    setHoverGridPos(prev => ({ ...prev, visible: false }));
  };

  // Mouse wheel handler for panning & zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl + Wheel
      const step = e.deltaY < 0 ? 0.08 : -0.08;
      setZoomScale(s => Math.max(0.7, Math.min(1.4, Number((s + step).toFixed(2)))));
    } else if (e.shiftKey) {
      // Horizontal scroll with Shift + Wheel
      const step = e.deltaY > 0 ? 3 : -3;
      setScrollGridX(x => Math.max(0, Math.min(levelData.length, x + step)));
      setPanOffsetX(0);
    } else {
      // Vertical pan with Wheel to move level up / down easily
      setPanOffsetY(py => Math.max(-1200, Math.min(800, py - e.deltaY * 0.75)));
    }
  };

  // Reference holding current render properties for smooth 60fps continuous animation
  const renderDataRef = useRef({});
  renderDataRef.current = {
    levelData,
    scrollGridX,
    panOffsetX,
    panOffsetY,
    zoomScale,
    selectedTool,
    selectedObjectType,
    selectedRotation,
    showBeatGuides,
    hoverGridPos,
    isGrabbing,
    playerTrajectory,
    showTrajectory,
    activeLayer,
    editLayerMode,
    isReplaying,
    replayIndex,
    replaySpeed,
    replayLoop,
    replayFollowCamera
  };

  // Continuous 60fps render loop for Level Editor canvas
  useEffect(() => {
    let animId;

    const renderLoop = (timeNow) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const state = renderDataRef.current;
          const {
            levelData: currentLevel,
            scrollGridX: sGridX = 0,
            panOffsetX: pOffX = 0,
            panOffsetY: pOffY = 0,
            zoomScale: zScale = 1.0,
            selectedTool: sTool = 'place',
            selectedObjectType: sObjType = 'block_neon',
            selectedRotation: sRotation = 0,
            showBeatGuides: sBeatGuides = true,
            hoverGridPos: hPos,
            isGrabbing: grabbing,
            playerTrajectory: pTrajectory = null,
            showTrajectory: sTrajectory = true,
            activeLayer: sActiveLayer = 'background',
            editLayerMode: sEditLayerMode = 'all',
            isReplaying: replaying = false,
            replaySpeed: rSpeed = 1.0,
            replayLoop: rLoop = true,
            replayFollowCamera: rFollow = true
          } = state;

          // Replay progression calculation
          if (replaying && pTrajectory && pTrajectory.length > 1) {
            const dt = Math.min(0.08, (timeNow - lastReplayTimeRef.current) / 1000);
            lastReplayTimeRef.current = timeNow;
            const advance = dt * 45 * rSpeed;
            let nextIdx = replayIndexRef.current + advance;
            if (nextIdx >= pTrajectory.length - 1) {
              if (rLoop) {
                nextIdx = 0;
              } else {
                nextIdx = pTrajectory.length - 1;
                setIsReplaying(false);
                isReplayingRef.current = false;
              }
            }
            replayIndexRef.current = nextIdx;
            setReplayIndex(nextIdx);
          } else {
            lastReplayTimeRef.current = timeNow;
          }

          if (currentLevel) {
            const width = canvas.width;
            const height = canvas.height;
            const effectiveTile = Math.round(TILE_SIZE * zScale);
            const baseFloorY = height - EDITOR_FLOOR_MARGIN_BOTTOM;
            const floorY = baseFloorY + pOffY;
            const cameraPixelX = sGridX * effectiveTile + pOffX;

            ctx.clearRect(0, 0, width, height);

            // Parallax background (custom multi-layer or custom URL or theme backdrop)
            if (currentLevel.parallaxLayers?.length > 0 || currentLevel.backgroundUrl) {
              drawParallaxBackground(
                ctx,
                cameraPixelX,
                width,
                height,
                timeNow,
                currentLevel.theme || 'cyber_cyan',
                currentLevel.backgroundUrl,
                currentLevel.bgParallaxSpeed || 0.25,
                currentLevel.parallaxLayers
              );
            } else {
              ctx.fillStyle = '#070b14';
              ctx.fillRect(0, 0, width, height);
            }

            // Floor area - fills from floorY all the way down to below viewport
            ctx.fillStyle = '#0a0f1d';
            ctx.fillRect(0, floorY, width, Math.max(0, height - floorY + 400));

            // Floor top edge line
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, floorY);
            ctx.lineTo(width, floorY);
            ctx.stroke();

            // Sub-floor hazard stripes
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
            ctx.lineWidth = 1;
            const stripeBottom = Math.max(height, floorY + 120);
            for (let fx = 0; fx < width + 60; fx += 30) {
              ctx.beginPath();
              ctx.moveTo(fx, floorY);
              ctx.lineTo(fx - 20, stripeBottom);
              ctx.stroke();
            }

            // Grid lines - Exact mathematical squares of size effectiveTile x effectiveTile
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;

            // Sub-tile horizontal offset for seamless smooth panning
            const startTileX = Math.floor(cameraPixelX / effectiveTile);
            const numVisibleX = Math.ceil(width / effectiveTile) + 3;

            // Vertical grid lines
            for (let i = -1; i <= numVisibleX; i++) {
              const gx = startTileX + i;
              if (gx < 0) continue;
              const sx = gx * effectiveTile - cameraPixelX;
              ctx.beginPath();
              ctx.moveTo(sx, Math.min(0, floorY - 1200));
              ctx.lineTo(sx, floorY);
              ctx.stroke();

              // Coordinate marker every 5 blocks along floor
              if (gx % 5 === 0) {
                ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
                ctx.font = '10px monospace';
                ctx.fillText(`${gx}`, sx + 4, floorY + 16);
              }
            }

            // Horizontal grid lines from floor upwards
            const maxLinesY = Math.ceil(Math.max(floorY + 400, height + 400) / effectiveTile);
            for (let j = 0; j <= maxLinesY; j++) {
              const sy = floorY - j * effectiveTile;
              if (sy < -effectiveTile || sy > height + effectiveTile) continue;
              ctx.beginPath();
              ctx.moveTo(0, sy);
              ctx.lineTo(width, sy);
              ctx.stroke();
            }

            // Musical BPM Beat Guides (Rhythm Markers)
            if (sBeatGuides) {
              // Tiles per quarter-note beat based on level BPM
              const tilesPerBeat = (420 * (60 / Math.max(60, Number(currentLevel.bpm) || 130))) / TILE_SIZE;
              const startBeat = Math.max(0, Math.floor(startTileX / tilesPerBeat));
              const endBeat = Math.ceil((startTileX + numVisibleX) / tilesPerBeat);

              for (let b = startBeat; b <= endBeat; b++) {
                const beatGX = b * tilesPerBeat;
                const beatScreenX = beatGX * effectiveTile - cameraPixelX;
                if (beatScreenX < -50 || beatScreenX > width + 50) continue;

                const isBar = (b % 4 === 0);
                ctx.strokeStyle = isBar ? 'rgba(234, 179, 8, 0.45)' : 'rgba(234, 179, 8, 0.18)';
                ctx.lineWidth = isBar ? 2 : 1;
                if (!isBar) {
                  ctx.setLineDash([4, 4]);
                } else {
                  ctx.setLineDash([]);
                }

                ctx.beginPath();
                ctx.moveTo(beatScreenX, Math.min(0, floorY - 1200));
                ctx.lineTo(beatScreenX, floorY);
                ctx.stroke();
                ctx.setLineDash([]);

                if (isBar) {
                  ctx.fillStyle = 'rgba(234, 179, 8, 0.85)';
                  ctx.font = 'bold 9px monospace';
                  ctx.fillText(`M${(b / 4) + 1}`, beatScreenX + 3, Math.max(16, floorY - 240));
                }
              }
            }

            // Placed level objects (Background Layer - drawn behind player & trajectory)
            const animTime = typeof timeNow === 'number' ? timeNow : performance.now();
            const ceilingY = floorY - 10 * effectiveTile;

            ctx.save();
            if (Array.isArray(currentLevel.objects)) {
              // Separate into Blocks/Hazards (Layer 1) and Visual Decors (Layer 2)
              // Viewport occlusion culling ensures top-tier performance on huge levels with 5,000+ blocks
              const visibleEditorObjects = getVisibleObjects(currentLevel.objects, cameraPixelX, width, effectiveTile, 4);
              const bgObjects = visibleEditorObjects.filter(obj => obj && !(obj.layer === 'foreground' || obj.layer === 'fg' || obj.inFront));
              const l1Objects = bgObjects.filter(obj => obj && !(typeof obj.type === 'string' && obj.type.startsWith('deco_')));
              const l2Objects = bgObjects.filter(obj => obj && typeof obj.type === 'string' && obj.type.startsWith('deco_'));

              const renderEditorObj = (obj, layerAlpha) => {
                const objWorldX = obj.x * effectiveTile;
                const screenX = objWorldX - cameraPixelX;

                if (screenX > -effectiveTile * 2 && screenX < width + effectiveTile) {
                  const screenY = floorY - (obj.y + 1) * effectiveTile;
                  const isSpanFull = Boolean(
                    obj.spanFull ||
                    obj.type === 'finish_gate_full' ||
                    (obj.type === 'finish_gate' && currentLevel.finishSpan === 'full')
                  );
                  
                  ctx.save();
                  ctx.globalAlpha = layerAlpha;
                  if (isSpanFull) {
                    drawLevelObject(ctx, { ...obj, spanFull: true }, screenX, screenY, animTime, ceilingY, floorY, effectiveTile);
                  } else if (screenY > -effectiveTile * 3 && screenY < height + effectiveTile * 2) {
                    ctx.translate(screenX, screenY);
                    const scale = effectiveTile / TILE_SIZE;
                    ctx.scale(scale, scale);
                    drawLevelObject(ctx, obj, 0, 0, animTime, null, null, TILE_SIZE, currentLevel.customBlueprints);
                  }
                  ctx.restore();
                }
              };

              // Draw Layer 1 (Blocks & Hazards)
              const l1Alpha = sEditLayerMode === 'l2' ? 0.35 : 1.0;
              l1Objects.forEach(obj => renderEditorObj(obj, l1Alpha));

              // Draw Layer 2 (Visual Decor & Lighting) on top of blocks!
              const l2Alpha = sEditLayerMode === 'l1' ? 0.35 : 1.0;
              l2Objects.forEach(obj => renderEditorObj(obj, l2Alpha));
            }
            ctx.restore();

            // PLAYER START LOCATION SPAWN BEACON & MARKER
            const startX = Number(currentLevel.startX ?? currentLevel.playerStart?.x ?? 1);
            const startY = Number(currentLevel.startY ?? currentLevel.playerStart?.y ?? 0);
            const startScreenX = startX * effectiveTile - cameraPixelX;
            const startScreenY = floorY - (startY + 1) * effectiveTile;

            if (startScreenX > -effectiveTile * 2 && startScreenX < width + effectiveTile) {
              ctx.save();
              const pulse = (Math.sin(animTime * 0.005) + 1) * 0.5;

              // Vertical laser alignment line down to the floor
              ctx.strokeStyle = `rgba(16, 185, 129, ${0.4 + pulse * 0.35})`;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(startScreenX + effectiveTile / 2, startScreenY + effectiveTile);
              ctx.lineTo(startScreenX + effectiveTile / 2, floorY);
              ctx.stroke();
              ctx.setLineDash([]);

              // Spawn pad base glow
              ctx.fillStyle = `rgba(16, 185, 129, ${0.25 + pulse * 0.25})`;
              ctx.fillRect(startScreenX + 2, startScreenY + effectiveTile - 6, effectiveTile - 4, 6);
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(startScreenX + 2, startScreenY + effectiveTile - 6, effectiveTile - 4, 6);

              // Spawn Holographic Player Cube Avatar
              const cubePadding = effectiveTile * 0.18;
              const cubeW = effectiveTile - cubePadding * 2;
              const cubeH = cubeW;
              const cubeX = startScreenX + cubePadding;
              const cubeY = startScreenY + effectiveTile - 6 - cubeH - (pulse * 3);

              ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 2;
              ctx.shadowColor = '#10b981';
              ctx.shadowBlur = 10;
              ctx.fillRect(cubeX, cubeY, cubeW, cubeH);
              ctx.strokeRect(cubeX, cubeY, cubeW, cubeH);

              // Inner eye/core
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(cubeX + cubeW * 0.55, cubeY + cubeH * 0.25, cubeW * 0.25, cubeH * 0.3);

              // Spawn Flag / Pin Beacon label
              ctx.fillStyle = '#10b981';
              ctx.font = `bold ${Math.max(9, Math.round(10 * zScale))}px monospace`;
              ctx.shadowColor = '#000000';
              ctx.shadowBlur = 4;
              ctx.fillText(`START (${startX}, ${startY})`, startScreenX - 4, cubeY - 8);
              ctx.restore();
            }

            // Player Pathfinding / Movement Trajectory Trail (from last playtest)
            if (sTrajectory && Array.isArray(pTrajectory) && pTrajectory.length > 1) {
              ctx.save();

              const curReplayIdx = Math.max(0, Math.min(pTrajectory.length - 1, replayIndexRef.current));

              // 1. Trajectory outer glow line
              ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
              ctx.lineWidth = Math.max(3, 5 * zScale);
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.beginPath();
              let started = false;
              for (let i = 0; i < pTrajectory.length; i++) {
                const pt = pTrajectory[i];
                const ptScreenX = pt.gx * effectiveTile - cameraPixelX;
                const ptScreenY = floorY - pt.gy * effectiveTile;
                if (!started) {
                  ctx.moveTo(ptScreenX, ptScreenY);
                  started = true;
                } else {
                  ctx.lineTo(ptScreenX, ptScreenY);
                }
              }
              ctx.stroke();

              // 2. High-contrast core line (completed portion solid cyan, future portion slightly faded)
              ctx.strokeStyle = '#22d3ee';
              ctx.lineWidth = Math.max(1.5, 2 * zScale);
              ctx.stroke();

              // 3. Waypoint dots and crash/finish markers
              for (let i = 0; i < pTrajectory.length; i++) {
                const pt = pTrajectory[i];
                const ptScreenX = pt.gx * effectiveTile - cameraPixelX;
                const ptScreenY = floorY - pt.gy * effectiveTile;

                if (ptScreenX < -50 || ptScreenX > width + 50) continue;

                // Waypoint dots every 10 samples
                if (i % 10 === 0 && !pt.isDead && !pt.isVictory) {
                  ctx.fillStyle = i <= curReplayIdx ? '#a5f3fc' : 'rgba(165, 243, 252, 0.4)';
                  ctx.beginPath();
                  ctx.arc(ptScreenX, ptScreenY, Math.max(1.5, 2.5 * zScale), 0, Math.PI * 2);
                  ctx.fill();
                }

                // Crash / Death marker with bold red X and coordinate label
                if (pt.isDead) {
                  ctx.strokeStyle = '#ef4444';
                  ctx.lineWidth = Math.max(2, 2.5 * zScale);
                  const r = Math.max(5, 7 * zScale);
                  ctx.beginPath();
                  ctx.moveTo(ptScreenX - r, ptScreenY - r);
                  ctx.lineTo(ptScreenX + r, ptScreenY + r);
                  ctx.moveTo(ptScreenX + r, ptScreenY - r);
                  ctx.lineTo(ptScreenX - r, ptScreenY + r);
                  ctx.stroke();

                  ctx.fillStyle = '#ef4444';
                  ctx.font = `bold ${Math.max(9, Math.round(11 * zScale))}px monospace`;
                  ctx.fillText(`CRASH (${pt.gx.toFixed(1)})`, ptScreenX + 8, ptScreenY - 6);
                }

                // Victory finish marker
                if (pt.isVictory) {
                  ctx.fillStyle = '#10b981';
                  ctx.beginPath();
                  ctx.arc(ptScreenX, ptScreenY, Math.max(4, 6 * zScale), 0, Math.PI * 2);
                  ctx.fill();
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 1.5;
                  ctx.stroke();

                  ctx.fillStyle = '#10b981';
                  ctx.font = `bold ${Math.max(9, Math.round(11 * zScale))}px monospace`;
                  ctx.fillText('FINISH!', ptScreenX + 8, ptScreenY - 6);
                }
              }

              // 4. REPLAY GHOST CHARACTER & DYNAMIC LEVEL OBJECT REACTIONS
              const idxFloor = Math.floor(curReplayIdx);
              const curPt = pTrajectory[Math.min(pTrajectory.length - 1, idxFloor)] || pTrajectory[0];
              const nextPt = pTrajectory[Math.min(pTrajectory.length - 1, idxFloor + 1)] || curPt;
              const subAlpha = curReplayIdx - idxFloor;

              const ghostGx = curPt.gx + (nextPt.gx - curPt.gx) * subAlpha;
              const ghostGy = curPt.gy + (nextPt.gy - curPt.gy) * subAlpha;
              const ghostRot = (curPt.rotation || 0) + ((nextPt.rotation || 0) - (curPt.rotation || 0)) * subAlpha;
              const ghostScreenX = ghostGx * effectiveTile - cameraPixelX;
              const ghostScreenY = floorY - ghostGy * effectiveTile;

              // Camera follow during active replay playback
              if (rFollow && replaying) {
                if (ghostScreenX > width * 0.72) {
                  const targetScroll = Math.min(currentLevel.length, Math.floor(ghostGx - (width * 0.4) / effectiveTile));
                  setScrollGridX(targetScroll);
                } else if (ghostScreenX < width * 0.18 && ghostGx > 3) {
                  const targetScroll = Math.max(0, Math.floor(ghostGx - (width * 0.2) / effectiveTile));
                  setScrollGridX(targetScroll);
                }
              }

              // DYNAMIC OBJECT REACTION DETECTION: Check if the ghost intersects any placed object
              let reactionInfo = null;
              if (Array.isArray(currentLevel.objects)) {
                for (let o = 0; o < currentLevel.objects.length; o++) {
                  const obj = currentLevel.objects[o];
                  const dx = Math.abs(obj.x - ghostGx);
                  const dy = Math.abs(obj.y - ghostGy);

                  if (dx < 0.95 && dy < 1.25) {
                    const oType = typeof obj.type === 'string' ? obj.type : '';
                    if (oType.startsWith('pad_')) {
                      reactionInfo = { type: 'pad', obj, padType: oType };
                      break;
                    } else if (oType.startsWith('spike_') || oType === 'saw_blade') {
                      reactionInfo = { type: 'hazard', obj };
                      break;
                    } else if (oType.startsWith('orb_')) {
                      reactionInfo = { type: 'orb', obj };
                      break;
                    } else if (oType.startsWith('portal_')) {
                      reactionInfo = { type: 'portal', obj };
                      break;
                    } else if (oType === 'collectable_coin') {
                      reactionInfo = { type: 'coin', obj };
                      break;
                    }
                  }
                }
              }

              // Render Reaction Visual Effects (Impulse arcs, collision warnings)
              if (reactionInfo) {
                if (reactionInfo.type === 'pad') {
                  // Projected launch pad impulse trajectory arc
                  const padObj = reactionInfo.obj;
                  const padType = reactionInfo.padType;
                  let peakH = 3.5;
                  let arcColor = '#facc15';
                  let padName = 'Yellow Pad';
                  if (padType === 'pad_pink') { peakH = 2.2; arcColor = '#f472b6'; padName = 'Pink Pad'; }
                  else if (padType === 'pad_red') { peakH = 5.2; arcColor = '#ef4444'; padName = 'Super Pad'; }
                  else if (padType === 'pad_blue') { peakH = -3.2; arcColor = '#38bdf8'; padName = 'Gravity Pad'; }

                  ctx.save();
                  ctx.strokeStyle = arcColor;
                  ctx.shadowColor = arcColor;
                  ctx.shadowBlur = 12;
                  ctx.lineWidth = Math.max(2, 2.5 * zScale);
                  ctx.setLineDash([5, 4]);

                  const arcSteps = 16;
                  const arcDistanceX = 4.4;
                  ctx.beginPath();
                  for (let s = 0; s <= arcSteps; s++) {
                    const t = s / arcSteps;
                    const aGx = ghostGx + t * arcDistanceX;
                    const aGy = ghostGy + 4 * peakH * t * (1 - t);
                    const ax = aGx * effectiveTile - cameraPixelX;
                    const ay = floorY - aGy * effectiveTile;
                    if (s === 0) ctx.moveTo(ax, ay);
                    else ctx.lineTo(ax, ay);
                  }
                  ctx.stroke();
                  ctx.setLineDash([]);

                  // Reaction floating badge
                  ctx.fillStyle = arcColor;
                  ctx.shadowBlur = 0;
                  ctx.font = `bold ${Math.max(9, Math.round(11 * zScale))}px monospace`;
                  ctx.fillText(`🚀 ${padName} Impulse (${peakH > 0 ? '+' : ''}${peakH}T)`, ghostScreenX - 40, ghostScreenY - 26);
                  ctx.restore();
                } else if (reactionInfo.type === 'hazard') {
                  // Hazard collision warning
                  ctx.save();
                  ctx.strokeStyle = '#ef4444';
                  ctx.shadowColor = '#ef4444';
                  ctx.shadowBlur = 14;
                  ctx.lineWidth = 2.5;
                  const pulseR = (effectiveTile * 0.5) + Math.sin(timeNow * 0.015) * 4;
                  ctx.beginPath();
                  ctx.arc(ghostScreenX, ghostScreenY, pulseR, 0, Math.PI * 2);
                  ctx.stroke();

                  ctx.fillStyle = '#ef4444';
                  ctx.shadowBlur = 0;
                  ctx.font = `bold ${Math.max(9, Math.round(11 * zScale))}px monospace`;
                  ctx.fillText(`⚠️ HAZARD COLLISION (${reactionInfo.obj.x}, ${reactionInfo.obj.y})`, ghostScreenX - 55, ghostScreenY - 26);
                  ctx.restore();
                } else if (reactionInfo.type === 'orb') {
                  // Jump Orb Interaction window
                  ctx.save();
                  ctx.strokeStyle = '#38bdf8';
                  ctx.shadowColor = '#38bdf8';
                  ctx.shadowBlur = 10;
                  ctx.lineWidth = 2;
                  ctx.setLineDash([3, 3]);
                  ctx.beginPath();
                  ctx.arc(ghostScreenX, ghostScreenY, effectiveTile * 0.6, 0, Math.PI * 2);
                  ctx.stroke();

                  ctx.fillStyle = '#38bdf8';
                  ctx.font = `bold ${Math.max(9, Math.round(10 * zScale))}px monospace`;
                  ctx.fillText('✨ Jump Orb Trigger Window', ghostScreenX - 50, ghostScreenY - 24);
                  ctx.restore();
                } else if (reactionInfo.type === 'coin') {
                  ctx.save();
                  ctx.fillStyle = '#eab308';
                  ctx.font = `bold ${Math.max(9, Math.round(10 * zScale))}px monospace`;
                  ctx.fillText('🪙 Secret Coin Collected', ghostScreenX - 45, ghostScreenY - 24);
                  ctx.restore();
                }
              }

              // Draw Replay Ghost Character (holographic cyan runner cube)
              const ghostSize = Math.max(16, effectiveTile * 0.72);
              ctx.save();
              ctx.translate(ghostScreenX, ghostScreenY);
              ctx.rotate((ghostRot * Math.PI) / 180);

              // Cyber hologram pulse aura
              ctx.shadowColor = '#06b6d4';
              ctx.shadowBlur = 16;
              ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
              ctx.fillRect(-ghostSize / 2, -ghostSize / 2, ghostSize, ghostSize);

              // Holographic grid border
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 2;
              ctx.strokeRect(-ghostSize / 2, -ghostSize / 2, ghostSize, ghostSize);

              // Inner luminous core
              ctx.fillStyle = '#ffffff';
              ctx.shadowBlur = 8;
              ctx.fillRect(-ghostSize * 0.22, -ghostSize * 0.22, ghostSize * 0.44, ghostSize * 0.44);

              // Cyber scanline across avatar
              const scanY = (Math.sin(timeNow * 0.008) * (ghostSize / 2));
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(-ghostSize / 2, scanY);
              ctx.lineTo(ghostSize / 2, scanY);
              ctx.stroke();

              ctx.restore();

              // Drop shadow beam from ghost down to floor
              ctx.save();
              ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
              ctx.setLineDash([2, 4]);
              ctx.beginPath();
              ctx.moveTo(ghostScreenX, ghostScreenY + ghostSize / 2);
              ctx.lineTo(ghostScreenX, floorY);
              ctx.stroke();
              ctx.restore();

              ctx.restore();
            }

            // Placed level objects (Foreground Layer - drawn ON TOP of the player & trajectory)
            ctx.save();
            if (Array.isArray(currentLevel.objects)) {
              const visibleEditorFg = getVisibleObjects(currentLevel.objects, cameraPixelX, width, effectiveTile, 4);
              const fgObjects = visibleEditorFg.filter(obj => obj && (obj.layer === 'foreground' || obj.layer === 'fg' || obj.inFront));
              const l1Fg = fgObjects.filter(obj => obj && !(typeof obj.type === 'string' && obj.type.startsWith('deco_')));
              const l2Fg = fgObjects.filter(obj => obj && typeof obj.type === 'string' && obj.type.startsWith('deco_'));

              const renderFgObj = (obj, layerAlpha) => {
                const objWorldX = obj.x * effectiveTile;
                const screenX = objWorldX - cameraPixelX;

                if (screenX > -effectiveTile * 2 && screenX < width + effectiveTile) {
                  const screenY = floorY - (obj.y + 1) * effectiveTile;
                  const isSpanFull = Boolean(
                    obj.spanFull ||
                    obj.type === 'finish_gate_full' ||
                    (obj.type === 'finish_gate' && currentLevel.finishSpan === 'full')
                  );
                  
                  ctx.save();
                  ctx.globalAlpha = layerAlpha;
                  if (isSpanFull) {
                    drawLevelObject(ctx, { ...obj, spanFull: true }, screenX, screenY, animTime, ceilingY, floorY, effectiveTile);
                  } else if (screenY > -effectiveTile * 3 && screenY < height + effectiveTile * 2) {
                    ctx.translate(screenX, screenY);
                    const scale = effectiveTile / TILE_SIZE;
                    ctx.scale(scale, scale);
                    drawLevelObject(ctx, obj, 0, 0, animTime, null, null, TILE_SIZE, currentLevel.customBlueprints);
                  }

                  // Distinctive subtle Foreground layer badge in Editor
                  ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
                  ctx.fillRect(screenX + effectiveTile - 15, screenY + 2, 13, 8);
                  ctx.fillStyle = '#0f172a';
                  ctx.font = 'bold 7px monospace';
                  ctx.fillText('FG', screenX + effectiveTile - 14, screenY + 8);
                  ctx.restore();
                }
              };

              const l1Alpha = sEditLayerMode === 'l2' ? 0.35 : 1.0;
              l1Fg.forEach(obj => renderFgObj(obj, l1Alpha));

              const l2Alpha = sEditLayerMode === 'l1' ? 0.35 : 1.0;
              l2Fg.forEach(obj => renderFgObj(obj, l2Alpha));
            }
            ctx.restore();

            // Hover Cursor Preview & Bulldozer Highlight (when not using Hand tool)
            if (sTool !== 'pan' && !grabbing && hPos && hPos.visible && !hPos.isBelowFloor) {
              const hScreenX = hPos.gx * effectiveTile - cameraPixelX;
              const hScreenY = floorY - (hPos.gy + 1) * effectiveTile;

              if (hScreenX >= -effectiveTile && hScreenX < width) {
                ctx.save();
                if (sTool === 'start') {
                  // Player Start Position Placement Cursor
                  ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
                  ctx.fillRect(hScreenX, hScreenY, effectiveTile, effectiveTile);
                  ctx.strokeStyle = '#10b981';
                  ctx.lineWidth = 2.5;
                  ctx.strokeRect(hScreenX, hScreenY, effectiveTile, effectiveTile);

                  // Mini preview of spawn cube
                  const previewPad = effectiveTile * 0.2;
                  const previewSize = effectiveTile - previewPad * 2;
                  ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
                  ctx.fillRect(hScreenX + previewPad, hScreenY + previewPad, previewSize, previewSize);

                  ctx.fillStyle = '#10b981';
                  ctx.font = 'bold 10px monospace';
                  ctx.fillText(`START (${hPos.gx}, ${hPos.gy})`, hScreenX - 6, hScreenY - 5);
                } else if (sTool === 'erase') {
                  // Bulldozer / Erase mode cursor: Red hazard square with X
                  ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
                  ctx.fillRect(hScreenX, hScreenY, effectiveTile, effectiveTile);
                  ctx.strokeStyle = '#ef4444';
                  ctx.lineWidth = 2;
                  ctx.strokeRect(hScreenX, hScreenY, effectiveTile, effectiveTile);

                  // Diagonal delete cross
                  ctx.strokeStyle = '#fee2e2';
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(hScreenX + 8, hScreenY + 8);
                  ctx.lineTo(hScreenX + effectiveTile - 8, hScreenY + effectiveTile - 8);
                  ctx.moveTo(hScreenX + effectiveTile - 8, hScreenY + 8);
                  ctx.lineTo(hScreenX + 8, hScreenY + effectiveTile - 8);
                  ctx.stroke();

                  // Mini badge indicating layer target
                  const eraseBadge = sEditLayerMode === 'l2' ? 'DEL DEC' : (sEditLayerMode === 'l1' ? 'DEL BLK' : 'DEL');
                  ctx.fillStyle = '#ef4444';
                  ctx.font = 'bold 9px monospace';
                  ctx.fillText(eraseBadge, hScreenX + 3, hScreenY - 3);
                } else {
                  // Place mode cursor: Cyan square + Ghost of selected sprite
                  const isDecoPlacing = typeof sObjType === 'string' && sObjType.startsWith('deco_');
                  ctx.fillStyle = isDecoPlacing ? 'rgba(245, 158, 11, 0.18)' : 'rgba(6, 182, 212, 0.16)';
                  ctx.fillRect(hScreenX, hScreenY, effectiveTile, effectiveTile);
                  ctx.strokeStyle = isDecoPlacing ? '#f59e0b' : '#06b6d4';
                  ctx.lineWidth = 2;
                  ctx.strokeRect(hScreenX, hScreenY, effectiveTile, effectiveTile);

                  // Draw semi-transparent ghost of the item being placed (with selected rotation)
                  if (sObjType) {
                    ctx.save();
                    ctx.globalAlpha = 0.65;
                    if (sObjType === 'finish_gate_full') {
                      drawLevelObject(ctx, { type: 'finish_gate', spanFull: true }, hScreenX, hScreenY, animTime, ceilingY, floorY, effectiveTile);
                    } else {
                      ctx.translate(hScreenX, hScreenY);
                      const scale = effectiveTile / TILE_SIZE;
                      ctx.scale(scale, scale);
                      drawLevelObject(ctx, { type: sObjType, rotation: sRotation }, 0, 0, animTime, null, null, TILE_SIZE, currentLevel.customBlueprints);
                    }
                    ctx.restore();
                  }

                  // Layer indicator label
                  if (isDecoPlacing) {
                    ctx.fillStyle = '#f59e0b';
                    ctx.font = 'bold 8px monospace';
                    ctx.fillText('L2 DECOR', hScreenX + 2, hScreenY - 3);
                  }
                }
                ctx.restore();
              }
            }

            // Finish boundary line
            const finishWorldX = (currentLevel.length || 100) * effectiveTile;
            const finishScreenX = finishWorldX - cameraPixelX;
            if (finishScreenX > -effectiveTile && finishScreenX < width + effectiveTile) {
              ctx.strokeStyle = '#ef4444';
              ctx.setLineDash([6, 6]);
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(finishScreenX, Math.min(0, floorY - 1000));
              ctx.lineTo(finishScreenX, floorY);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.fillStyle = '#ef4444';
              ctx.font = 'bold 11px monospace';
              ctx.fillText('END OF LEVEL', finishScreenX + 6, Math.max(20, floorY - 260));
            }
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  // Undo action
  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const prevObjs = JSON.parse(history[nextIndex]);
      setHistoryIndex(nextIndex);
      setLevelData(prev => ({ ...prev, objects: prevObjs }));
    }
  };

  // Redo action
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextObjs = JSON.parse(history[nextIndex]);
      setHistoryIndex(nextIndex);
      setLevelData(prev => ({ ...prev, objects: nextObjs }));
    }
  };

  // Align viewport directly to level start origin (0, 0)
  const handleResetViewport = () => {
    setScrollGridX(0);
    setPanOffsetX(0);
    setPanOffsetY(0);
    setZoomScale(1.0);
    showNotification('Viewport aligned to bottom-left start (0, 0)');
  };

  // Keyboard Shortcuts (H for Hand/Pan, Space for Grab, B/X for Bulldozer, P for Place, Z for Undo, Y for Redo, Arrows to Move)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'KeyH') {
        setSelectedTool(t => (t === 'pan' ? 'place' : 'pan'));
      } else if (e.code === 'Space') {
        if (!isSpacePressedRef.current) {
          e.preventDefault();
          isSpacePressedRef.current = true;
          setIsGrabbing(true);
        }
      } else if (e.code === 'KeyB' || e.code === 'KeyX' || e.code === 'KeyE') {
        setSelectedTool(t => (t === 'erase' ? 'place' : 'erase'));
      } else if (e.code === 'KeyP') {
        setSelectedTool('place');
      } else if (e.code === 'KeyS') {
        setSelectedTool(t => (t === 'start' ? 'place' : 'start'));
        soundEngine.playClick();
        setStatusMessage('Player Start Location Mode: Click grid cell to place start spawn');
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        setSelectedRotation(r => {
          const nextR = (r + 90) % 360;
          soundEngine.playClick();
          setStatusMessage(`Rotation: ${nextR}°`);
          return nextR;
        });
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        setShowBeatGuides(g => {
          const nextG = !g;
          soundEngine.playClick();
          setStatusMessage(nextG ? 'Beat Guides: ON' : 'Beat Guides: OFF');
          return nextG;
        });
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        // If hovering over an object on the grid, toggle that object's layer directly
        if (hoverGridPos && hoverGridPos.isValid) {
          setLevelData(prev => {
            const hit = prev.objects.find(o => o.x === hoverGridPos.gx && o.y === hoverGridPos.gy);
            if (hit) {
              const toggledLayer = (hit.layer === 'foreground' || hit.inFront) ? 'background' : 'foreground';
              const updated = prev.objects.map(o =>
                o.x === hoverGridPos.gx && o.y === hoverGridPos.gy ? { ...o, layer: toggledLayer, inFront: toggledLayer === 'foreground' } : o
              );
              pushHistory(prev.objects);
              soundEngine.playClick();
              setStatusMessage(`Switched ${hit.type} layer to ${toggledLayer === 'foreground' ? 'In Front of Player (FG)' : 'Behind Player (BG)'}`);
              return { ...prev, verified: false, objects: updated };
            }
            return prev;
          });
        }
        setActiveLayer(l => {
          const next = l === 'background' ? 'foreground' : 'background';
          soundEngine.playClick();
          setStatusMessage(`Placement Layer: ${next === 'foreground' ? 'In Front of Player (FG)' : 'Behind Player (BG)'}`);
          return next;
        });
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        setShowTrajectory(t => {
          const next = !t;
          if (next) setShowReplayDock(true);
          soundEngine.playClick();
          setStatusMessage(next ? 'Player Trail: Visible' : 'Player Trail: Hidden');
          return next;
        });
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        handleRedo();
      } else if (e.code === 'ArrowLeft') {
        setScrollGridX(x => Math.max(0, x - (e.shiftKey ? 10 : 3)));
        setPanOffsetX(0);
      } else if (e.code === 'ArrowRight') {
        setScrollGridX(x => Math.min(levelData.length, x + (e.shiftKey ? 10 : 3)));
        setPanOffsetX(0);
      } else if (e.code === 'ArrowUp') {
        setPanOffsetY(py => Math.min(800, py + 30));
      } else if (e.code === 'ArrowDown') {
        setPanOffsetY(py => Math.max(-1200, py - 30));
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        if (!isPanningRef.current) {
          setIsGrabbing(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [levelData.length, historyIndex, history]);

  // Clear level
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all objects in this level?')) {
      pushHistory(levelData.objects);
      setLevelData(prev => ({
        ...prev,
        objects: [{ type: 'finish_gate', x: prev.length - 5, y: 1 }]
      }));
      showNotification('Level cleared');
    }
  };

  // Save level
  const handleSave = () => {
    try {
      const validation = validateLevelData(levelData);
      if (!validation.valid) {
        showNotification(validation.error || 'Level data failed validation.', true);
        return;
      }
      if (typeof onSaveLevel === 'function') {
        onSaveLevel({
          ...validation.level,
          gameStyle: levelData.gameStyle || 'runner',
          chaseHazard: levelData.chaseHazard || { type: 'none' }
        });
      }
      showNotification('Level saved to "My Levels"!');
    } catch (err) {
      showNotification(`Save failed: ${err.message}`, true);
    }
  };

  // Export JSON
  const handleCopyJson = () => {
    try {
      const jsonStr = JSON.stringify(levelData, null, 2);
      navigator.clipboard.writeText(jsonStr).then(() => {
        showNotification('Level JSON copied to clipboard!');
      }).catch(() => {
        // Fallback for clipboard
        showNotification('Copied (selection ready)');
      });
    } catch (err) {
      showNotification('Failed to copy JSON: ' + err.message, true);
    }
  };

  // Download .zip level package (bundles level, blueprints, spritesheets)
  const handleDownloadFile = async () => {
    try {
      showNotification('Bundling level, blueprints & spritesheets into ZIP...');
      const success = await exportLevelPackageZip(levelData, customBlueprints);
      if (success) {
        showNotification('Level ZIP package exported successfully!');
      } else {
        // Fallback for legacy JSON
        handleDownloadJsonOnly();
      }
    } catch (err) {
      showNotification('Download failed: ' + err.message, true);
    }
  };

  // Download legacy .json file
  const handleDownloadJsonOnly = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(levelData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${levelData.name.toLowerCase().replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showNotification('Downloaded level JSON file!');
    } catch (err) {
      showNotification('Download failed: ' + err.message, true);
    }
  };

  // Import JSON string
  const handleApplyImport = () => {
    const res = parseAndValidateLevelString(importText);
    if (!res.valid) {
      showNotification(`Import error: ${res.error}`, true);
      return;
    }
    pushHistory(levelData.objects);
    setLevelData(res.level);
    setShowImportModal(false);
    setImportText('');
    showNotification(`Imported "${res.level.name}" successfully!`);
  };

  // Import file upload (handles both modern .zip packages and legacy .json files)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showNotification(`Reading ${file.name}...`);
      const res = await importLevelPackage(file);
      if (!res || !res.valid) {
        showNotification(`Import error: ${res?.error || 'Invalid file format'}`, true);
        return;
      }

      pushHistory(levelData.objects);
      setLevelData(res.level);

      // Restore custom blueprints if bundled in package
      if (Array.isArray(res.blueprints) && res.blueprints.length > 0) {
        setCustomBlueprints(res.blueprints);
      }

      setShowImportModal(false);
      const isZip = file.name.endsWith('.zip');
      showNotification(`Loaded "${res.level.name}" (${isZip ? 'ZIP Package with Assets' : 'JSON'}) successfully!`);
    } catch (err) {
      showNotification(`File read error: ${err.message}`, true);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div id="level-editor-container" className="fixed inset-0 z-40 bg-neutral-950 flex flex-col select-none text-neutral-100">
      
      {/* Top Action & Navigation Bar */}
      <div className="h-14 bg-neutral-900 border-b border-neutral-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            id="editor-exit-btn"
            onClick={onExit}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition flex items-center gap-1.5"
          >
            ← Exit Editor
          </button>
          <div className="h-5 w-[1px] bg-neutral-700" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-display text-white tracking-wide">{levelData.name}</span>
              {levelData.verified ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40" title="Level has been verified (completed 0% to 100% in playtest)">
                  <ShieldCheck className="w-3 h-3" /> VERIFIED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/40" title="Unverified: Must playtest and complete 0% to 100% to publish">
                  <ShieldAlert className="w-3 h-3" /> UNVERIFIED
                </span>
              )}
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              BPM: {levelData.bpm} | {levelData.objects.length} Objects | Difficulty: {levelData.difficulty}
            </span>
          </div>
        </div>

        {/* Center Control Tools: Mode Switcher, Undo, Redo, Zoom & Hand Pan */}
        <div className="flex items-center gap-2">
          {/* Tool Switcher: Place vs Bulldozer vs Hand */}
          <div className="flex items-center bg-neutral-800/90 rounded-lg p-0.5 border border-neutral-700">
            <button
              id="top-tool-place-btn"
              onClick={() => setSelectedTool('place')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedTool === 'place'
                  ? 'bg-cyan-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-300 hover:text-white'
              }`}
              title="Place Block / Object [P]"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Place</span>
            </button>
            <button
              id="top-tool-erase-btn"
              onClick={() => setSelectedTool(t => (t === 'erase' ? 'place' : 'erase'))}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedTool === 'erase'
                  ? 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-400'
                  : 'text-neutral-300 hover:text-white'
              }`}
              title="Bulldozer / Eraser Mode [B or X]"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Bulldozer</span>
            </button>
            <button
              id="top-tool-pan-btn"
              onClick={() => setSelectedTool(t => (t === 'pan' ? 'place' : 'pan'))}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedTool === 'pan'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm ring-1 ring-amber-400'
                  : 'text-neutral-300 hover:text-white'
              }`}
              title="Hand Tool [H or Space] - Grab & Move Level in Any Direction"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Hand</span>
            </button>
          </div>

          <div className="flex items-center bg-neutral-800/80 rounded-lg p-1 border border-neutral-700">
            <button
              id="undo-btn"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent text-neutral-300 cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              id="redo-btn"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent text-neutral-300 cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom In/Out & Hand Grab Symbol */}
          <div className="flex items-center bg-neutral-800/80 rounded-lg p-1 border border-neutral-700">
            <button
              id="zoom-out-btn"
              onClick={() => setZoomScale(s => Math.max(0.7, s - 0.1))}
              className="p-1.5 rounded hover:bg-neutral-700 text-neutral-300 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono px-2 text-neutral-300">{Math.round(zoomScale * 100)}%</span>
            <button
              id="zoom-in-btn"
              onClick={() => setZoomScale(s => Math.min(1.4, s + 0.1))}
              className="p-1.5 rounded hover:bg-neutral-700 text-neutral-300 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            
            {/* Hand symbol directly next to zoom buttons */}
            <div className="w-[1px] h-4 bg-neutral-700 mx-1" />
            <button
              id="zoom-hand-pan-btn"
              onClick={() => setSelectedTool(t => (t === 'pan' ? 'place' : 'pan'))}
              className={`p-1.5 rounded transition cursor-pointer flex items-center gap-1 ${
                selectedTool === 'pan'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm ring-1 ring-amber-400'
                  : 'hover:bg-neutral-700 text-neutral-300'
              }`}
              title="Hand Tool [H or Space] - Grab and move the level around to see top & bottom"
            >
              <Hand className="w-4 h-4" />
            </button>
          </div>

          {/* Reset Viewport to Level Start Origin (0,0) */}
          <button
            id="reset-viewport-btn"
            onClick={handleResetViewport}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 hover:border-cyan-400 text-neutral-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
            title="Snap Viewport to Level Start (0, 0)"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Start (0,0)</span>
          </button>

          {/* Object Rotation Quick Toggle */}
          <button
            id="rotate-tool-btn"
            onClick={() => {
              setSelectedRotation(r => {
                const nextR = (r + 90) % 360;
                soundEngine.playClick();
                setStatusMessage(`Rotation: ${nextR}°`);
                return nextR;
              });
            }}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 transition flex items-center gap-1.5 cursor-pointer"
            title="Rotate Object [R] (0°, 90°, 180°, 270°)"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white">{selectedRotation}°</span>
          </button>

          {/* BPM Beat Guides Toggle */}
          <button
            id="toggle-beat-guides-btn"
            onClick={() => {
              setShowBeatGuides(g => {
                const nextG = !g;
                soundEngine.playClick();
                setStatusMessage(nextG ? 'Beat Guides: ON' : 'Beat Guides: OFF');
                return nextG;
              });
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              showBeatGuides
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-white'
            }`}
            title="Toggle BPM 4/4 Beat Guides [G]"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Beat Guides</span>
          </button>

          <button
            id="open-parallax-studio-btn"
            onClick={() => {
              setShowParallaxModal(true);
              soundEngine.playClick();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 transition flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
            title="Open Parallax Studio (Multi-layer background composition)"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Parallax Studio</span>
            {levelData.parallaxLayers?.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-mono">
                {levelData.parallaxLayers.length}
              </span>
            )}
          </button>

          <button
            id="open-spritesheet-studio-btn"
            onClick={() => {
              setShowSpriteStudioModal(true);
              soundEngine.playClick();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700 hover:border-amber-400 text-amber-300 hover:text-amber-200 transition flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
            title="Open 2D Spritesheet Studio (Pack Sprites, Multi-Block Slicer, Export Coordinates)"
          >
            <Grid className="w-3.5 h-3.5 text-amber-400" />
            <span>Sprite Studio</span>
          </button>

          <button
            id="open-level-settings-btn"
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 transition cursor-pointer"
            title="Level Metadata & BPM Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Quick Game Style Selector */}
          <div className="flex items-center gap-1.5 bg-neutral-800/90 border border-neutral-700/80 rounded-lg px-2.5 py-1 text-xs">
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] text-neutral-400 font-medium">Style:</span>
            <select
              id="editor-game-style-quick-select"
              value={levelData.gameStyle || 'runner'}
              onChange={(e) => {
                const newStyle = e.target.value;
                setLevelData(prev => ({ ...prev, gameStyle: newStyle }));
                showNotification(`Game Style: ${GAME_STYLES[newStyle]?.name || newStyle}`);
              }}
              className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer"
            >
              {Object.values(GAME_STYLES).map(style => (
                <option key={style.id} value={style.id} className="bg-neutral-900 text-white">
                  {style.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Player Playtest Trajectory Trail Toggle */}
          {playerTrajectory && playerTrajectory.length > 0 && (
            <div className="flex items-center bg-neutral-800/90 rounded-lg p-0.5 border border-cyan-500/40 shadow-sm">
              <button
                id="toggle-trajectory-btn"
                onClick={() => {
                  setShowTrajectory(prev => {
                    const next = !prev;
                    if (next) setShowReplayDock(true);
                    return next;
                  });
                  soundEngine.playClick();
                  setStatusMessage(showTrajectory ? 'Player Trail: Hidden' : 'Player Trail: Visible');
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  showTrajectory
                    ? 'bg-cyan-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Toggle visual trail of player movements from last playtest"
              >
                <Route className="w-3.5 h-3.5" />
                <span>Trail {showTrajectory ? 'ON' : 'OFF'}</span>
              </button>
              <button
                id="open-replay-dock-btn"
                onClick={() => {
                  setShowTrajectory(true);
                  setShowReplayDock(prev => !prev);
                  soundEngine.playClick();
                }}
                className={`px-2 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  showReplayDock && showTrajectory
                    ? 'bg-amber-400 text-neutral-950 shadow-sm'
                    : 'text-neutral-300 hover:text-white'
                }`}
                title="Toggle Replay & Reaction Simulation Dock"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Replay</span>
              </button>
              <button
                id="clear-trajectory-btn"
                onClick={() => {
                  setPlayerTrajectory(null);
                  if (typeof onClearTrajectory === 'function') onClearTrajectory();
                  setStatusMessage('Player trail cleared');
                }}
                className="px-1.5 py-1 text-neutral-400 hover:text-rose-400 transition cursor-pointer text-xs"
                title="Clear playtest movement trail"
              >
                ✕
              </button>
            </div>
          )}

          <button
            id="export-level-modal-btn"
            onClick={() => setShowExportModal(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              levelData.verified
                ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/50 text-emerald-300'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
            }`}
            title={levelData.verified ? 'Level Verified & Ready to Publish' : 'Validation Required to Publish'}
          >
            {levelData.verified ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Share / Publish</span>
          </button>

          <button
            id="import-level-modal-btn"
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 border border-neutral-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>

          <button
            id="save-level-btn"
            onClick={handleSave}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>

          <button
            id="test-play-level-btn"
            onClick={() => {
              const val = validateLevelData(levelData);
              if (val.valid && typeof onPlaytest === 'function') {
                onPlaytest({
                  ...val.level,
                  gameStyle: levelData.gameStyle || 'runner',
                  chaseHazard: levelData.chaseHazard || { type: 'none' }
                });
              }
            }}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Playtest
          </button>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div ref={canvasContainerRef} className="flex-1 relative overflow-hidden bg-neutral-950 flex flex-col">
        
        {/* Notification Toast */}
        {statusMessage && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 ${
            statusMessage.isError ? 'bg-red-500 text-white' : 'bg-emerald-500 text-neutral-950'
          }`}>
            {statusMessage.isError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {statusMessage.text}
          </div>
        )}

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onWheel={handleWheel}
          onContextMenu={(e) => {
            e.preventDefault();
            const pos = getGridPosFromMouse(e);
            if (pos.isValid && !pos.isBelowFloor) {
              executeActionAt(pos.gx, pos.gy, 'erase');
            }
          }}
          className={`w-full flex-1 block touch-none select-none ${
            selectedTool === 'pan' || isGrabbing
              ? isGrabbing
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : selectedTool === 'erase'
              ? 'cursor-crosshair'
              : 'cursor-crosshair'
          }`}
        />

        {/* Playtest Replay Floating Draggable Window (Active when NOT docked) */}
        {!isReplayDocked && playerTrajectory && playerTrajectory.length > 0 && showTrajectory && showReplayDock && (
          isReplayMinimized ? (
            /* Minimized compact draggable pill */
            <div
              id="floating-replay-dock-min"
              style={{ left: `${replayFloatPos.x}px`, top: `${replayFloatPos.y}px` }}
              onMouseDown={handleReplayDragStart}
              className="absolute z-40 bg-neutral-900/95 border border-cyan-500/60 rounded-xl shadow-2xl p-1.5 flex items-center gap-2 cursor-grab active:cursor-grabbing backdrop-blur-md select-none"
              title="Drag to move replay bar anywhere"
            >
              <GripHorizontal className="w-4 h-4 text-cyan-400 shrink-0" />
              <button
                id="float-min-play-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsReplaying(p => !p);
                }}
                className="p-1 rounded bg-cyan-400 text-neutral-950 cursor-pointer"
                title={isReplaying ? 'Pause' : 'Play'}
              >
                {isReplaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <span className="text-[11px] font-mono font-bold text-white">
                {((playerTrajectory[Math.min(playerTrajectory.length - 1, Math.floor(replayIndex))]?.time ?? 0)).toFixed(2)}s
              </span>
              <button
                id="float-min-expand-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsReplayMinimized(false);
                }}
                className="p-1 hover:text-cyan-300 text-neutral-400 cursor-pointer"
                title="Expand Controls"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                id="float-min-dock-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsReplayDocked(true);
                  soundEngine.playClick();
                  setStatusMessage('Replay Bar docked to bottom above items!');
                }}
                className="p-1 hover:text-cyan-300 text-neutral-400 cursor-pointer"
                title="Dock to bottom above items"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
              </button>
              <button
                id="float-min-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReplayDock(false);
                }}
                className="p-1 hover:text-white text-neutral-400 text-xs cursor-pointer"
                title="Hide Replay"
              >
                ✕
              </button>
            </div>
          ) : (
            /* Full Floating Draggable Replay Window */
            <div
              id="floating-replay-dock-full"
              style={{ left: `${replayFloatPos.x}px`, top: `${replayFloatPos.y}px` }}
              className="absolute z-40 bg-neutral-900/95 border border-cyan-500/50 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 min-w-[340px] sm:min-w-[560px] max-w-2xl backdrop-blur-md select-none"
            >
              {/* Drag Header */}
              <div
                onMouseDown={handleReplayDragStart}
                className="flex items-center justify-between text-xs pb-1.5 border-b border-neutral-800 cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-2">
                  <GripHorizontal className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white tracking-wide flex items-center gap-1">
                    <Route className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Trajectory Replay</span>
                  </span>
                  <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/40 font-mono">
                    Drag to move
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                  <span>Time: <strong className="text-cyan-300">{((playerTrajectory[Math.min(playerTrajectory.length - 1, Math.floor(replayIndex))]?.time ?? (replayIndex * 0.022))).toFixed(2)}s</strong></span>
                  <span>Block: <strong className="text-cyan-300">{(playerTrajectory[Math.min(playerTrajectory.length - 1, Math.floor(replayIndex))]?.gx ?? 0).toFixed(1)}</strong></span>
                  
                  {/* Minimize */}
                  <button
                    id="floating-minimize-btn"
                    onClick={() => setIsReplayMinimized(true)}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                    title="Minimize to Compact Floating Pill"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Dock to Bottom */}
                  <button
                    id="floating-dock-bottom-btn"
                    onClick={() => {
                      setIsReplayDocked(true);
                      soundEngine.playClick();
                      setStatusMessage('Replay Bar docked to bottom above items!');
                    }}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-cyan-300 hover:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Dock to bottom above items"
                  >
                    <ArrowDownToLine className="w-3 h-3" />
                    <span>Dock</span>
                  </button>

                  {/* Close */}
                  <button
                    id="floating-close-btn"
                    onClick={() => setShowReplayDock(false)}
                    className="p-1 text-neutral-400 hover:text-white text-xs cursor-pointer"
                    title="Hide Replay Dock"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Dynamic reaction notification */}
              <div className="px-2.5 py-1 rounded-lg bg-neutral-800/80 border border-neutral-700/80 flex items-center justify-between text-xs min-h-[28px]">
                <span className="text-[11px] text-neutral-300 flex items-center gap-1.5 truncate">
                  {(() => {
                    const info = getReactionBannerInfo();
                    return <span className={info.colorClass}>{info.text}</span>;
                  })()}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono shrink-0 ml-2">
                  {Math.round((replayIndex / Math.max(1, playerTrajectory.length - 1)) * 100)}%
                </span>
              </div>

              {/* Scrubber slider & Playback Controls */}
              <div className="flex items-center gap-2.5">
                <button
                  id="floating-replay-play-btn"
                  onClick={() => {
                    setIsReplaying(p => {
                      const next = !p;
                      if (next && replayIndex >= playerTrajectory.length - 1) {
                        setReplayIndex(0);
                        replayIndexRef.current = 0;
                      }
                      soundEngine.playClick();
                      return next;
                    });
                  }}
                  className={`p-2 rounded-xl text-neutral-950 font-bold transition flex items-center justify-center shadow cursor-pointer ${
                    isReplaying ? 'bg-amber-400 hover:bg-amber-300' : 'bg-cyan-400 hover:bg-cyan-300'
                  }`}
                  title={isReplaying ? 'Pause Replay' : 'Play Trajectory Replay'}
                >
                  {isReplaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <button
                  id="floating-replay-step-back-btn"
                  onClick={() => {
                    setIsReplaying(false);
                    setReplayIndex(i => {
                      const next = Math.max(0, i - 12);
                      replayIndexRef.current = next;
                      return next;
                    });
                  }}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                  title="Step Backward"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <input
                  type="range"
                  id="floating-replay-time-slider"
                  min="0"
                  max={Math.max(1, playerTrajectory.length - 1)}
                  step="0.5"
                  value={replayIndex}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setReplayIndex(val);
                    replayIndexRef.current = val;
                    if (replayFollowCamera) {
                      const pt = playerTrajectory[Math.min(playerTrajectory.length - 1, Math.floor(val))];
                      if (pt) {
                        setScrollGridX(Math.max(0, Math.floor(pt.gx - 6)));
                      }
                    }
                  }}
                  className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />

                <button
                  id="floating-replay-step-fwd-btn"
                  onClick={() => {
                    setIsReplaying(false);
                    setReplayIndex(i => {
                      const next = Math.min(playerTrajectory.length - 1, i + 12);
                      replayIndexRef.current = next;
                      return next;
                    });
                  }}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                  title="Step Forward"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="flex items-center bg-neutral-800 rounded-lg p-0.5 border border-neutral-700 shrink-0">
                  {[0.5, 1.0, 2.0].map(spd => (
                    <button
                      key={spd}
                      id={`floating-replay-speed-${spd}x`}
                      onClick={() => {
                        setReplaySpeed(spd);
                        replaySpeedRef.current = spd;
                      }}
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer ${
                        replaySpeed === spd
                          ? 'bg-cyan-500 text-neutral-950 shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <button
                  id="floating-replay-loop-btn"
                  onClick={() => setReplayLoop(l => !l)}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer shrink-0 ${
                    replayLoop
                      ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                  title="Loop Replay Playback"
                >
                  Loop
                </button>

                <button
                  id="floating-replay-cam-btn"
                  onClick={() => setReplayFollowCamera(c => !c)}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer shrink-0 ${
                    replayFollowCamera
                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                  title="Follow Character with Camera"
                >
                  Cam
                </button>
              </div>
            </div>
          )
        )}

        {/* Scrub / Horizontal Navigation Bar */}
        <div className="h-10 bg-neutral-900/90 border-t border-neutral-800 px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <button
              id="scroll-left-btn"
              onClick={() => {
                setScrollGridX(x => Math.max(0, x - 5));
                setPanOffsetX(0);
              }}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-300 cursor-pointer"
              title="Scroll Left (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="scroll-right-btn"
              onClick={() => {
                setScrollGridX(x => Math.min(levelData.length, x + 5));
                setPanOffsetX(0);
              }}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-300 cursor-pointer"
              title="Scroll Right (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-neutral-400 ml-2">
              Block: <span className="text-cyan-400 font-bold">{scrollGridX}</span> / {levelData.length}
            </span>
          </div>

          {/* Range Scrubber */}
          <input
            type="range"
            id="editor-scrubber-slider"
            min="0"
            max={Math.max(20, levelData.length - 20)}
            value={scrollGridX}
            onChange={(e) => {
              setScrollGridX(Number(e.target.value));
              setPanOffsetX(0);
            }}
            className="flex-1 max-w-xl h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />

          <div className="flex items-center gap-2">
            <button
              id="reset-view-btn"
              onClick={() => {
                setScrollGridX(0);
                setPanOffsetX(0);
                setPanOffsetY(0);
                setZoomScale(1.0);
              }}
              className="px-2.5 py-1 rounded text-[11px] font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition flex items-center gap-1 cursor-pointer"
              title="Reset Zoom, Pan & Scroll to start"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset View
            </button>
            <button
              id="clear-all-objects-btn"
              onClick={handleClear}
              className="px-2.5 py-1 rounded text-[11px] font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* Docked Replay Bar: Sits right above the bottom items palette */}
      {isReplayDocked && playerTrajectory && playerTrajectory.length > 0 && showTrajectory && showReplayDock && (
        <div
          id="docked-replay-bar"
          className="bg-neutral-900 border-t border-cyan-500/40 px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-2.5 shrink-0 z-20 shadow-md"
        >
          {/* Status & Reaction */}
          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isReplaying ? 'bg-cyan-400' : 'bg-neutral-500'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isReplaying ? 'bg-cyan-500' : 'bg-neutral-400'}`}></span>
              </span>
              <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1">
                <Route className="w-3.5 h-3.5 text-cyan-400" />
                <span>Replay</span>
              </span>
            </div>

            <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-2">
              <span>Time: <strong className="text-cyan-300">{((playerTrajectory[Math.min(playerTrajectory.length - 1, Math.floor(replayIndex))]?.time ?? (replayIndex * 0.022))).toFixed(2)}s</strong></span>
              <span>Block: <strong className="text-cyan-300">{(playerTrajectory[Math.min(playerTrajectory.length - 1, Math.floor(replayIndex))]?.gx ?? 0).toFixed(1)}</strong></span>
            </div>

            <div className="hidden lg:flex px-2 py-0.5 rounded bg-neutral-800/90 border border-neutral-700/60 text-[11px] max-w-xs truncate">
              {(() => {
                const info = getReactionBannerInfo();
                return <span className={info.colorClass}>{info.text}</span>;
              })()}
            </div>
          </div>

          {/* Controls: Play, Step, Scrubber */}
          <div className="flex items-center gap-2 w-full md:flex-1 max-w-xl">
            <button
              id="docked-replay-play-btn"
              onClick={() => {
                setIsReplaying(p => {
                  const next = !p;
                  if (next && replayIndex >= playerTrajectory.length - 1) {
                    setReplayIndex(0);
                    replayIndexRef.current = 0;
                  }
                  soundEngine.playClick();
                  return next;
                });
              }}
              className={`p-1.5 rounded-lg text-neutral-950 font-bold transition flex items-center justify-center shadow cursor-pointer shrink-0 ${
                isReplaying ? 'bg-amber-400 hover:bg-amber-300' : 'bg-cyan-400 hover:bg-cyan-300'
              }`}
              title={isReplaying ? 'Pause Replay' : 'Play Trajectory Replay'}
            >
              {isReplaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            <button
              id="docked-replay-step-back-btn"
              onClick={() => {
                setIsReplaying(false);
                setReplayIndex(i => {
                  const next = Math.max(0, i - 12);
                  replayIndexRef.current = next;
                  return next;
                });
              }}
              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer shrink-0"
              title="Step Backward"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <input
              type="range"
              id="docked-replay-time-slider"
              min="0"
              max={Math.max(1, playerTrajectory.length - 1)}
              step="0.5"
              value={replayIndex}
              onChange={(e) => {
                const val = Number(e.target.value);
                setReplayIndex(val);
                replayIndexRef.current = val;
                if (replayFollowCamera) {
                  const pt = playerTrajectory[Math.min(playerTrajectory.length - 1, Math.floor(val))];
                  if (pt) {
                    setScrollGridX(Math.max(0, Math.floor(pt.gx - 6)));
                  }
                }
              }}
              className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            <button
              id="docked-replay-step-fwd-btn"
              onClick={() => {
                setIsReplaying(false);
                setReplayIndex(i => {
                  const next = Math.min(playerTrajectory.length - 1, i + 12);
                  replayIndexRef.current = next;
                  return next;
                });
              }}
              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer shrink-0"
              title="Step Forward"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Actions: Speed, Loop, Cam, Pop Out / Float, Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-neutral-800 rounded p-0.5 border border-neutral-700">
              {[0.5, 1.0, 2.0].map(spd => (
                <button
                  key={spd}
                  onClick={() => {
                    setReplaySpeed(spd);
                    replaySpeedRef.current = spd;
                  }}
                  className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer ${
                    replaySpeed === spd
                      ? 'bg-cyan-500 text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              id="docked-replay-loop-btn"
              onClick={() => setReplayLoop(l => !l)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                replayLoop
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
              title="Loop Replay Playback"
            >
              Loop
            </button>

            <button
              id="docked-replay-cam-btn"
              onClick={() => setReplayFollowCamera(c => !c)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                replayFollowCamera
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
              title="Follow Character with Camera"
            >
              Cam
            </button>

            {/* Pop out to float / move anywhere */}
            <button
              id="docked-replay-float-btn"
              onClick={() => {
                setIsReplayDocked(false);
                soundEngine.playClick();
                setStatusMessage('Replay Bar popped out! Grab the header to drag it anywhere.');
              }}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-cyan-300 hover:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              title="Pop out to floating window that can be moved anywhere"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Float</span>
            </button>

            <button
              id="docked-replay-close-btn"
              onClick={() => setShowReplayDock(false)}
              className="p-1 text-neutral-400 hover:text-white text-xs cursor-pointer"
              title="Hide Replay Bar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Sleek Tool & Multi-Layer Ribbon */}
      <div className="bg-neutral-900 border-t border-neutral-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 select-none">
        {/* Left: Tools (Place, Erase, Start, Pan) & Rotation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-950/70 rounded-lg p-0.5 border border-neutral-800">
            <button
              id="tool-place-btn"
              onClick={() => setSelectedTool('place')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                selectedTool === 'place'
                  ? 'bg-cyan-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Switch to Place Mode (Shortcut: P)"
            >
              <PenTool className="w-3.5 h-3.5" /> Place [P]
            </button>
            <button
              id="tool-erase-btn"
              onClick={() => setSelectedTool(t => (t === 'erase' ? 'place' : 'erase'))}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                selectedTool === 'erase'
                  ? 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-400'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Toggle Bulldozer / Erase Mode (Shortcut: B or X)"
            >
              <Eraser className="w-3.5 h-3.5" /> Bulldozer [B]
            </button>
            <button
              id="tool-start-btn"
              onClick={() => setSelectedTool(t => (t === 'start' ? 'place' : 'start'))}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                selectedTool === 'start'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm ring-1 ring-emerald-400'
                  : 'text-emerald-400 hover:text-white'
              }`}
              title="Set Player Start Location [S] - Click any grid cell to place spawn beacon"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Start [S]</span>
              <span className="font-mono text-[10px] bg-neutral-900/80 px-1 py-0.5 rounded text-emerald-300">
                {levelData.startX ?? 1},{levelData.startY ?? 0}
              </span>
            </button>
            <button
              id="tool-pan-btn"
              onClick={() => setSelectedTool(t => (t === 'pan' ? 'place' : 'pan'))}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                selectedTool === 'pan'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm ring-1 ring-amber-400'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Hand Tool (Shortcut: H or Space) - Grab & Move"
            >
              <Hand className="w-3.5 h-3.5" /> Hand [H]
            </button>
          </div>

          {/* Quick Rotation */}
          <button
            id="palette-rotate-btn"
            onClick={() => {
              setSelectedRotation(r => {
                const nextR = (r + 90) % 360;
                soundEngine.playClick();
                setStatusMessage(`Rotation: ${nextR}°`);
                return nextR;
              });
            }}
            className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 transition flex items-center gap-1.5 cursor-pointer"
            title="Rotate Selected Item [R] (0°, 90°, 180°, 270°)"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>{selectedRotation}°</span>
          </button>
        </div>

        {/* Right: Multi-Layer Selector & Depth Toggle */}
        <div className="flex items-center gap-2">
          {/* Visual Layer Selector: All (Dual-Layer) vs L1 (Blocks) vs L2 (Visuals/Decor) */}
          <div className="flex items-center bg-neutral-950/70 rounded-lg p-0.5 border border-neutral-800" title="Multi-Layer Mode: Place lamps, torches & detail directly on blocks">
            <button
              id="layer-mode-all-btn"
              onClick={() => {
                setEditLayerMode('all');
                soundEngine.playClick();
                setStatusMessage('Dual-Layer: Both Blocks & Visuals share tiles (lamps place on blocks)');
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition cursor-pointer ${
                editLayerMode === 'all'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Dual-Layer: Lamps & decorations sit on blocks without replacing them"
            >
              All Layers
            </button>
            <button
              id="layer-mode-l1-btn"
              onClick={() => {
                setEditLayerMode('l1');
                soundEngine.playClick();
                setStatusMessage('Layer 1: Blocks & Hazards only (Visuals dimmed)');
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition cursor-pointer ${
                editLayerMode === 'l1'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Layer 1: Edit solid blocks & hazards only"
            >
              L1: Blocks
            </button>
            <button
              id="layer-mode-l2-btn"
              onClick={() => {
                setEditLayerMode('l2');
                soundEngine.playClick();
                setStatusMessage('Layer 2: Visual Decor & Lamps (Place lamps, torches & detail onto blocks)');
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition cursor-pointer ${
                editLayerMode === 'l2'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm ring-1 ring-amber-400'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
              title="Layer 2: Visual Decor (Place torches, lamps, vines & wall relief onto blocks)"
            >
              L2: Visuals
            </button>
          </div>

          {/* Depth Layer Toggle: Behind Player vs In Front of Player */}
          <div className="flex items-center bg-neutral-950/70 rounded-lg p-0.5 border border-neutral-800">
            <button
              id="layer-toggle-bg-btn"
              onClick={() => {
                setActiveLayer('background');
                soundEngine.playClick();
                setStatusMessage('Layer: Behind Player (Standard / Background)');
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition flex items-center gap-1 cursor-pointer ${
                activeLayer === 'background'
                  ? 'bg-neutral-800 text-cyan-300 shadow-sm font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Place items BEHIND the player"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Behind</span>
            </button>
            <button
              id="layer-toggle-fg-btn"
              onClick={() => {
                setActiveLayer('foreground');
                soundEngine.playClick();
                setStatusMessage('Layer: In Front of Player (Foreground Overlay)');
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition flex items-center gap-1 cursor-pointer ${
                activeLayer === 'foreground'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm ring-1 ring-amber-400'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Place items IN FRONT of the player (Visual foreground overlay)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>In Front (FG)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unreal / Unity Style Collapsible Asset Browser */}
      <AssetBrowser
        categories={PALETTE_CATEGORIES}
        activeCategory={activeCategory}
        onSelectCategory={(catId) => {
          setActiveCategory(catId);
          if (categoryStateRef.current[catId]?.env !== undefined) {
            setActiveEnvironment(categoryStateRef.current[catId].env);
          }
        }}
        activeEnvironment={activeEnvironment}
        onSelectEnvironment={(envId) => {
          setActiveEnvironment(envId);
          if (categoryStateRef.current[activeCategory]) {
            categoryStateRef.current[activeCategory].env = envId;
          }
          setLevelData(prev => ({ ...prev, environment: envId }));
        }}
        selectedObjectType={selectedObjectType}
        onSelectObjectType={(type) => {
          setSelectedObjectType(type);
          setSelectedTool('place');
          if (categoryStateRef.current[activeCategory]) {
            categoryStateRef.current[activeCategory].item = type;
          }
        }}
        customBlueprints={levelData.customBlueprints || []}
        onUpdateCustomBlueprints={(updatedList) => {
          setLevelData(prev => ({ ...prev, customBlueprints: updatedList, verified: false }));
        }}
        activeTab={assetBrowserTab}
        onChangeTab={setAssetBrowserTab}
        isCollapsed={isAssetBrowserCollapsed}
        onToggleCollapse={() => setIsAssetBrowserCollapsed(c => !c)}
      />

      {/* MODAL: LEVEL SETTINGS */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-lg font-bold font-display text-white">Level Configuration</h3>
                <p className="text-xs text-neutral-400">Choose game style, mechanics, hazards, and parameters.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Game Engine Style Selector */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 mb-2">
                  <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                  Game Engine Style & Mechanics
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.values(GAME_STYLES).map(style => {
                    const isSelected = (levelData.gameStyle || 'runner') === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setLevelData(prev => ({ ...prev, gameStyle: style.id }))}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-400 text-white ring-1 ring-cyan-400/50 shadow-md'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-cyan-300">{style.name}</span>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-1 leading-snug">{style.description}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-[9px] font-mono text-neutral-500">
                          <span>{style.tagline}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pursuit Hazard / Death Chase */}
              <div className="pt-3 border-t border-neutral-800 space-y-2.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  Pursuit Hazard / Death Chase
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: 'None', desc: 'Standard level without pursuer' },
                    { id: 'wall_of_death', label: 'Wall of Death', desc: 'Sweeping laser energy barrier' },
                    { id: 'shadow_beast', label: 'Shadow Stalker', desc: 'Relentless red-eyed beast' }
                  ].map(h => {
                    const curType = levelData.chaseHazard?.type || 'none';
                    const isSelected = curType === h.id;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          setLevelData(prev => ({
                            ...prev,
                            chaseHazard: {
                              type: h.id,
                              speed: prev.chaseHazard?.speed || 290,
                              delay: prev.chaseHazard?.delay || 1.8
                            }
                          }));
                        }}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                          isSelected
                            ? 'bg-rose-950/60 border-rose-400 text-rose-200'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{h.label}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">{h.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {levelData.chaseHazard?.type && levelData.chaseHazard.type !== 'none' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-950/80 rounded-xl border border-neutral-800">
                    <div>
                      <div className="flex justify-between text-xs text-neutral-400 mb-1">
                        <span>Chase Speed</span>
                        <span className="font-mono text-rose-400">{levelData.chaseHazard?.speed || 290} px/s</span>
                      </div>
                      <input
                        type="range"
                        min="180"
                        max="450"
                        step="10"
                        value={levelData.chaseHazard?.speed || 290}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setLevelData(prev => ({
                            ...prev,
                            chaseHazard: { ...prev.chaseHazard, speed: val }
                          }));
                        }}
                        className="w-full accent-rose-400"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-neutral-400 mb-1">
                        <span>Grace Delay</span>
                        <span className="font-mono text-rose-400">{levelData.chaseHazard?.delay || 1.8}s</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={levelData.chaseHazard?.delay ?? 1.8}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setLevelData(prev => ({
                            ...prev,
                            chaseHazard: { ...prev.chaseHazard, delay: val }
                          }));
                        }}
                        className="w-full accent-rose-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-800 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-400 block mb-1">Level Name</label>
                  <input
                    type="text"
                    id="level-name-input"
                    value={levelData.name}
                    onChange={(e) => setLevelData(prev => ({ ...prev, name: e.target.value }))}
                    maxLength={35}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-400 block mb-1">Creator</label>
                  <input
                    type="text"
                    id="level-creator-input"
                    value={levelData.creator}
                    onChange={(e) => setLevelData(prev => ({ ...prev, creator: e.target.value }))}
                    maxLength={25}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-1">Music BPM ({levelData.bpm})</label>
                    <input
                      type="range"
                      id="level-bpm-slider"
                      min="90"
                      max="180"
                      value={levelData.bpm}
                      onChange={(e) => setLevelData(prev => ({ ...prev, bpm: Number(e.target.value) }))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-1">Difficulty</label>
                    <select
                      id="level-difficulty-select"
                      value={levelData.difficulty}
                      onChange={(e) => setLevelData(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white"
                    >
                      {['Easy', 'Medium', 'Hard', 'Insane', 'Demon'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-400 block mb-1">Total Level Length ({levelData.length} Blocks)</label>
                  <input
                    type="range"
                    id="level-length-slider"
                    min="60"
                    max="400"
                    value={levelData.length}
                    onChange={(e) => setLevelData(prev => ({ ...prev, length: Number(e.target.value) }))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              {/* Course Finish Line Span (Ceiling to Floor vs Standard 3-Tile) */}
              <div className="pt-3 border-t border-neutral-800 space-y-2">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-cyan-400" />
                  Course Finish Line Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLevelData(prev => ({
                        ...prev,
                        verified: false,
                        finishSpan: 'standard',
                        objects: prev.objects.map(obj =>
                          obj.type === 'finish_gate' || obj.type === 'finish_gate_full'
                            ? { ...obj, type: 'finish_gate', spanFull: false }
                            : obj
                        )
                      }));
                    }}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                      (levelData.finishSpan || 'standard') === 'standard'
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                        : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="text-xs font-bold">Standard Gate</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">3 tiles tall at gate position</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLevelData(prev => ({
                        ...prev,
                        verified: false,
                        finishSpan: 'full',
                        objects: prev.objects.map(obj =>
                          obj.type === 'finish_gate' || obj.type === 'finish_gate_full'
                            ? { ...obj, type: 'finish_gate', spanFull: true }
                            : obj
                        )
                      }));
                    }}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                      levelData.finishSpan === 'full'
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                        : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="text-xs font-bold">Ceiling to Floor</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">Full-height laser barrier span</div>
                  </button>
                </div>
              </div>

              {/* Parallax Background Image & Speed */}
              <div className="pt-3 border-t border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    Parallax Background Image (Optional)
                  </label>
                  {levelData.backgroundUrl && (
                    <button
                      type="button"
                      onClick={() => setLevelData(prev => ({ ...prev, backgroundUrl: '' }))}
                      className="text-[11px] text-neutral-400 hover:text-rose-400 transition cursor-pointer"
                    >
                      Clear Image
                    </button>
                  )}
                </div>

                <input
                  type="url"
                  id="level-bg-url-input"
                  placeholder="https://... direct image link (PostImages, Catbox, ImgBB, etc.)"
                  value={levelData.backgroundUrl || ''}
                  onChange={(e) => setLevelData(prev => ({ ...prev, backgroundUrl: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-white placeholder:text-neutral-500 font-mono focus:outline-none focus:border-cyan-400"
                />

                <p className="text-[11px] text-neutral-400 leading-normal">
                  Provide a direct image URL from an image host with global CORS headers (e.g. PostImages, Catbox, or ImgBB). When you share this level, other players load and view this background seamlessly.
                </p>

                {levelData.backgroundUrl && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                      <span>Parallax Scroll Speed</span>
                      <span className="font-mono text-cyan-400">{Math.round((levelData.bgParallaxSpeed || 0.25) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      id="level-bg-speed-slider"
                      min="0.05"
                      max="0.8"
                      step="0.05"
                      value={levelData.bgParallaxSpeed || 0.25}
                      onChange={(e) => setLevelData(prev => ({ ...prev, bgParallaxSpeed: Number(e.target.value) }))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="close-settings-modal"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXPORT COMMUNITY JSON */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-cyan-400" /> Share & Publish Level
            </h3>

            {/* Verification Guard: Require beating the level before publishing */}
            {!levelData.verified ? (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">Level Verification Required</h4>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                      Before publishing or exporting this level for the community, you must verify that it can be completed. Playtest the course and reach 100% in a single normal run to validate it.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
                  <button
                    id="export-close-unverified-btn"
                    onClick={() => setShowExportModal(false)}
                    className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 cursor-pointer"
                  >
                    Back to Editor
                  </button>
                  <button
                    id="export-validate-now-btn"
                    onClick={() => {
                      setShowExportModal(false);
                      const val = validateLevelData(levelData);
                      if (val.valid && typeof onPlaytest === 'function') {
                        onPlaytest(val.level);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Playtest & Verify (0% → 100%)
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verified! Level cleared from 0% to 100% by creator and approved for sharing.</span>
                </div>

                <p className="text-xs text-neutral-400">
                  Copy this verified level JSON code to share with friends or download the backup file.
                </p>

                <textarea
                  readOnly
                  id="export-json-textarea"
                  value={JSON.stringify(levelData, null, 2)}
                  rows={8}
                  className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-cyan-300 focus:outline-none resize-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      id="download-zip-btn"
                      onClick={handleDownloadFile}
                      className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg hover:shadow-cyan-500/20 transition"
                      title="Exports a complete ZIP package with level, blueprints, and spritesheets"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Level Package (.ZIP)
                    </button>
                    <button
                      id="download-json-legacy-btn"
                      onClick={handleDownloadJsonOnly}
                      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 flex items-center gap-1.5 cursor-pointer"
                      title="Download legacy single .json file"
                    >
                      <Download className="w-3.5 h-3.5" /> Legacy .JSON
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="close-export-modal"
                      onClick={() => setShowExportModal(false)}
                      className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      id="copy-json-btn"
                      onClick={handleCopyJson}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs cursor-pointer"
                    >
                      Copy JSON
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL: IMPORT COMMUNITY JSON */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-cyan-400" /> Import Community Level
            </h3>
            <p className="text-xs text-neutral-400">
              Paste valid level JSON or upload a saved level file from your computer.
            </p>

            <textarea
              id="import-json-textarea"
              placeholder="Paste level JSON structure here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={7}
              className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-white focus:outline-none focus:border-cyan-400 resize-none"
            />

            <input
              type="file"
              ref={fileInputRef}
              accept=".json,.zip,application/json,application/zip"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                id="upload-file-trigger-btn"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <Upload className="w-3.5 h-3.5" /> Upload File (.ZIP or .JSON)
              </button>

              <div className="flex items-center gap-2">
                <button
                  id="cancel-import-modal"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportText('');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  id="apply-import-btn"
                  onClick={handleApplyImport}
                  disabled={!importText.trim()}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-neutral-950 font-bold text-xs"
                >
                  Apply Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PARALLAX STUDIO */}
      {showParallaxModal && (
        <ParallaxStudioModal
          isOpen={showParallaxModal}
          onClose={() => setShowParallaxModal(false)}
          initialLayers={levelData.parallaxLayers || []}
          currentTheme={levelData.theme || 'cyber_cyan'}
          onSaveLayers={(newLayers) => {
            setLevelData(prev => ({ ...prev, parallaxLayers: newLayers, verified: false }));
            pushHistory(levelData.objects);
            setStatusMessage(`Updated ${newLayers.length} parallax background layer(s)`);
          }}
        />
      )}

      {/* MODAL: 2D SPRITESHEET STUDIO */}
      {showSpriteStudioModal && (
        <SpriteStudioModal
          isOpen={showSpriteStudioModal}
          onClose={() => setShowSpriteStudioModal(false)}
          onSaveAtlas={(sheet) => {
            setStatusMessage(`Saved spritesheet "${sheet.name}" with ${sheet.sprites?.length || 0} sprite(s)!`);
            showNotification(`Saved "${sheet.name}" with ${sheet.sprites?.length || 0} sprites!`);
          }}
          onAddParallaxLayer={(layer) => {
            if (!layer) return;
            setLevelData(prev => {
              const current = prev.parallaxLayers || [];
              const updated = [...current, layer];
              return { ...prev, parallaxLayers: updated, verified: false };
            });
            setStatusMessage(`Added background layer "${layer.name}" from Spritesheet Studio!`);
            showNotification(`Added parallax layer "${layer.name}"`);
          }}
          onUpdateLevelBlueprints={(newBps) => {
            if (!Array.isArray(newBps)) return;
            setLevelData(prev => {
              const existing = prev.customBlueprints || [];
              const map = new Map();
              existing.forEach(b => map.set(b.id, b));
              newBps.forEach(b => map.set(b.id, b));
              return { ...prev, customBlueprints: Array.from(map.values()), verified: false };
            });
          }}
        />
      )}

    </div>
  );
}
