import React, { useState, useEffect, useRef } from 'react';
import {
  X, Layers, Plus, Trash2, ArrowUp, ArrowDown, Upload,
  Eye, Play, Pause, RefreshCw, CheckCircle2, Sliders, Image as ImageIcon,
  Sparkles, Compass, AlertCircle
} from 'lucide-react';
import { getCachedCustomImage } from '../../utils/customAssetsManager.js';

const PARALLAX_PRESETS = [
  {
    id: 'deep_jungle_multidepth',
    name: 'Deep Jungle Canopy (Multi-Depth)',
    description: '4 layers: distant misty mountains, jungle canopy, ancient trunks & foreground hanging vines',
    layers: [
      {
        id: 'layer_sky',
        name: 'Misty Jungle Sky',
        url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=1600&q=80',
        speed: 0.08,
        opacity: 0.95,
        offsetY: 0,
        scale: 1.0,
        repeatX: true,
        isForeground: false
      },
      {
        id: 'layer_mountains',
        name: 'Distant Forest Ridges',
        url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1600&q=80',
        speed: 0.25,
        opacity: 0.85,
        offsetY: 20,
        scale: 1.0,
        repeatX: true,
        isForeground: false
      },
      {
        id: 'layer_canopy',
        name: 'Ancient Tree Trunks',
        url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80',
        speed: 0.55,
        opacity: 0.80,
        offsetY: 10,
        scale: 1.0,
        repeatX: true,
        isForeground: false
      },
      {
        id: 'layer_fg_vines',
        name: 'Foreground Hanging Canopy',
        url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1600&q=80',
        speed: 1.25,
        opacity: 0.65,
        offsetY: -30,
        scale: 1.1,
        repeatX: true,
        isForeground: true
      }
    ]
  },
  {
    id: 'mayan_temple_sunset',
    name: 'Ancient Mayan Temple Sunset',
    description: '3 layers: golden dusk clouds, stone pyramid skyline, and ancient stepped ruins',
    layers: [
      {
        id: 'layer_temple_sky',
        name: 'Sunset Sky & Horizon',
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=80',
        speed: 0.06,
        opacity: 0.95,
        offsetY: 0,
        scale: 1.0,
        repeatX: true,
        isForeground: false
      },
      {
        id: 'layer_temple_pyramids',
        name: 'Distant Pyramid Silhouettes',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80',
        speed: 0.30,
        opacity: 0.85,
        offsetY: 30,
        scale: 1.0,
        repeatX: true,
        isForeground: false
      },
      {
        id: 'layer_temple_ruins',
        name: 'Temple Facade & Jungle Moss',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80',
        speed: 0.65,
        opacity: 0.75,
        offsetY: 15,
        scale: 1.0,
        repeatX: true,
        isForeground: false
      }
    ]
  },
  {
    id: 'cyber_neon_skyline',
    name: 'Cyberpunk Neon Megacity',
    description: '4 layers: synthwave sunset, high-rise skyscrapers, holographic billboards, and neon haze',
    layers: [
      {
        id: 'layer_cyber_gradient',
        name: 'Synthwave Sky Gradient',
        url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&q=80',
        speed: 0.05,
        opacity: 0.95,
        offsetY: 0,
        scale: 1.0,
        repeatX: true,
        isForeground: false
      },
      {
        id: 'layer_cyber_towers',
        name: 'Distant Megatowers',
        url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600&q=80',
        speed: 0.22,
        opacity: 0.85,
        offsetY: 20,
        scale: 1.0,
        repeatX: true,
        isForeground: false
      },
      {
        id: 'layer_cyber_skyline',
        name: 'Neon Grid Skyline',
        url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1600&q=80',
        speed: 0.50,
        opacity: 0.80,
        offsetY: 10,
        scale: 1.0,
        repeatX: true,
        isForeground: false
      },
      {
        id: 'layer_cyber_fog',
        name: 'Foreground Cyan Light Fog',
        url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&q=80',
        speed: 1.20,
        opacity: 0.40,
        offsetY: -20,
        scale: 1.0,
        repeatX: true,
        isForeground: true
      }
    ]
  }
];

export default function ParallaxStudioModal({
  isOpen,
  onClose,
  initialLayers = [],
  onSaveLayers,
  currentBackgroundUrl = ''
}) {
  const [layers, setLayers] = useState([]);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
  const [scrubberVal, setScrubberVal] = useState(0);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [scrollSpeedMultiplier, setScrollSpeedMultiplier] = useState(1);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const fileInputRef = useRef(null);

  const camXRef = useRef(0);
  const isAutoScrollRef = useRef(isAutoScroll);
  const layersRef = useRef(layers);
  const scrollSpeedMultiplierRef = useRef(scrollSpeedMultiplier);

  useEffect(() => {
    isAutoScrollRef.current = isAutoScroll;
  }, [isAutoScroll]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    scrollSpeedMultiplierRef.current = scrollSpeedMultiplier;
  }, [scrollSpeedMultiplier]);

  // Initialize layers on open
  useEffect(() => {
    if (Array.isArray(initialLayers) && initialLayers.length > 0) {
      setLayers(initialLayers);
    } else if (currentBackgroundUrl) {
      // Create single layer from current level background
      setLayers([
        {
          id: 'layer_1',
          name: 'Primary Parallax Backdrop',
          url: currentBackgroundUrl,
          speed: 0.25,
          opacity: 1.0,
          offsetY: 0,
          scale: 1.0,
          repeatX: true,
          isForeground: false
        }
      ]);
    } else {
      // Default to Mayan / Jungle preset
      setLayers(PARALLAX_PRESETS[0].layers);
    }
    setSelectedLayerIndex(0);
  }, [isOpen, initialLayers, currentBackgroundUrl]);

  // Handle local file upload for a layer
  const handleFileUpload = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        setLayers(prev => {
          const next = [...prev];
          if (next[selectedLayerIndex]) {
            next[selectedLayerIndex] = {
              ...next[selectedLayerIndex],
              url: dataUrl,
              name: file.name.replace(/\.[^/.]+$/, '')
            };
          }
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddLayer = () => {
    const newLayer = {
      id: `layer_${Date.now()}`,
      name: `Parallax Layer ${layers.length + 1}`,
      url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=1600&q=80',
      speed: Math.min(1.2, 0.15 * (layers.length + 1)),
      opacity: 0.9,
      offsetY: 0,
      scale: 1.0,
      repeatX: true,
      isForeground: false
    };
    const next = [...layers, newLayer];
    setLayers(next);
    setSelectedLayerIndex(next.length - 1);
  };

  const handleRemoveLayer = (idx) => {
    if (layers.length <= 1) {
      alert('At least one background layer is required.');
      return;
    }
    const next = layers.filter((_, i) => i !== idx);
    setLayers(next);
    setSelectedLayerIndex(Math.max(0, idx - 1));
  };

  const handleMoveLayer = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= layers.length) return;
    const next = [...layers];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    setLayers(next);
    setSelectedLayerIndex(targetIdx);
  };

  const handleLoadPreset = (preset) => {
    setLayers(preset.layers);
    setSelectedLayerIndex(0);
  };

  // Live Canvas Render Loop
  useEffect(() => {
    if (!isOpen) return;

    let lastTime = performance.now();

    const render = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isAutoScrollRef.current) {
        camXRef.current = (camXRef.current + dt * 260 * scrollSpeedMultiplierRef.current) % 8000;
      }
      const curCamX = camXRef.current;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const cw = canvas.width;
          const ch = canvas.height;

          ctx.clearRect(0, 0, cw, ch);

          // Deep void backdrop
          ctx.fillStyle = '#060a12';
          ctx.fillRect(0, 0, cw, ch);

          const floorY = ch - 36;

          // 1. Render Background Parallax Layers (where !layer.isForeground)
          const curLayers = layersRef.current || [];
          curLayers.forEach(layer => {
            if (layer.isForeground) return;
            renderSingleLayer(ctx, layer, curCamX, cw, ch);
          });

          // 2. Render Mock Ground and Runner to provide real parallax depth context
          ctx.fillStyle = '#090e1a';
          ctx.fillRect(0, floorY, cw, 36);
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, floorY);
          ctx.lineTo(cw, floorY);
          ctx.stroke();

          // Mock runner cube
          const runnerX = cw * 0.28;
          const runnerSize = 28;
          const runnerY = floorY - runnerSize;
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(runnerX, runnerY, runnerSize, runnerSize);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(runnerX + 2, runnerY + 2, runnerSize - 4, runnerSize - 4);

          // 3. Render Foreground Parallax Layers (where layer.isForeground === true)
          curLayers.forEach(layer => {
            if (!layer.isForeground) return;
            renderSingleLayer(ctx, layer, curCamX, cw, ch);
          });
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen]);

  // Helper: render a single parallax layer onto canvas with tile repeat
  const renderSingleLayer = (ctx, layer, camX, width, height) => {
    if (!layer || !layer.url || layer.opacity <= 0) return;

    const img = getCachedCustomImage(layer.url);
    if (!img || img.naturalWidth === 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity ?? 1.0));

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const drawHeight = height * (layer.scale || 1.0);
    const drawWidth = Math.max(120, Math.round(drawHeight * imgAspect));
    const speed = typeof layer.speed === 'number' ? layer.speed : 0.25;
    const bgOffset = ((camX * speed) % drawWidth + drawWidth) % drawWidth;
    const posY = layer.offsetY || 0;

    if (layer.repeatX !== false) {
      for (let x = -bgOffset; x < width + drawWidth; x += drawWidth) {
        ctx.drawImage(img, x, posY, drawWidth, drawHeight);
      }
    } else {
      ctx.drawImage(img, -bgOffset, posY, drawWidth, drawHeight);
    }

    ctx.restore();
  };

  if (!isOpen) return null;

  const currentLayer = layers[selectedLayerIndex] || layers[0];

  const updateCurrentLayer = (patch) => {
    setLayers(prev => {
      const next = [...prev];
      if (next[selectedLayerIndex]) {
        next[selectedLayerIndex] = { ...next[selectedLayerIndex], ...patch };
      }
      return next;
    });
  };

  const handleSaveAndApply = () => {
    onSaveLayers(layers);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-neutral-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Parallax Layer Studio
              </h2>
              <p className="text-xs text-neutral-400">
                Compose multi-depth panoramic backgrounds & cinematic foreground atmosphere
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. Live Interactive Parallax Viewport */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <span>Interactive Depth Viewport</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  {layers.length} Layers Active
                </span>
              </span>

              {/* Viewport Playback & Scrubber Controls */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsAutoScroll(s => !s)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition cursor-pointer font-semibold ${
                    isAutoScroll
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                  }`}
                >
                  {isAutoScroll ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isAutoScroll ? 'Auto-Scrolling' : 'Paused (Scrubbing)'}</span>
                </button>

                <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800 text-neutral-400">
                  <span>Speed:</span>
                  {[0.5, 1, 2].map(spd => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setScrollSpeedMultiplier(spd)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        scrollSpeedMultiplier === spd ? 'bg-cyan-500 text-neutral-950' : 'hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={220}
                className="w-full h-56 object-cover"
              />

              {/* Interactive Camera Scrubber Bar */}
              <div className="px-4 py-2 bg-neutral-950/90 border-t border-neutral-800 flex items-center gap-3">
                <span className="text-[11px] font-mono text-neutral-400">Camera X:</span>
                <input
                  type="range"
                  min="0"
                  max="4000"
                  value={Math.round(scrubberVal % 4000)}
                  onChange={(e) => {
                    setIsAutoScroll(false);
                    const v = Number(e.target.value);
                    camXRef.current = v;
                    setScrubberVal(v);
                  }}
                  className="flex-1 accent-cyan-500 cursor-pointer"
                />
                <span className="text-[11px] font-mono text-cyan-400 w-16 text-right">
                  {Math.round(scrubberVal)}px
                </span>
              </div>
            </div>
          </div>

          {/* 2. Presets Ribbon */}
          <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              1-Click Parallax Depth Presets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PARALLAX_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleLoadPreset(preset)}
                  className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 hover:border-cyan-500/50 text-left transition flex flex-col gap-1 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {preset.layers.length} L
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 line-clamp-1">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Multi-Layer Management Stack & Layer Inspector */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left: Layer Stack Reorder & Select */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Layers Stack ({layers.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddLayer}
                  className="px-2.5 py-1 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-neutral-950 rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Layer</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {layers.map((layer, idx) => {
                  const isSelected = selectedLayerIndex === idx;
                  return (
                    <div
                      key={layer.id || idx}
                      onClick={() => setSelectedLayerIndex(idx)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-800 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                          : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden flex-shrink-0">
                          {layer.url ? (
                            <img src={layer.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-neutral-600 m-auto mt-3" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-xs font-bold text-white block truncate">
                            {layer.name}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                            <span>Speed: {layer.speed}x</span>
                            <span>•</span>
                            <span className={layer.isForeground ? 'text-amber-400 font-bold' : 'text-neutral-500'}>
                              {layer.isForeground ? 'Foreground' : 'Background'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Reorder & Remove Actions */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveLayer(idx, -1)}
                          className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move Layer Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === layers.length - 1}
                          onClick={() => handleMoveLayer(idx, 1)}
                          className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move Layer Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveLayer(idx)}
                          className="p-1 rounded text-neutral-400 hover:text-rose-400 cursor-pointer"
                          title="Delete Layer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Layer Properties Inspector */}
            {currentLayer ? (
              <div className="md:col-span-7 bg-neutral-950/60 border border-neutral-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Editing: {currentLayer.name}</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    Index #{selectedLayerIndex + 1}
                  </span>
                </div>

                {/* Layer Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                    Layer Name
                  </label>
                  <input
                    type="text"
                    value={currentLayer.name || ''}
                    onChange={(e) => updateCurrentLayer({ name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Image URL & Upload */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
                      Image Source URL
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload File
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <input
                    type="text"
                    value={currentLayer.url || ''}
                    onChange={(e) => updateCurrentLayer({ url: e.target.value })}
                    placeholder="https://... direct image URL or Data URL"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Speed Multiplier & Depth Preset Buttons */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-300">
                      Parallax Speed Factor: <strong className="text-cyan-400">{currentLayer.speed}x</strong>
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      (0.0 = static sky, 1.0 = player speed, 1.3+ = foreground blur)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={currentLayer.speed}
                    onChange={(e) => updateCurrentLayer({ speed: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {[
                      { label: 'Static Sky', spd: 0.05 },
                      { label: 'Far Mountains', spd: 0.2 },
                      { label: 'Mid Trees', spd: 0.5 },
                      { label: 'Near Terrain', spd: 0.8 },
                      { label: 'Foreground Blur', spd: 1.25 }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => updateCurrentLayer({ speed: p.spd })}
                        className={`px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 cursor-pointer ${
                          Math.abs(currentLayer.speed - p.spd) < 0.05 ? 'text-cyan-400 font-bold border-cyan-500' : 'text-neutral-400'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity & Vertical Offset */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">
                      Opacity: {Math.round((currentLayer.opacity ?? 1) * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={currentLayer.opacity ?? 1.0}
                      onChange={(e) => updateCurrentLayer({ opacity: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">
                      Vertical Offset: {currentLayer.offsetY || 0}px
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="5"
                      value={currentLayer.offsetY || 0}
                      onChange={(e) => updateCurrentLayer({ offsetY: parseInt(e.target.value) || 0 })}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Depth Plane & Tiling Toggles */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                  <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(currentLayer.isForeground)}
                      onChange={(e) => updateCurrentLayer({ isForeground: e.target.checked })}
                      className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Render in Foreground (In Front of Player)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentLayer.repeatX !== false}
                      onChange={(e) => updateCurrentLayer({ repeatX: e.target.checked })}
                      className="rounded border-neutral-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Seamless Tiling (Repeat X)</span>
                  </label>
                </div>

              </div>
            ) : (
              <div className="md:col-span-7 flex items-center justify-center text-xs text-neutral-500">
                Select a layer to edit properties
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/70">
          <span className="text-xs text-neutral-400">
            {layers.length} Parallax Layers configured • Changes apply to Editor and Gameplay
          </span>
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
              onClick={handleSaveAndApply}
              className="px-5 py-2 text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-neutral-950 rounded-xl shadow-lg hover:shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Parallax Layers</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
