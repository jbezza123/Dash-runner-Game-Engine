/**
 * Dedicated Left Toolbar for Level Editor (Vanilla JS / React).
 * Houses selection tool, placement tool, bulldozer, spawn beacon, and hand pan.
 * Clean vertical layout with tooltips and keyboard shortcut badges.
 */

import React from 'react';
import {
  MousePointer,
  PenTool,
  Eraser,
  MapPin,
  Hand,
  RotateCw,
  Layers,
  Sparkles
} from 'lucide-react';

export default function EditorToolbar({
  selectedTool,
  onSelectTool,
  selectedRotation,
  onRotate,
  activeLayer,
  onToggleLayer,
  startX,
  startY,
  hasSelection = false
}) {
  const tools = [
    {
      id: 'select',
      name: 'Select Tool',
      shortcut: 'V',
      icon: MousePointer,
      activeColor: 'bg-cyan-500 text-neutral-950 ring-cyan-400',
      tooltip: 'Select & inspect object properties on right panel [V]'
    },
    {
      id: 'place',
      name: 'Place Mode',
      shortcut: 'P',
      icon: PenTool,
      activeColor: 'bg-cyan-500 text-neutral-950 ring-cyan-400',
      tooltip: 'Place chosen tile or decor [P]'
    },
    {
      id: 'erase',
      name: 'Bulldozer',
      shortcut: 'B',
      icon: Eraser,
      activeColor: 'bg-rose-500 text-white ring-rose-400',
      tooltip: 'Bulldozer / Erase objects [B or X]'
    },
    {
      id: 'start',
      name: 'Spawn Beacon',
      shortcut: 'S',
      icon: MapPin,
      activeColor: 'bg-emerald-500 text-neutral-950 ring-emerald-400',
      tooltip: 'Set Player Start Spawn [S]'
    },
    {
      id: 'pan',
      name: 'Hand Tool',
      shortcut: 'H',
      icon: Hand,
      activeColor: 'bg-amber-500 text-neutral-950 ring-amber-400',
      tooltip: 'Grab & Pan viewport [H or Space]'
    }
  ];

  return (
    <aside className="w-14 bg-neutral-900 border-r border-neutral-800 flex flex-col items-center py-3 justify-between shrink-0 select-none z-10">
      {/* Tool Buttons */}
      <div className="flex flex-col items-center gap-2 w-full px-2">
        <div className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider mb-1">
          Tools
        </div>

        {tools.map(tool => {
          const Icon = tool.icon;
          const isActive = selectedTool === tool.id;

          return (
            <button
              key={tool.id}
              id={`left-tool-${tool.id}`}
              onClick={() => onSelectTool(tool.id)}
              className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center relative transition group cursor-pointer border ${
                isActive
                  ? `${tool.activeColor} border-white/20 shadow-md ring-1`
                  : 'bg-neutral-800/80 border-neutral-700/80 text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
              title={tool.tooltip}
            >
              <Icon className="w-4 h-4" />
              <span className={`text-[8px] font-mono leading-none mt-0.5 ${isActive ? 'font-bold' : 'text-neutral-500 group-hover:text-neutral-300'}`}>
                {tool.shortcut}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary Quick Toggles: Quick Rotation & Quick Layer Depth */}
      <div className="flex flex-col items-center gap-2 w-full px-2 pt-3 border-t border-neutral-800">
        <div className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider text-center">
          Edit
        </div>

        {/* Quick Rotation */}
        <button
          id="left-tool-rotate"
          onClick={onRotate}
          className="w-10 h-10 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 flex flex-col items-center justify-center transition cursor-pointer text-neutral-300 hover:text-white group"
          title="Rotate Item [R] (0°, 90°, 180°, 270°)"
        >
          <RotateCw className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform" />
          <span className="text-[8px] font-mono text-neutral-400 mt-0.5">{selectedRotation}°</span>
        </button>

        {/* Quick Layer Depth Toggle (Behind vs In Front of Player) */}
        <button
          id="left-tool-layer"
          onClick={onToggleLayer}
          className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer ${
            activeLayer === 'foreground'
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-white'
          }`}
          title={`Placement Depth [L]: ${activeLayer === 'foreground' ? 'In Front of Player (FG)' : 'Behind Player (BG)'}`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[8px] font-mono font-bold mt-0.5">
            {activeLayer === 'foreground' ? 'FG' : 'BG'}
          </span>
        </button>
      </div>
    </aside>
  );
}
