/**
 * Character Skin Customizer Component (Vanilla JS / React).
 * Features live animated preview (Idle, Run, Jump, Fly), archetype selection,
 * accessories, color pickers, trails, death FX, and preset loading.
 */

import { useState, useEffect, useRef } from 'react';
import {
  CHARACTER_ARCHETYPES,
  VEHICLE_ARCHETYPES,
  ACCESSORIES,
  TRAILS,
  DEATH_EFFECTS,
  PRESET_SKINS,
  VEHICLE_PRESETS
} from '../constants/gameDefaults.js';
import { drawCharacter, drawTrail, isVehicleArchetype } from '../engine/characterRenderer.js';
import { safeSetItem, STORAGE_KEYS } from '../utils/storage.js';
import { getSavedBlueprints } from '../utils/customAssetsManager.js';
import { Sparkles, Palette, Crown, Flame, RotateCcw, Check, Play, Shield, Rocket, Upload, Image as ImageIcon, Crosshair, Plus, Trash2 } from 'lucide-react';

export default function SkinCustomizer({ currentSkin, onSaveSkin, onClose }) {
  const [skin, setSkin] = useState({ ...currentSkin });
  const [previewMode, setPreviewMode] = useState('run'); // 'idle', 'run', 'jump', 'fly'
  const [activeTab, setActiveTab] = useState('archetype');
  const [saveToast, setSaveToast] = useState(false);
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Mock player entity for the live preview canvas
  const playerPreviewRef = useRef({
    x: 100,
    y: 80,
    width: 44,
    height: 52,
    vx: 300,
    vy: 0,
    isGrounded: true,
    rotation: 0,
    gravityDir: 1,
    mode: 'runner',
    animDistance: 0
  });

  const trailHistoryRef = useRef([]);

  // Animate the live preview canvas
  useEffect(() => {
    let lastTime = performance.now();

    const renderLoop = (timeNow) => {
      const dt = Math.min(0.033, (timeNow - lastTime) / 1000);
      lastTime = timeNow;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const p = playerPreviewRef.current;

      // Update simulation based on preview mode
      if (previewMode === 'run') {
        p.isGrounded = true;
        p.mode = 'runner';
        p.animDistance += 360 * dt;
        p.rotation = 0;
        p.vy = 0;
      } else if (previewMode === 'jump') {
        p.isGrounded = false;
        p.mode = 'runner';
        p.rotation += 6 * dt;
        p.animDistance += 200 * dt;
      } else if (previewMode === 'fly') {
        p.isGrounded = false;
        p.mode = 'fly';
        p.rotation = 0;
        p.animDistance += 400 * dt;
        p.vy = Math.sin(timeNow * 0.005) * 80;
      } else {
        // Idle
        p.isGrounded = true;
        p.mode = 'runner';
        p.animDistance = 0;
        p.rotation = 0;
        p.vy = 0;
      }

      // Record trail history
      trailHistoryRef.current.push({ x: p.x - 12, y: p.y });
      if (trailHistoryRef.current.length > 8) {
        trailHistoryRef.current.shift();
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background preview grid
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Floor line
      ctx.strokeStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 134);
      ctx.lineTo(canvas.width, 134);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw trail and character
      drawTrail(ctx, trailHistoryRef.current, skin);
      drawCharacter(ctx, p, skin, timeNow);

      // Draw custom hit border preview overlay if active or enabled
      if (skin.hitbox?.type === 'polygon' && Array.isArray(skin.hitbox.points) && skin.hitbox.points.length >= 3) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        const hw = p.width / 2;
        const hh = p.height / 2;
        ctx.strokeStyle = '#ef4444';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        skin.hitbox.points.forEach((pt, idx) => {
          const px = -hw + pt.x * p.width;
          const py = -hh + pt.y * p.height;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw vertex control dots
        ctx.fillStyle = '#facc15';
        skin.hitbox.points.forEach((pt) => {
          const px = -hw + pt.x * p.width;
          const py = -hh + pt.y * p.height;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [skin, previewMode]);

  const [customBlueprints, setCustomBlueprints] = useState([]);

  useEffect(() => {
    try {
      const bps = getSavedBlueprints();
      setCustomBlueprints(Array.isArray(bps) ? bps : []);
    } catch (e) {
      console.warn('Could not load custom blueprints for skin customizer:', e);
    }
  }, []);

  const handleUpdateField = (field, value) => {
    setSkin(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLoadPreset = (preset) => {
    if (!preset) return;
    setSkin({
      archetype: preset.archetype,
      category: preset.category || 'runner',
      isVehicle: Boolean(preset.category === 'vehicle' || isVehicleArchetype(preset.archetype)),
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      glowColor: preset.glowColor,
      eyeColor: preset.eyeColor,
      accessory: preset.accessory || 'none',
      trail: preset.trail,
      deathEffect: preset.deathEffect,
      customImageUrl: preset.customImageUrl || '',
      customScale: preset.customScale || 1
    });
  };

  const handleSave = () => {
    try {
      safeSetItem(STORAGE_KEYS.SKIN, skin);
      if (typeof onSaveSkin === 'function') {
        onSaveSkin(skin);
      }
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    } catch (err) {
      console.error('Error saving skin:', err);
    }
  };

  return (
    <div id="skin-customizer-modal" className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display tracking-wide text-white">Character Skin Workshop</h2>
              <p className="text-xs text-neutral-400">Customize your runner silhouette, palette, headgear, and particle trails</p>
            </div>
          </div>
          <button
            id="close-skin-customizer"
            onClick={onClose}
            className="text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg text-sm bg-neutral-800 hover:bg-neutral-700 transition"
          >
            Close
          </button>
        </div>

        {/* Content Body: Preview on Left, Controls on Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          
          {/* Left: Live Stage Preview */}
          <div className="md:col-span-5 p-6 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-col items-center justify-between bg-neutral-950/50">
            <div className="w-full flex flex-col items-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                <Play className="w-3.5 h-3.5" /> Live Animation Stage
              </div>

              {/* Canvas viewport */}
              <div className="w-full max-w-[280px] aspect-[4/3] rounded-xl overflow-hidden border border-cyan-500/40 shadow-lg shadow-cyan-950/40 bg-neutral-950 relative">
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={180}
                  className="w-full h-full block"
                />
              </div>

              {/* Animation State Toggles */}
              <div className="mt-4 flex gap-1.5 p-1 bg-neutral-800/80 rounded-lg border border-neutral-700">
                {[
                  { id: 'idle', label: 'Idle' },
                  { id: 'run', label: 'Run' },
                  { id: 'jump', label: 'Jump Spin' },
                  { id: 'fly', label: 'Flight' },
                ].map(m => (
                  <button
                    key={m.id}
                    id={`preview-mode-${m.id}`}
                    onClick={() => setPreviewMode(m.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                      previewMode === m.id
                        ? 'bg-cyan-500 text-neutral-950 font-bold shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets Quick Strip */}
            <div className="w-full mt-6">
              <div className="text-xs font-medium text-neutral-400 mb-2">Curated Runner Presets:</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {PRESET_SKINS.map(preset => (
                  <button
                    key={preset.name}
                    id={`preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => handleLoadPreset(preset)}
                    className="px-2.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700 text-left transition flex items-center gap-2 group cursor-pointer"
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0"
                      style={{ backgroundColor: preset.primaryColor }}
                    />
                    <span className="text-xs font-medium text-neutral-200 group-hover:text-white truncate">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>

              <div className="text-xs font-medium text-neutral-400 mb-2 flex items-center gap-1.5">
                <Rocket className="w-3 h-3 text-cyan-400" /> Vehicle Presets:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    id={`preset-veh-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => handleLoadPreset(preset)}
                    className="px-2.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700 text-left transition flex items-center gap-2 group cursor-pointer"
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0"
                      style={{ backgroundColor: preset.primaryColor }}
                    />
                    <span className="text-xs font-medium text-neutral-200 group-hover:text-white truncate">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Customization Controls */}
          <div className="md:col-span-7 flex flex-col h-full overflow-hidden bg-neutral-900/60">
            {/* Category Tabs */}
            <div className="flex border-b border-neutral-800 px-4 pt-3 gap-2 overflow-x-auto">
              {[
                { id: 'archetype', label: 'Runner', icon: Shield },
                { id: 'vehicles', label: 'Vehicles', icon: Rocket },
                { id: 'custom', label: 'Custom Asset', icon: ImageIcon },
                { id: 'hitbox', label: 'Hit Borders', icon: Crosshair },
                { id: 'colors', label: 'Colors', icon: Palette },
                { id: 'accessories', label: 'Headgear', icon: Crown },
                { id: 'fx', label: 'Trails & FX', icon: Flame },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap cursor-pointer ${
                      activeTab === tab.id
                        ? 'border-cyan-400 text-cyan-400 bg-neutral-800/60'
                        : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-800/30'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              {/* TAB: ARCHETYPE (RUNNERS) */}
              {activeTab === 'archetype' && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-neutral-300">Choose Character Frame</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {CHARACTER_ARCHETYPES.map(arch => (
                      <button
                        key={arch.id}
                        id={`arch-btn-${arch.id}`}
                        onClick={() => {
                          handleUpdateField('archetype', arch.id);
                          handleUpdateField('category', 'runner');
                          handleUpdateField('isVehicle', false);
                          handleUpdateField('customImageUrl', '');
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          skin.archetype === arch.id && !skin.isVehicle
                            ? 'border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400'
                            : 'border-neutral-800 bg-neutral-800/40 hover:bg-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="font-bold text-sm text-white">{arch.name}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">{arch.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: VEHICLES */}
              {activeTab === 'vehicles' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-300">Select Vehicle Chassis</span>
                    <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">
                      Spaceships • Cars • Trucks • Subs • Mechs
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {VEHICLE_ARCHETYPES.filter(v => v.id !== 'custom_asset').map(veh => (
                      <button
                        key={veh.id}
                        id={`veh-btn-${veh.id}`}
                        onClick={() => {
                          handleUpdateField('archetype', veh.id);
                          handleUpdateField('category', 'vehicle');
                          handleUpdateField('isVehicle', true);
                          handleUpdateField('customImageUrl', '');
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          skin.archetype === veh.id
                            ? 'border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400 shadow-md'
                            : 'border-neutral-800 bg-neutral-800/40 hover:bg-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">{veh.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-cyan-300 capitalize font-mono">
                            {veh.category}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400 mt-1 leading-snug">{veh.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: CUSTOM IMPORTED ASSETS */}
              {activeTab === 'custom' && (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-neutral-300">Equip Custom Asset or Blueprint</div>
                  <p className="text-xs text-neutral-400">
                    Use any custom sprite or blueprint saved in the Asset Browser as your character skin!
                  </p>

                  {customBlueprints.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-neutral-700 text-center bg-neutral-950/40">
                      <ImageIcon className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                      <div className="text-xs text-neutral-300 font-semibold mb-1">No Custom Blueprints Found</div>
                      <div className="text-[11px] text-neutral-500">
                        Open the Asset Browser in the level editor to import sprites, blueprints, or unpack ZIP packages.
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {customBlueprints.map(bp => (
                        <button
                          key={bp.id}
                          onClick={() => {
                            handleUpdateField('archetype', 'custom_asset');
                            handleUpdateField('category', 'vehicle');
                            handleUpdateField('isVehicle', true);
                            handleUpdateField('customImageUrl', bp.imageUrl || (bp.frames && bp.frames[0]) || '');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col items-center gap-2 cursor-pointer ${
                            skin.archetype === 'custom_asset' && skin.customImageUrl === (bp.imageUrl || (bp.frames && bp.frames[0]))
                              ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400 shadow'
                              : 'border-neutral-800 bg-neutral-800/40 hover:bg-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-lg bg-neutral-950/80 border border-neutral-800 flex items-center justify-center overflow-hidden">
                            {(bp.imageUrl || (bp.frames && bp.frames[0])) ? (
                              <img
                                src={bp.imageUrl || (bp.frames && bp.frames[0])}
                                alt={bp.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-neutral-600" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-white truncate max-w-full text-center">
                            {bp.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Manual Image URL Input */}
                  <div className="pt-2 border-t border-neutral-800 space-y-2">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                      Direct Sprite Image URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={skin.customImageUrl || ''}
                        onChange={(e) => {
                          handleUpdateField('customImageUrl', e.target.value);
                          if (e.target.value) {
                            handleUpdateField('archetype', 'custom_asset');
                            handleUpdateField('category', 'vehicle');
                            handleUpdateField('isVehicle', true);
                          }
                        }}
                        placeholder="https://... or data:image/..."
                        className="flex-1 px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                      {skin.customImageUrl && (
                        <button
                          onClick={() => handleUpdateField('customImageUrl', '')}
                          className="px-3 py-2 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: HIT BORDERS (HITBOX MODIFIER) */}
              {activeTab === 'hitbox' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-300">Custom Hit Borders (Polygon Hitbox)</div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Add, move, and customize vertex points to precisely shape the collision border for your character or vehicle.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const pts = skin.hitbox?.points || [
                            { x: 0.1, y: 0.1 },
                            { x: 0.9, y: 0.1 },
                            { x: 0.9, y: 0.9 },
                            { x: 0.1, y: 0.9 }
                          ];
                          // Add mid point of first edge
                          const newPts = [...pts, { x: 0.5, y: 0.95 }];
                          handleUpdateField('hitbox', { type: 'polygon', points: newPts });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Point
                      </button>
                      <button
                        onClick={() => {
                          // Spaceship / Vehicle wedge preset
                          handleUpdateField('hitbox', {
                            type: 'polygon',
                            points: [
                              { x: 0.95, y: 0.5 },
                              { x: 0.1, y: 0.9 },
                              { x: 0.25, y: 0.5 },
                              { x: 0.1, y: 0.1 }
                            ]
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 text-xs font-medium transition cursor-pointer"
                        title="Streamlined arrowhead / spaceship wedge"
                      >
                        Wedge ✈
                      </button>
                      <button
                        onClick={() => {
                          handleUpdateField('hitbox', {
                            type: 'polygon',
                            points: [
                              { x: 0.1, y: 0.1 },
                              { x: 0.9, y: 0.1 },
                              { x: 0.9, y: 0.9 },
                              { x: 0.1, y: 0.9 }
                            ]
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition cursor-pointer"
                      >
                        Reset Box
                      </button>
                    </div>
                  </div>

                  {/* Hitbox Points List / Adjuster */}
                  <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-3">
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Vertices ({skin.hitbox?.points?.length || 4} points)</span>
                      <span className="text-[11px] text-amber-400/90 font-mono">Normalized (0.00 - 1.00)</span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {(skin.hitbox?.points || [
                        { x: 0.1, y: 0.1 },
                        { x: 0.9, y: 0.1 },
                        { x: 0.9, y: 0.9 },
                        { x: 0.1, y: 0.9 }
                      ]).map((pt, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
                          <span className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                            P{index + 1}
                          </span>
                          
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-neutral-500 font-mono text-[11px]">X:</span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={pt.x}
                              onChange={(e) => {
                                const newPts = [...(skin.hitbox?.points || [
                                  { x: 0.1, y: 0.1 },
                                  { x: 0.9, y: 0.1 },
                                  { x: 0.9, y: 0.9 },
                                  { x: 0.1, y: 0.9 }
                                ])];
                                newPts[index] = { ...newPts[index], x: parseFloat(e.target.value) };
                                handleUpdateField('hitbox', { type: 'polygon', points: newPts });
                              }}
                              className="flex-1 accent-cyan-400 cursor-pointer"
                            />
                            <span className="font-mono text-neutral-300 w-10 text-right">{Number(pt.x).toFixed(2)}</span>
                          </div>

                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-neutral-500 font-mono text-[11px]">Y:</span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={pt.y}
                              onChange={(e) => {
                                const newPts = [...(skin.hitbox?.points || [
                                  { x: 0.1, y: 0.1 },
                                  { x: 0.9, y: 0.1 },
                                  { x: 0.9, y: 0.9 },
                                  { x: 0.1, y: 0.9 }
                                ])];
                                newPts[index] = { ...newPts[index], y: parseFloat(e.target.value) };
                                handleUpdateField('hitbox', { type: 'polygon', points: newPts });
                              }}
                              className="flex-1 accent-cyan-400 cursor-pointer"
                            />
                            <span className="font-mono text-neutral-300 w-10 text-right">{Number(pt.y).toFixed(2)}</span>
                          </div>

                          {(skin.hitbox?.points || []).length > 3 && (
                            <button
                              onClick={() => {
                                const newPts = skin.hitbox.points.filter((_, i) => i !== index);
                                handleUpdateField('hitbox', { type: 'polygon', points: newPts });
                              }}
                              className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition cursor-pointer"
                              title="Delete point"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: COLORS */}
              {activeTab === 'colors' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Primary Color */}
                    <div className="p-3.5 rounded-xl bg-neutral-800/40 border border-neutral-800 space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">
                        Primary Armor
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          id="color-primary"
                          value={skin.primaryColor}
                          onChange={(e) => handleUpdateField('primaryColor', e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="font-mono text-xs uppercase text-neutral-300">{skin.primaryColor}</span>
                      </div>
                    </div>

                    {/* Secondary Accent */}
                    <div className="p-3.5 rounded-xl bg-neutral-800/40 border border-neutral-800 space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">
                        Secondary Accent
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          id="color-secondary"
                          value={skin.secondaryColor}
                          onChange={(e) => handleUpdateField('secondaryColor', e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="font-mono text-xs uppercase text-neutral-300">{skin.secondaryColor}</span>
                      </div>
                    </div>

                    {/* Glow / Aura */}
                    <div className="p-3.5 rounded-xl bg-neutral-800/40 border border-neutral-800 space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">
                        Neon Core & Glow
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          id="color-glow"
                          value={skin.glowColor}
                          onChange={(e) => handleUpdateField('glowColor', e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="font-mono text-xs uppercase text-neutral-300">{skin.glowColor}</span>
                      </div>
                    </div>

                    {/* Eye / Optic */}
                    <div className="p-3.5 rounded-xl bg-neutral-800/40 border border-neutral-800 space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">
                        Optic Visor / Eyes
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          id="color-eyes"
                          value={skin.eyeColor}
                          onChange={(e) => handleUpdateField('eyeColor', e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="font-mono text-xs uppercase text-neutral-300">{skin.eyeColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ACCESSORIES */}
              {activeTab === 'accessories' && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-neutral-300">Select Headgear & Helmets</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {ACCESSORIES.map(acc => (
                      <button
                        key={acc.id}
                        id={`accessory-${acc.id}`}
                        onClick={() => handleUpdateField('accessory', acc.id)}
                        className={`p-3 rounded-xl border text-center font-medium text-xs transition ${
                          skin.accessory === acc.id
                            ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 font-bold ring-1 ring-cyan-400'
                            : 'border-neutral-800 bg-neutral-800/40 text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        {acc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: TRAILS & FX */}
              {activeTab === 'fx' && (
                <div className="space-y-6">
                  {/* Trail Type */}
                  <div>
                    <div className="text-sm font-medium text-neutral-300 mb-2.5">Speed Trail Effect</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {TRAILS.map(t => (
                        <button
                          key={t.id}
                          id={`trail-${t.id}`}
                          onClick={() => handleUpdateField('trail', t.id)}
                          className={`p-3 rounded-xl border text-left transition ${
                            skin.trail === t.id
                              ? 'border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400'
                              : 'border-neutral-800 bg-neutral-800/40 hover:bg-neutral-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                            <span className="text-xs font-bold text-white">{t.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Death Animation */}
                  <div>
                    <div className="text-sm font-medium text-neutral-300 mb-2.5">Death Explosion Particle</div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {DEATH_EFFECTS.map(dfx => (
                        <button
                          key={dfx.id}
                          id={`death-fx-${dfx.id}`}
                          onClick={() => handleUpdateField('deathEffect', dfx.id)}
                          className={`p-3 rounded-xl border text-left font-medium text-xs transition ${
                            skin.deathEffect === dfx.id
                              ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 font-bold ring-1 ring-cyan-400'
                              : 'border-neutral-800 bg-neutral-800/40 text-neutral-300 hover:bg-neutral-800'
                          }`}
                        >
                          {dfx.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Action Bar */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between">
              <button
                id="reset-skin-defaults"
                onClick={() => setSkin({ ...currentSkin })}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>

              <div className="flex items-center gap-3">
                {saveToast && (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-fade-in">
                    <Check className="w-3.5 h-3.5" /> Skin Saved!
                  </span>
                )}
                <button
                  id="save-equipped-skin"
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer"
                >
                  Equip & Save Skin
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
