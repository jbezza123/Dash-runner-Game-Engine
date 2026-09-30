import React, { useState, useEffect, useRef } from 'react';
import {
  X, Play, Pause, RefreshCw, Upload, Image as ImageIcon,
  Layers, ShieldAlert, Sparkles, Box, Eye, CheckCircle2,
  Sliders, ArrowUpCircle, CircleDot, Coins, Plus, Trash2,
  ChevronUp, ChevronDown, Grid, RotateCw, Crosshair, Edit3
} from 'lucide-react';
import { getSavedSpritesheets } from '../../utils/spritesheetManager.js';

const ROLE_DEFINITIONS = [
  { id: 'block', name: 'Solid Block', icon: Box, color: 'text-cyan-400', desc: 'Solid terrain. Player lands on top, crashes into vertical walls.' },
  { id: 'half_block', name: 'Half Platform', icon: Sliders, color: 'text-sky-400', desc: 'Thin 32px platform. Can jump onto top surface.' },
  { id: 'hazard', name: 'Hazard / Spike', icon: ShieldAlert, color: 'text-rose-400', desc: 'Deadly obstacle. Destroys runner upon impact.' },
  { id: 'saw', name: 'Rotating Saw', icon: RefreshCw, color: 'text-red-400', desc: 'Spinning circular hazard with continuous rotation.' },
  { id: 'decor', name: 'Visual Decor', icon: Sparkles, color: 'text-amber-400', desc: 'Pure visual detailing. Non-colliding, sits on blocks.' },
  { id: 'orb', name: 'Jump Orb', icon: CircleDot, color: 'text-yellow-400', desc: 'Interactive gravity ring. Tapping mid-air launches player.' },
  { id: 'pad', name: 'Launch Pad', icon: ArrowUpCircle, color: 'text-emerald-400', desc: 'Spring plate. Automatically boosts runner upward on touch.' },
  { id: 'collectable', name: 'Coin / Relic', icon: Coins, color: 'text-amber-300', desc: 'Collectible item. Player gathers it for score & verification.' },
];

export default function BlueprintCreatorModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialBlueprint = null
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('New Custom Asset');
  const [tag, setTag] = useState('Custom');
  const [role, setRole] = useState('block');
  const [imageUrl, setImageUrl] = useState('');
  const [layer, setLayer] = useState('background'); // 'background' | 'foreground'

  // Animation settings
  const [isAnimated, setIsAnimated] = useState(false);
  const [animType, setAnimType] = useState('strip'); // 'strip' | 'frames'
  const [frames, setFrames] = useState([]); // array of image data URLs or URLs
  const [frameCount, setFrameCount] = useState(4);
  const [fps, setFps] = useState(8);
  const [loopMode, setLoopMode] = useState('loop'); // 'loop' | 'pingpong'
  const [stripDirection, setStripDirection] = useState('horizontal'); // 'horizontal' | 'vertical'

  // Default / Procedural Animations (Spin, Bob, Pulse)
  const [proceduralAnim, setProceduralAnim] = useState('none'); // 'none' | 'spin' | 'bob' | 'pulse'
  const [spinSpeed, setSpinSpeed] = useState(180); // degrees per second
  const [spinDirection, setSpinDirection] = useState('cw'); // 'cw' | 'ccw'
  const [bobSpeed, setBobSpeed] = useState(3);
  const [bobHeight, setBobHeight] = useState(6);
  const [pulseSpeed, setPulseSpeed] = useState(3);
  const [pulseAmount, setPulseAmount] = useState(15); // percent

  // Spritesheet Picker Drawer
  const [showSpritesheetPicker, setShowSpritesheetPicker] = useState(false);
  const [availableSpritesheets, setAvailableSpritesheets] = useState([]);
  const [pickerTarget, setPickerTarget] = useState('main'); // 'main' | 'frame'

  // Dimensions
  const [tileWidth, setTileWidth] = useState(64);
  const [tileHeight, setTileHeight] = useState(64);

  // Custom Hitbox / Hit Borders settings
  const [activeSettingsTab, setActiveSettingsTab] = useState('general'); // 'general' | 'hitbox'
  const [hitboxPoints, setHitboxPoints] = useState([
    { x: 0.05, y: 0.05 },
    { x: 0.95, y: 0.05 },
    { x: 0.95, y: 0.95 },
    { x: 0.05, y: 0.95 }
  ]);
  const [useCustomHitbox, setUseCustomHitbox] = useState(false);

  // Preview state
  const [isPlayingPreview, setIsPlayingPreview] = useState(true);
  const [showHitbox, setShowHitbox] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const imgElementRef = useRef(null);
  const frameImagesRef = useRef([]);
  const fileInputRef = useRef(null);
  const extraFrameFileInputRef = useRef(null);

  // Initialize from existing blueprint when editing
  useEffect(() => {
    if (initialBlueprint) {
      setName(initialBlueprint.name || 'Custom Blueprint');
      setTag(initialBlueprint.tag || 'Custom');
      setRole(initialBlueprint.role || 'block');
      setImageUrl(initialBlueprint.imageUrl || '');
      setLayer(initialBlueprint.layer || 'background');
      setIsAnimated(Boolean(initialBlueprint.isAnimated));
      setAnimType(initialBlueprint.animType || (Array.isArray(initialBlueprint.frames) && initialBlueprint.frames.length > 0 ? 'frames' : 'strip'));
      setFrames(Array.isArray(initialBlueprint.frames) ? initialBlueprint.frames : []);
      setFrameCount(Math.max(1, Number(initialBlueprint.frameCount) || 1));
      setFps(Math.max(1, Number(initialBlueprint.fps) || 8));
      setLoopMode(initialBlueprint.loopMode || 'loop');
      setStripDirection(initialBlueprint.stripDirection || 'horizontal');
      setProceduralAnim(initialBlueprint.proceduralAnim || 'none');
      setSpinSpeed(Number(initialBlueprint.spinSpeed) || 180);
      setSpinDirection(initialBlueprint.spinDirection || 'cw');
      setBobSpeed(Number(initialBlueprint.bobSpeed) || 3);
      setBobHeight(Number(initialBlueprint.bobHeight) || 6);
      setPulseSpeed(Number(initialBlueprint.pulseSpeed) || 3);
      setPulseAmount(Number(initialBlueprint.pulseAmount) || 15);
      setTileWidth(initialBlueprint.width || 64);
      setTileHeight(initialBlueprint.height || 64);
      setActiveSettingsTab('general');
      if (initialBlueprint.hitbox?.points && Array.isArray(initialBlueprint.hitbox.points)) {
        setHitboxPoints(initialBlueprint.hitbox.points);
        setUseCustomHitbox(initialBlueprint.hitbox.type === 'polygon' || Boolean(initialBlueprint.hitbox.enabled));
      } else {
        setHitboxPoints([
          { x: 0.05, y: 0.05 },
          { x: 0.95, y: 0.05 },
          { x: 0.95, y: 0.95 },
          { x: 0.05, y: 0.95 }
        ]);
        setUseCustomHitbox(false);
      }
    } else {
      setName('Ancient Sun Totem');
      setTag('Temple');
      setRole('decor');
      setImageUrl('https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=128&q=80');
      setLayer('background');
      setIsAnimated(false);
      setAnimType('strip');
      setFrames([]);
      setFrameCount(1);
      setFps(8);
      setLoopMode('loop');
      setStripDirection('horizontal');
      setProceduralAnim('none');
      setSpinSpeed(180);
      setSpinDirection('cw');
      setBobSpeed(3);
      setBobHeight(6);
      setPulseSpeed(3);
      setPulseAmount(15);
      setTileWidth(64);
      setTileHeight(64);
      setActiveSettingsTab('general');
      setHitboxPoints([
        { x: 0.05, y: 0.05 },
        { x: 0.95, y: 0.05 },
        { x: 0.95, y: 0.95 },
        { x: 0.05, y: 0.95 }
      ]);
      setUseCustomHitbox(false);
    }
  }, [initialBlueprint, isOpen]);

  // Load Spritesheets when opening picker
  useEffect(() => {
    if (showSpritesheetPicker) {
      setAvailableSpritesheets(getSavedSpritesheets());
    }
  }, [showSpritesheetPicker]);

  // Load and cache the primary image
  useEffect(() => {
    if (!imageUrl) {
      setImageLoaded(false);
      setImageError(false);
      return;
    }

    setImageError(false);
    setImageLoaded(false);
    const img = new Image();

    img.onload = () => {
      imgElementRef.current = img;
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
      setImageError(false);
    };

    img.onerror = () => {
      setImageError(true);
      setImageLoaded(false);
    };

    img.src = imageUrl;
  }, [imageUrl]);

  // Load and cache all frame images for multi-image mode
  useEffect(() => {
    if (!Array.isArray(frames) || frames.length === 0) {
      frameImagesRef.current = [];
      return;
    }

    const loaded = frames.map(url => {
      const img = new Image();
      img.src = url;
      return img;
    });
    frameImagesRef.current = loaded;
  }, [frames]);

  // Handle local file upload for main image
  const handleFileUpload = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WEBP, or GIF).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        setImageUrl(dataUrl);
        const fileNameClean = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        if (!initialBlueprint) {
          setName(fileNameClean.charAt(0).toUpperCase() + fileNameClean.slice(1));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle extra frames file upload
  const handleExtraFramesUpload = (e) => {
    const files = Array.from(e.target?.files || []);
    if (files.length === 0) return;

    const newUrls = [];
    let processed = 0;

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newUrls.push(event.target.result);
        }
        processed++;
        if (processed === files.length) {
          setFrames(prev => {
            const combined = [...prev, ...newUrls];
            if (!imageUrl && combined.length > 0) {
              setImageUrl(combined[0]);
            }
            return combined;
          });
          setIsAnimated(true);
          setAnimType('frames');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFrame = (idx) => {
    setFrames(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMoveFrame = (idx, dir) => {
    setFrames(prev => {
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[nextIdx];
      copy[nextIdx] = temp;
      return copy;
    });
  };

  const handleSelectSpriteCut = (sprite) => {
    if (!sprite || !sprite.dataUrl) return;
    if (pickerTarget === 'main') {
      setImageUrl(sprite.dataUrl);
    } else {
      setFrames(prev => [...prev, sprite.dataUrl]);
      setIsAnimated(true);
      setAnimType('frames');
    }
    setShowSpritesheetPicker(false);
  };

  // Live Canvas Preview Animation Loop
  useEffect(() => {
    if (!isOpen) return;

    let startTimestamp = performance.now();

    const render = (now) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;

      ctx.clearRect(0, 0, cw, ch);

      // 1. Grid backdrop
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, cw, ch);

      const previewFloorY = ch - 24;
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, previewFloorY, cw, 24);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, previewFloorY);
      ctx.lineTo(cw, previewFloorY);
      ctx.stroke();

      // Checkered grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < cw; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, previewFloorY);
        ctx.stroke();
      }
      for (let y = 0; y < previewFloorY; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
        ctx.stroke();
      }

      // 2. Draw Sprite / Animated Frame
      const targetSize = 64;
      const destX = (cw - targetSize) / 2;
      const destY = previewFloorY - targetSize;

      const elapsed = (now - startTimestamp) / 1000;

      // Calculate Procedural Animations
      let drawAngle = 0;
      let drawScale = 1;
      let drawOffsetY = 0;

      if (proceduralAnim === 'spin') {
        const dir = spinDirection === 'ccw' ? -1 : 1;
        drawAngle = (elapsed * spinSpeed * dir * (Math.PI / 180)) % (Math.PI * 2);
      } else if (proceduralAnim === 'bob') {
        drawOffsetY = Math.sin(elapsed * bobSpeed * Math.PI * 2) * bobHeight;
      } else if (proceduralAnim === 'pulse') {
        drawScale = 1 + Math.sin(elapsed * pulseSpeed * Math.PI * 2) * (pulseAmount / 100);
      }

      ctx.save();
      ctx.translate(destX + targetSize / 2, destY + targetSize / 2 + drawOffsetY);
      if (drawAngle !== 0) ctx.rotate(drawAngle);
      if (drawScale !== 1) ctx.scale(drawScale, drawScale);
      ctx.translate(-targetSize / 2, -targetSize / 2);

      // Frame animation logic
      if (isAnimated && animType === 'frames' && frames.length > 0) {
        const total = frames.length;
        let fIdx = 0;
        if (isPlayingPreview) {
          if (loopMode === 'pingpong' && total > 2) {
            const steps = (total - 1) * 2;
            const step = Math.floor((elapsed * fps) % steps);
            fIdx = step < total ? step : steps - step;
          } else {
            fIdx = Math.floor((elapsed * fps) % total);
          }
        }
        const activeImg = frameImagesRef.current[fIdx] || imgElementRef.current;
        if (activeImg && activeImg.naturalWidth > 0) {
          ctx.drawImage(activeImg, 0, 0, targetSize, targetSize);
        } else {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
          ctx.fillRect(0, 0, targetSize, targetSize);
        }
      } else if (isAnimated && animType === 'strip' && frameCount > 1) {
        const img = imgElementRef.current;
        if (img && imageLoaded) {
          let currentFrame = 0;
          if (isPlayingPreview) {
            if (loopMode === 'pingpong' && frameCount > 2) {
              const pingPongFrames = (frameCount - 1) * 2;
              const step = Math.floor((elapsed * fps) % pingPongFrames);
              currentFrame = step < frameCount ? step : pingPongFrames - step;
            } else {
              currentFrame = Math.floor((elapsed * fps) % frameCount);
            }
          }

          if (stripDirection === 'vertical') {
            const frameH = img.naturalHeight / frameCount;
            ctx.drawImage(img, 0, currentFrame * frameH, img.naturalWidth, frameH, 0, 0, targetSize, targetSize);
          } else {
            const frameW = img.naturalWidth / frameCount;
            ctx.drawImage(img, currentFrame * frameW, 0, frameW, img.naturalHeight, 0, 0, targetSize, targetSize);
          }
        }
      } else {
        // Static image
        const img = imgElementRef.current;
        if (img && imageLoaded) {
          ctx.drawImage(img, 0, 0, targetSize, targetSize);
        } else {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
          ctx.fillRect(0, 0, targetSize, targetSize);
          ctx.strokeStyle = imageError ? '#ef4444' : '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(0, 0, targetSize, targetSize);
        }
      }

      ctx.restore();

      // 3. Collision / Hitbox Outline
      if (showHitbox) {
        ctx.save();
        if (useCustomHitbox && Array.isArray(hitboxPoints) && hitboxPoints.length >= 3) {
          ctx.strokeStyle = '#ef4444';
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          hitboxPoints.forEach((pt, idx) => {
            const px = destX + pt.x * targetSize;
            const py = destY + pt.y * targetSize;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Draw vertices
          ctx.fillStyle = '#facc15';
          hitboxPoints.forEach((pt) => {
            const px = destX + pt.x * targetSize;
            const py = destY + pt.y * targetSize;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
          });
        } else if (role === 'hazard' || role === 'saw') {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
          ctx.lineWidth = 2;
          ctx.fillRect(destX + 8, destY + 8, targetSize - 16, targetSize - 16);
          ctx.strokeRect(destX + 8, destY + 8, targetSize - 16, targetSize - 16);
        } else if (role === 'block') {
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.9)';
          ctx.lineWidth = 2;
          ctx.strokeRect(destX, destY, targetSize, targetSize);
        } else if (role === 'half_block') {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
          ctx.lineWidth = 2;
          ctx.strokeRect(destX, destY + targetSize / 2, targetSize, targetSize / 2);
        } else if (role === 'orb') {
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(destX + targetSize / 2, destY + targetSize / 2, targetSize / 2 - 6, 0, Math.PI * 2);
          ctx.stroke();
        } else if (role === 'pad') {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.9)';
          ctx.lineWidth = 2;
          ctx.strokeRect(destX + 4, destY + targetSize - 16, targetSize - 8, 16);
        } else if (role === 'collectable') {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(destX + targetSize / 2, destY + targetSize / 2, 14, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    isOpen, imageUrl, imageLoaded, imageError, isAnimated, animType, frames, frameCount,
    fps, loopMode, stripDirection, isPlayingPreview, showHitbox, role,
    proceduralAnim, spinSpeed, spinDirection, bobSpeed, bobHeight, pulseSpeed, pulseAmount,
    useCustomHitbox, hitboxPoints
  ]);

  if (!isOpen) return null;

  const handleSaveBlueprint = () => {
    if (!name.trim()) {
      alert('Please enter an asset name.');
      return;
    }
    const resolvedImg = imageUrl.trim() || (frames.length > 0 ? frames[0] : '');
    if (!resolvedImg) {
      alert('Please provide an image URL, upload an image file, or add animation frames.');
      return;
    }

    const effectiveFrameCount = animType === 'frames' && frames.length > 0
      ? frames.length
      : Math.max(1, Number(frameCount));

    const blueprint = {
      id: initialBlueprint?.id || `bp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim(),
      tag: tag.trim() || 'Custom',
      role,
      imageUrl: resolvedImg,
      layer,
      isAnimated,
      animType,
      frames: animType === 'frames' ? frames : [],
      frameCount: isAnimated ? effectiveFrameCount : 1,
      fps: isAnimated ? Math.max(1, Number(fps)) : 8,
      loopMode,
      stripDirection,
      proceduralAnim,
      spinSpeed: Number(spinSpeed) || 180,
      spinDirection,
      bobSpeed: Number(bobSpeed) || 3,
      bobHeight: Number(bobHeight) || 6,
      pulseSpeed: Number(pulseSpeed) || 3,
      pulseAmount: Number(pulseAmount) || 15,
      width: Number(tileWidth) || 64,
      height: Number(tileHeight) || 64,
      hitbox: {
        type: useCustomHitbox ? 'polygon' : 'box',
        enabled: useCustomHitbox,
        points: hitboxPoints
      },
      updatedAt: Date.now()
    };

    onSave(blueprint);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in text-neutral-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {initialBlueprint ? 'Edit Asset Blueprint' : 'Create Custom Asset Blueprint'}
              </h2>
              <p className="text-xs text-neutral-400">
                Define visual sprites, multi-image frames, procedural spins, and collision physics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Form Fields */}
          <div className="md:col-span-7 space-y-4">

            {/* Sub-Tabs: General Blueprint Settings vs Hit Borders Editor */}
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveSettingsTab('general')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  activeSettingsTab === 'general'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Blueprint Config</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('hitbox')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  activeSettingsTab === 'hitbox'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Hit Borders & Polygon Points</span>
                {useCustomHitbox && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse ml-0.5" />
                )}
              </button>
            </div>

            {activeSettingsTab === 'general' ? (
              <>
            {/* Asset Identity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Asset Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ancient Flame Pillar"
                  className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Category Tag
                </label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="e.g. Temple, Mechanical, Neon"
                  className="w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* In-Game Physics Role */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Physical Role & Mechanics
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ROLE_DEFINITIONS.map(r => {
                  const Icon = r.icon;
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`p-2 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-800 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                          : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                      title={r.desc}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className={`w-4 h-4 ${r.color}`} />
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <span className="text-xs font-bold text-white">{r.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Image / Source */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Primary Visual Image / Base Sprite
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget('main');
                      setShowSpritesheetPicker(true);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Grid className="w-3.5 h-3.5" /> From Spritesheet
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload File
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                  />
                </div>
              </div>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... direct image URL or Data URL"
                className="w-full px-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 truncate"
              />
            </div>

            {/* Animation Settings Section */}
            <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnimated}
                    onChange={(e) => setIsAnimated(e.target.checked)}
                    className="rounded border-neutral-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Frame Animation</span>
                </label>
                
                {isAnimated && (
                  <div className="flex items-center bg-neutral-900 rounded-lg p-0.5 border border-neutral-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAnimType('frames')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${animType === 'frames' ? 'bg-cyan-500 text-neutral-950 font-bold' : 'text-neutral-400'}`}
                    >
                      Multi-Image ({frames.length} Frames)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnimType('strip')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${animType === 'strip' ? 'bg-cyan-500 text-neutral-950 font-bold' : 'text-neutral-400'}`}
                    >
                      Sprite Strip
                    </button>
                  </div>
                )}
              </div>

              {isAnimated && (
                <div className="pt-2 border-t border-neutral-800/80 space-y-3">
                  
                  {/* Mode: Multi-Image Individual Frames */}
                  {animType === 'frames' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-300 font-medium">Animation Frames ({frames.length})</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPickerTarget('frame');
                              setShowSpritesheetPicker(true);
                            }}
                            className="text-amber-400 hover:text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Grid className="w-3.5 h-3.5" /> + From Spritesheet
                          </button>
                          <button
                            type="button"
                            onClick={() => extraFrameFileInputRef.current?.click()}
                            className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> + Upload Frame(s)
                          </button>
                          <input
                            type="file"
                            ref={extraFrameFileInputRef}
                            multiple
                            onChange={handleExtraFramesUpload}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>
                      </div>

                      {/* Frames Reel */}
                      {frames.length === 0 ? (
                        <div
                          onClick={() => extraFrameFileInputRef.current?.click()}
                          className="border border-dashed border-neutral-800 rounded-lg p-4 text-center text-xs text-neutral-500 hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer"
                        >
                          Click to upload extra image frames for this animation
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 overflow-x-auto py-1">
                          {frames.map((frameUrl, idx) => (
                            <div
                              key={idx}
                              className="relative shrink-0 w-14 h-14 rounded-lg bg-neutral-900 border border-neutral-700 flex flex-col items-center justify-center p-1 group"
                            >
                              <img src={frameUrl} alt={`Frame ${idx + 1}`} className="max-w-full max-h-full object-contain" />
                              <span className="absolute bottom-0 left-1 text-[9px] font-mono text-cyan-400 font-bold">
                                #{idx + 1}
                              </span>
                              <div className="absolute inset-0 bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveFrame(idx, -1)}
                                    className="p-0.5 text-neutral-300 hover:text-white"
                                  >
                                    <ChevronUp className="w-3 h-3 rotate-270" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFrame(idx)}
                                  className="p-0.5 text-rose-400 hover:text-rose-300"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                {idx < frames.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveFrame(idx, 1)}
                                    className="p-0.5 text-neutral-300 hover:text-white"
                                  >
                                    <ChevronDown className="w-3 h-3 rotate-270" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode: Sprite Strip Configuration */}
                  {animType === 'strip' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">Total Frames in Strip</label>
                        <input
                          type="number"
                          min="1"
                          max="32"
                          value={frameCount}
                          onChange={(e) => setFrameCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">Strip Layout</label>
                        <select
                          value={stripDirection}
                          onChange={(e) => setStripDirection(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white cursor-pointer"
                        >
                          <option value="horizontal">Horizontal (Left to Right)</option>
                          <option value="vertical">Vertical (Top to Bottom)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Speed & Loop Controls */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Frame Speed: {fps} FPS</label>
                      <input
                        type="range"
                        min="1"
                        max="24"
                        value={fps}
                        onChange={(e) => setFps(parseInt(e.target.value) || 8)}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Loop Behavior</label>
                      <select
                        value={loopMode}
                        onChange={(e) => setLoopMode(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white cursor-pointer"
                      >
                        <option value="loop">Continuous Loop</option>
                        <option value="pingpong">Ping-Pong (Forward & Back)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Default / Procedural Animations (Spin, Bob, Pulse) */}
            <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-cyan-400" />
                  <span>Default Procedural Animations</span>
                </span>
                <div className="flex items-center bg-neutral-900 rounded-lg p-0.5 border border-neutral-800 text-[11px]">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'spin', label: 'Spin' },
                    { id: 'bob', label: 'Float / Bob' },
                    { id: 'pulse', label: 'Pulse Scale' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProceduralAnim(p.id)}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        proceduralAnim === p.id ? 'bg-cyan-500 text-neutral-950 font-bold' : 'text-neutral-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {proceduralAnim === 'spin' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800/80 animate-fade-in">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Spin Speed: {spinSpeed}°/s</label>
                    <input
                      type="range"
                      min="30"
                      max="720"
                      step="30"
                      value={spinSpeed}
                      onChange={(e) => setSpinSpeed(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Rotation Direction</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSpinDirection('cw')}
                        className={`flex-1 py-1 rounded text-xs border ${spinDirection === 'cw' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}
                      >
                        Clockwise ↻
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpinDirection('ccw')}
                        className={`flex-1 py-1 rounded text-xs border ${spinDirection === 'ccw' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}
                      >
                        Counter ↺
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {proceduralAnim === 'bob' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800/80 animate-fade-in">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Bob Height: {bobHeight}px</label>
                    <input
                      type="range"
                      min="2"
                      max="16"
                      value={bobHeight}
                      onChange={(e) => setBobHeight(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Bob Speed: {bobSpeed}x</label>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={bobSpeed}
                      onChange={(e) => setBobSpeed(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {proceduralAnim === 'pulse' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800/80 animate-fade-in">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Pulse Amount: ±{pulseAmount}%</label>
                    <input
                      type="range"
                      min="5"
                      max="35"
                      value={pulseAmount}
                      onChange={(e) => setPulseAmount(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Pulse Speed: {pulseSpeed}x</label>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={pulseSpeed}
                      onChange={(e) => setPulseSpeed(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Layer & Depth Placement */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-neutral-300">Default Depth Layer:</span>
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setLayer('background')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    layer === 'background' ? 'bg-cyan-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Behind Player (BG)
                </button>
                <button
                  type="button"
                  onClick={() => setLayer('foreground')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    layer === 'foreground' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  In Front (FG)
                </button>
              </div>
            </div>
            </>
            ) : (
              /* TAB: HIT BORDERS (HITBOX MODIFIER SCREEN) */
              <div className="space-y-4 animate-fade-in">
                <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider block">
                        Custom Hit Border (Polygon Hitbox)
                      </span>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Add and move vertices to conform precisely to jagged spikes, diagonal blocks, or complex shapes.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useCustomHitbox}
                        onChange={(e) => setUseCustomHitbox(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500" />
                    </label>
                  </div>

                  {useCustomHitbox && (
                    <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-neutral-300">
                          Vertices ({hitboxPoints.length} points)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              // Add a point between the last two or at center-bottom
                              const newPt = { x: 0.5, y: 0.95 };
                              setHitboxPoints([...hitboxPoints, newPt]);
                            }}
                            className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-medium flex items-center gap-1 cursor-pointer transition"
                          >
                            <Plus className="w-3 h-3" /> Add Point
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // Triangular Spike Preset
                              setHitboxPoints([
                                { x: 0.5, y: 0.05 },
                                { x: 0.95, y: 0.95 },
                                { x: 0.05, y: 0.95 }
                              ]);
                            }}
                            className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] cursor-pointer"
                            title="Triangle Spike hitbox"
                          >
                            Spike ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // Standard Box Preset
                              setHitboxPoints([
                                { x: 0.05, y: 0.05 },
                                { x: 0.95, y: 0.05 },
                                { x: 0.95, y: 0.95 },
                                { x: 0.05, y: 0.95 }
                              ]);
                            }}
                            className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] cursor-pointer"
                            title="Reset to 4-corner box"
                          >
                            Box ■
                          </button>
                        </div>
                      </div>

                      {/* Vertices List & Sliders */}
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {hitboxPoints.map((pt, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs"
                          >
                            <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-400 border border-rose-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {idx + 1}
                            </span>

                            <div className="flex-1 flex items-center gap-1.5">
                              <span className="text-neutral-500 font-mono text-[10px]">X:</span>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={pt.x}
                                onChange={(e) => {
                                  const updated = [...hitboxPoints];
                                  updated[idx] = { ...updated[idx], x: parseFloat(e.target.value) };
                                  setHitboxPoints(updated);
                                }}
                                className="flex-1 accent-rose-500 cursor-pointer"
                              />
                              <span className="font-mono text-neutral-300 w-8 text-right text-[11px]">
                                {Number(pt.x).toFixed(2)}
                              </span>
                            </div>

                            <div className="flex-1 flex items-center gap-1.5">
                              <span className="text-neutral-500 font-mono text-[10px]">Y:</span>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={pt.y}
                                onChange={(e) => {
                                  const updated = [...hitboxPoints];
                                  updated[idx] = { ...updated[idx], y: parseFloat(e.target.value) };
                                  setHitboxPoints(updated);
                                }}
                                className="flex-1 accent-rose-500 cursor-pointer"
                              />
                              <span className="font-mono text-neutral-300 w-8 text-right text-[11px]">
                                {Number(pt.y).toFixed(2)}
                              </span>
                            </div>

                            {hitboxPoints.length > 3 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setHitboxPoints(hitboxPoints.filter((_, i) => i !== idx));
                                }}
                                className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition cursor-pointer"
                                title="Remove vertex"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Interactive Live Preview Viewport */}
          <div className="md:col-span-5 flex flex-col">
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              Live Stage Preview
            </label>
            <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-2xl p-3 flex flex-col items-center justify-center relative overflow-hidden min-h-[240px]">
              <canvas
                ref={canvasRef}
                width={240}
                height={160}
                className="w-full h-auto rounded-xl shadow-inner border border-neutral-800/80"
              />

              {/* Viewport Overlay Controls */}
              <div className="flex items-center justify-between w-full mt-3 px-1 text-xs">
                <button
                  type="button"
                  onClick={() => setIsPlayingPreview(p => !p)}
                  className="flex items-center gap-1.5 text-neutral-300 hover:text-white px-2 py-1 bg-neutral-900 rounded-lg border border-neutral-800 cursor-pointer"
                >
                  {isPlayingPreview ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                  <span>{isPlayingPreview ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHitbox(h => !h)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer ${
                    showHitbox
                      ? 'bg-neutral-800 border-cyan-500/60 text-cyan-400'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Hitbox: {showHitbox ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {/* Blueprint Summary Card */}
              <div className="w-full mt-3 p-2.5 bg-neutral-900/60 border border-neutral-800 rounded-xl text-[11px] text-neutral-400 space-y-1">
                <div className="flex items-center justify-between text-white font-medium">
                  <span>{name || 'Untitled Blueprint'}</span>
                  <span className="text-cyan-400 capitalize">{role}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span>Layer: {layer === 'foreground' ? 'Foreground' : 'Background'}</span>
                  <span>
                    {isAnimated
                      ? (animType === 'frames' ? `${frames.length} Frame Sequence` : `${frameCount} Strip Frames`)
                      : (proceduralAnim !== 'none' ? `Procedural ${proceduralAnim}` : 'Static Sprite')}
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Spritesheet Picker Modal Overlay */}
        {showSpritesheetPicker && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-950">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">
                    Select Sprite Cut from Spritesheet ({pickerTarget === 'main' ? 'Primary Image' : 'Animation Frame'})
                  </span>
                </div>
                <button onClick={() => setShowSpritesheetPicker(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {availableSpritesheets.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 text-xs">
                    No spritesheets created yet. Use the 2D Spritesheet Studio to pack or slice sprites!
                  </div>
                ) : (
                  availableSpritesheets.map(sheet => (
                    <div key={sheet.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                      <span className="text-xs font-bold text-neutral-300 block mb-2">{sheet.name}</span>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {sheet.sprites?.map(spr => (
                          <div
                            key={spr.id}
                            onClick={() => handleSelectSpriteCut(spr)}
                            className="bg-neutral-900 border border-neutral-800 hover:border-cyan-400 rounded-lg p-1.5 flex flex-col items-center gap-1 cursor-pointer transition group"
                          >
                            <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                              <img src={spr.dataUrl} alt={spr.name} className="max-w-full max-h-full object-contain" />
                            </div>
                            <span className="text-[9px] text-neutral-400 truncate w-full text-center group-hover:text-cyan-300">
                              {spr.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-950/60">
          <div>
            {initialBlueprint?.id && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-300 font-semibold">Confirm delete?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(initialBlueprint.id);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow transition cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-rose-900/50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Blueprint</span>
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveBlueprint}
              className="px-5 py-2 text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-neutral-950 rounded-xl shadow-lg hover:shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Blueprint</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
