/**
 * Dedicated Properties Inspector Panel (Vanilla JS / React).
 * Displays inspected object attributes, coordinate controls, layer selection,
 * rotation adjustments, blueprint references, and quick deletion.
 */

import React from 'react';
import {
  Sliders,
  Trash2,
  RotateCw,
  Layers,
  MapPin,
  Tag,
  Crosshair,
  Sparkles,
  Info,
  X
} from 'lucide-react';

export default function EditorPropertiesPanel({
  selectedObject,
  onUpdateObject,
  onDeleteObject,
  onClose,
  levelLength = 120,
  customBlueprints = []
}) {
  if (!selectedObject) {
    return (
      <aside className="w-64 bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0 select-none text-neutral-400">
        <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Properties</span>
          </div>
        </div>
        <div className="p-6 text-center flex flex-col items-center justify-center flex-1">
          <Crosshair className="w-8 h-8 text-neutral-600 mb-2 stroke-[1.5]" />
          <p className="text-xs font-semibold text-neutral-300 mb-1">No Object Selected</p>
          <p className="text-[11px] text-neutral-500 leading-relaxed max-w-[180px]">
            Use the <strong className="text-cyan-400">Select Tool [V]</strong> from the left toolbar and click any object on the canvas to inspect and edit its properties.
          </p>
        </div>
      </aside>
    );
  }

  const isDeco = (typeof selectedObject.type === 'string' && selectedObject.type.startsWith('deco_')) || selectedObject.role === 'decor';
  const customBp = customBlueprints.find(b => b.id === selectedObject.type || b.id === selectedObject.customId) || selectedObject.customAsset;

  return (
    <aside className="w-64 bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0 select-none overflow-y-auto">
      {/* Panel Header */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
            Object Inspector
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          title="Close Inspector"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3.5 space-y-4 text-xs">
        {/* Type / Name Header */}
        <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
              {isDeco ? 'Visual Decor' : customBp ? 'Custom Blueprint' : 'Entity Type'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              {selectedObject.type}
            </span>
          </div>
          <div className="text-sm font-bold text-white truncate">
            {customBp?.name || selectedObject.label || selectedObject.type?.replace(/^(deco_|block_|hazard_|pad_|orb_|portal_)/, '').replace(/_/g, ' ') || 'Level Object'}
          </div>
          {customBp?.role && (
            <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Role: {customBp.role}
            </div>
          )}
        </div>

        {/* Coordinates (X, Y) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Grid Coordinates
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 flex items-center justify-between">
              <span className="text-neutral-500 font-mono font-bold">X</span>
              <input
                type="number"
                min={0}
                max={levelLength}
                value={selectedObject.x ?? 0}
                onChange={(e) => onUpdateObject({ ...selectedObject, x: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-14 bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 flex items-center justify-between">
              <span className="text-neutral-500 font-mono font-bold">Y</span>
              <input
                type="number"
                min={0}
                max={32}
                value={selectedObject.y ?? 0}
                onChange={(e) => onUpdateObject({ ...selectedObject, y: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-14 bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Visual Layer Depth (Behind vs In Front of Player) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Visual Layer Depth
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
            <button
              onClick={() => onUpdateObject({ ...selectedObject, layer: 'background', inFront: false })}
              className={`py-1.5 px-2 rounded-md font-semibold text-xs transition cursor-pointer ${
                selectedObject.layer !== 'foreground' && !selectedObject.inFront
                  ? 'bg-neutral-800 text-cyan-400 shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Behind Player
            </button>
            <button
              onClick={() => onUpdateObject({ ...selectedObject, layer: 'foreground', inFront: true })}
              className={`py-1.5 px-2 rounded-md font-semibold text-xs transition cursor-pointer ${
                selectedObject.layer === 'foreground' || selectedObject.inFront
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              In Front [FG]
            </button>
          </div>
        </div>

        {/* Orientation & Rotation */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-neutral-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" /> Rotation Angle
            </span>
            <span className="font-mono text-cyan-400">{selectedObject.rotation || 0}°</span>
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[0, 90, 180, 270].map(rot => (
              <button
                key={rot}
                onClick={() => onUpdateObject({ ...selectedObject, rotation: rot })}
                className={`py-1 rounded font-mono text-xs transition cursor-pointer border ${
                  (selectedObject.rotation || 0) === rot
                    ? 'bg-cyan-500 text-neutral-950 font-bold border-cyan-400'
                    : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                }`}
              >
                {rot}°
              </button>
            ))}
          </div>
        </div>

        {/* Finish Gate Span Full Toggle */}
        {selectedObject.type?.includes('finish_gate') && (
          <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200">Full Height Beam</span>
              <input
                type="checkbox"
                checked={Boolean(selectedObject.spanFull)}
                onChange={(e) => onUpdateObject({ ...selectedObject, spanFull: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-neutral-500">
              Extends the laser gate across the full ceiling-to-floor altitude.
            </p>
          </div>
        )}

        {/* Object Quick Actions */}
        <div className="pt-2 border-t border-neutral-800">
          <button
            onClick={() => onDeleteObject(selectedObject)}
            className="w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected Object</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
