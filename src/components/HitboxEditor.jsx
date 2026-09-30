/**
 * Interactive Hitbox & Hit Border Polygon Editor (Vanilla JS / React).
 * Allows users to add, drag, nudge, delete, and test custom polygon vertices
 * for custom blueprints, obstacles, items, characters, and vehicles.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  RotateCcw,
  Maximize2,
  Crosshair,
  Grid,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  Check,
  HelpCircle
} from 'lucide-react';
import { pointInPolygon } from '../engine/polygonCollision.js';

// Pre-packaged boundary shape presets (normalized 0.0 to 1.0)
export const HITBOX_PRESETS = [
  {
    id: 'box',
    name: 'Full Box (4-pt)',
    desc: 'Standard square bounding perimeter',
    points: [
      { x: 0.05, y: 0.05 },
      { x: 0.95, y: 0.05 },
      { x: 0.95, y: 0.95 },
      { x: 0.05, y: 0.95 }
    ]
  },
  {
    id: 'spike',
    name: 'Spike / Arrow (3-pt)',
    desc: 'Sharp triangular top point for spikes & roofs',
    points: [
      { x: 0.5, y: 0.08 },
      { x: 0.92, y: 0.92 },
      { x: 0.08, y: 0.92 }
    ]
  },
  {
    id: 'diamond',
    name: 'Diamond (4-pt)',
    desc: 'Angled diamond for gems and rotating hazard orbs',
    points: [
      { x: 0.5, y: 0.05 },
      { x: 0.95, y: 0.5 },
      { x: 0.5, y: 0.95 },
      { x: 0.05, y: 0.5 }
    ]
  },
  {
    id: 'spaceship',
    name: 'Starfighter / Jet (6-pt)',
    desc: 'Forward nosecone with swept wingtips & tail',
    points: [
      { x: 0.95, y: 0.5 },
      { x: 0.15, y: 0.08 },
      { x: 0.28, y: 0.35 },
      { x: 0.05, y: 0.5 },
      { x: 0.28, y: 0.65 },
      { x: 0.15, y: 0.92 }
    ]
  },
  {
    id: 'car',
    name: 'Vehicle / Car (8-pt)',
    desc: 'Aerodynamic bumper, windshield slope, and spoiler profile',
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
  },
  {
    id: 'truck',
    name: 'Armored Truck (6-pt)',
    desc: 'High cab, front battering bumper, and cargo bay',
    points: [
      { x: 0.06, y: 0.25 },
      { x: 0.75, y: 0.25 },
      { x: 0.95, y: 0.45 },
      { x: 0.95, y: 0.88 },
      { x: 0.06, y: 0.88 },
      { x: 0.06, y: 0.45 }
    ]
  },
  {
    id: 'octagon',
    name: 'Octagon / Circle (8-pt)',
    desc: 'Beveled 8-sided disc for saws and round projectiles',
    points: [
      { x: 0.3, y: 0.08 },
      { x: 0.7, y: 0.08 },
      { x: 0.92, y: 0.3 },
      { x: 0.92, y: 0.7 },
      { x: 0.7, y: 0.92 },
      { x: 0.3, y: 0.92 },
      { x: 0.08, y: 0.7 },
      { x: 0.08, y: 0.3 }
    ]
  }
];

export default function HitboxEditor({
  hitbox = null,
  onChange,
  imageUrl = '',
  renderEntity = null,
  accentColor = '#06b6d4',
  entityName = 'Object'
}) {
  // Ensure we have a valid initial points array
  const getInitialPoints = () => {
    if (hitbox && Array.isArray(hitbox.points) && hitbox.points.length >= 3) {
      return hitbox.points.map(pt => ({
        x: Math.max(0, Math.min(1, Number(pt.x) || 0)),
        y: Math.max(0, Math.min(1, Number(pt.y) || 0))
      }));
    }
    return HITBOX_PRESETS[0].points;
  };

  const [points, setPoints] = useState(getInitialPoints);
  const [selectedVertexIdx, setSelectedVertexIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [gridSnap, setGridSnap] = useState(0.05); // 5% snap, 0 = freeform
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [testPoint, setTestPoint] = useState(null);
  const [isTestInside, setIsTestInside] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Sync when incoming hitbox prop changes externally
  useEffect(() => {
    if (hitbox && Array.isArray(hitbox.points) && hitbox.points.length >= 3) {
      const sanitized = hitbox.points.map(pt => ({
        x: Math.max(0, Math.min(1, Number(pt.x) || 0)),
        y: Math.max(0, Math.min(1, Number(pt.y) || 0))
      }));
      setPoints(sanitized);
    }
  }, [hitbox]);

  // Load preview image
  useEffect(() => {
    if (!imageUrl) {
      imgRef.current = null;
      setImgLoaded(false);
      return;
    }
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imgRef.current = img;
        setImgLoaded(true);
      };
      img.onerror = () => {
        imgRef.current = null;
        setImgLoaded(false);
      };
      img.src = imageUrl;
    } catch (err) {
      console.warn('HitboxEditor image load error:', err);
    }
  }, [imageUrl]);

  // Propagate changes to parent
  const emitChange = useCallback((newPoints) => {
    if (!Array.isArray(newPoints) || newPoints.length < 3) return;
    if (typeof onChange === 'function') {
      onChange({
        type: 'polygon',
        points: newPoints
      });
    }
  }, [onChange]);

  // Snap helper
  const snapVal = (val) => {
    if (!gridSnap || gridSnap <= 0) return Math.max(0, Math.min(1, val));
    const rounded = Math.round(val / gridSnap) * gridSnap;
    return Math.max(0, Math.min(1, Math.round(rounded * 1000) / 1000));
  };

  // Distance from point to line segment
  const distToSegment = (px, py, x1, y1, x2, y2) => {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  // Convert canvas mouse coordinates to normalized (0..1)
  const getNormCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const px = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const py = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    return {
      x: px / rect.width,
      y: py / rect.height
    };
  };

  // Mouse Down: select vertex or start dragging
  const handlePointerDown = (e) => {
    e.preventDefault();
    const { x, y } = getNormCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width;
    const ch = canvas.height;

    // Check vertex hit (radius ~14px)
    const hitRadiusNorm = 16 / Math.min(cw, ch);
    let foundIdx = -1;
    let minDist = Infinity;

    for (let i = 0; i < points.length; i++) {
      const d = Math.hypot(points[i].x - x, points[i].y - y);
      if (d < hitRadiusNorm && d < minDist) {
        minDist = d;
        foundIdx = i;
      }
    }

    if (foundIdx >= 0) {
      setSelectedVertexIdx(foundIdx);
      setDraggedIdx(foundIdx);
      setIsDragging(true);
      return;
    }

    // Check if clicked on an edge to insert a vertex
    const edgeHitDist = 12 / Math.min(cw, ch);
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const d = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
      if (d < edgeHitDist) {
        // Insert vertex at this spot!
        const newPt = { x: snapVal(x), y: snapVal(y) };
        const newPoints = [...points];
        newPoints.splice(i + 1, 0, newPt);
        setPoints(newPoints);
        setSelectedVertexIdx(i + 1);
        setDraggedIdx(i + 1);
        setIsDragging(true);
        emitChange(newPoints);
        return;
      }
    }
  };

  // Mouse Move: drag vertex or hover edge / test collision
  const handlePointerMove = (e) => {
    const { x, y } = getNormCoords(e);
    setTestPoint({ x, y });

    // Live collision test
    const inside = pointInPolygon(x, y, points);
    setIsTestInside(inside);

    if (isDragging && draggedIdx !== null && draggedIdx < points.length) {
      const updated = points.map((pt, idx) => {
        if (idx === draggedIdx) {
          return {
            x: snapVal(x),
            y: snapVal(y)
          };
        }
        return pt;
      });
      setPoints(updated);
      emitChange(updated);
      return;
    }

    // Hover edge detection
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const edgeHitDist = 12 / Math.min(cw, ch);
    let edgeFound = null;

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const d = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
      if (d < edgeHitDist) {
        edgeFound = i;
        break;
      }
    }
    setHoveredEdge(edgeFound);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDraggedIdx(null);
  };

  // Add Vertex Action (splits edge after selected vertex)
  const handleAddVertex = () => {
    if (points.length >= 24) return; // limit to 24 vertices for sanity
    const idx = selectedVertexIdx >= 0 && selectedVertexIdx < points.length ? selectedVertexIdx : points.length - 1;
    const nextIdx = (idx + 1) % points.length;
    const p1 = points[idx];
    const p2 = points[nextIdx];

    const midPoint = {
      x: snapVal((p1.x + p2.x) / 2),
      y: snapVal((p1.y + p2.y) / 2)
    };

    const newPoints = [...points];
    newPoints.splice(idx + 1, 0, midPoint);
    setPoints(newPoints);
    setSelectedVertexIdx(idx + 1);
    emitChange(newPoints);
  };

  // Delete Vertex Action
  const handleDeleteVertex = () => {
    if (points.length <= 3) return; // Min 3 vertices for polygon
    const newPoints = points.filter((_, idx) => idx !== selectedVertexIdx);
    setPoints(newPoints);
    setSelectedVertexIdx(Math.max(0, selectedVertexIdx - 1));
    emitChange(newPoints);
  };

  // Nudge selected vertex with arrow buttons
  const handleNudge = (dx, dy) => {
    if (selectedVertexIdx < 0 || selectedVertexIdx >= points.length) return;
    const step = gridSnap > 0 ? gridSnap : 0.02;
    const newPoints = points.map((pt, idx) => {
      if (idx === selectedVertexIdx) {
        return {
          x: Math.max(0, Math.min(1, Math.round((pt.x + dx * step) * 1000) / 1000)),
          y: Math.max(0, Math.min(1, Math.round((pt.y + dy * step) * 1000) / 1000))
        };
      }
      return pt;
    });
    setPoints(newPoints);
    emitChange(newPoints);
  };

  // Load Preset
  const handleLoadPreset = (preset) => {
    if (!preset || !Array.isArray(preset.points)) return;
    const cloned = preset.points.map(pt => ({ ...pt }));
    setPoints(cloned);
    setSelectedVertexIdx(0);
    emitChange(cloned);
  };

  // Invert / Flip Horizontal
  const handleFlipHorizontal = () => {
    const flipped = points.map(pt => ({
      x: Math.round((1 - pt.x) * 1000) / 1000,
      y: pt.y
    }));
    setPoints(flipped);
    emitChange(flipped);
  };

  // Invert / Flip Vertical
  const handleFlipVertical = () => {
    const flipped = points.map(pt => ({
      x: pt.x,
      y: Math.round((1 - pt.y) * 1000) / 1000
    }));
    setPoints(flipped);
    emitChange(flipped);
  };

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    // 1. Transparency Checkerboard Pattern
    const checkSize = 14;
    for (let x = 0; x < cw; x += checkSize) {
      for (let y = 0; y < ch; y += checkSize) {
        const isEven = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
        ctx.fillStyle = isEven ? '#111827' : '#0f172a';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // 2. Grid lines (if snap enabled)
    if (gridSnap > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      const stepPx = cw * gridSnap;
      for (let gx = stepPx; gx < cw; gx += stepPx) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, ch);
        ctx.stroke();
      }
      for (let gy = stepPx; gy < ch; gy += stepPx) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(cw, gy);
        ctx.stroke();
      }
    }

    // 3. Render Background Image or Entity
    if (typeof renderEntity === 'function') {
      ctx.save();
      renderEntity(ctx, cw, ch);
      ctx.restore();
    } else if (imgRef.current && imgLoaded) {
      ctx.drawImage(imgRef.current, 0, 0, cw, ch);
    } else {
      // Default placeholder silhouette
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(cw * 0.1, ch * 0.1, cw * 0.8, ch * 0.8);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.strokeRect(cw * 0.1, ch * 0.1, cw * 0.8, ch * 0.8);
    }

    // 4. Draw Hitbox Polygon
    if (points.length >= 3) {
      ctx.save();

      // Polygon Fill
      ctx.beginPath();
      ctx.moveTo(points[0].x * cw, points[0].y * ch);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * cw, points[i].y * ch);
      }
      ctx.closePath();

      // Highlight fill if test point is inside!
      ctx.fillStyle = isTestInside
        ? 'rgba(239, 68, 68, 0.35)'
        : (accentColor ? `${accentColor}33` : 'rgba(6, 182, 212, 0.22)');
      ctx.fill();

      // Perimeter Stroke
      ctx.strokeStyle = isTestInside ? '#ef4444' : (accentColor || '#06b6d4');
      ctx.lineWidth = 2.5;
      ctx.shadowColor = isTestInside ? '#ef4444' : (accentColor || '#06b6d4');
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Hovered Edge (shows user they can click to add vertex)
      if (hoveredEdge !== null && hoveredEdge < points.length) {
        const p1 = points[hoveredEdge];
        const p2 = points[(hoveredEdge + 1) % points.length];
        ctx.beginPath();
        ctx.moveTo(p1.x * cw, p1.y * ch);
        ctx.lineTo(p2.x * cw, p2.y * ch);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // 5. Draw Vertex Handles
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const vx = pt.x * cw;
        const vy = pt.y * ch;
        const isSelected = i === selectedVertexIdx;

        // Outer halo
        ctx.beginPath();
        ctx.arc(vx, vy, isSelected ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#fbbf24' : '#ffffff';
        ctx.shadowColor = isSelected ? '#fbbf24' : 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = isSelected ? 12 : 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner center
        ctx.beginPath();
        ctx.arc(vx, vy, isSelected ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#000000' : (accentColor || '#06b6d4');
        ctx.fill();

        // Vertex Index Number
        ctx.fillStyle = isSelected ? '#fbbf24' : 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(String(i + 1), vx + 9, vy - 6);
      }

      ctx.restore();
    }

    // 6. Draw Test Cursor Point (if within bounds)
    if (testPoint) {
      const tx = testPoint.x * cw;
      const ty = testPoint.y * ch;
      ctx.save();
      ctx.beginPath();
      ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isTestInside ? '#ef4444' : '#22c55e';
      ctx.fill();
      ctx.restore();
    }
  }, [points, selectedVertexIdx, hoveredEdge, isTestInside, testPoint, gridSnap, accentColor, imgLoaded, renderEntity]);

  const selectedPoint = points[selectedVertexIdx] || points[0];

  return (
    <div className="flex flex-col gap-4 text-neutral-200">
      
      {/* Top Banner with Instructions and Status */}
      <div className="flex items-center justify-between bg-neutral-950/70 border border-neutral-800 rounded-xl px-3.5 py-2">
        <div className="flex items-center gap-2 text-xs">
          <div className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-white">Custom Hit Border</span>
            <span className="text-neutral-400 ml-2">({points.length} vertices)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Real-time Collision Detector Status */}
          <div className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 ${
            isTestInside
              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isTestInside ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
            <span>{isTestInside ? 'Inside Hitbox!' : 'Outside / Safe'}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowHelper(prev => !prev)}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            title="How to edit hit borders"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Guide tooltip if open */}
      {showHelper && (
        <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-lg text-xs text-neutral-300 space-y-1">
          <p className="font-semibold text-cyan-300">Quick Tips for Hitbox Editing:</p>
          <ul className="list-disc list-inside space-y-0.5 text-neutral-300 text-[11px]">
            <li><strong className="text-white">Drag vertices:</strong> Click and drag any circle handle to reshape the hitbox.</li>
            <li><strong className="text-white">Add vertex:</strong> Click on any perimeter line or use the "+ Add Point" button.</li>
            <li><strong className="text-white">Delete vertex:</strong> Select a point and click the Trash icon (minimum 3 vertices).</li>
            <li><strong className="text-white">Fine-tune:</strong> Use the directional arrows below or X/Y sliders for pixel accuracy.</li>
          </ul>
        </div>
      )}

      {/* Main Workspace: Canvas Stage + Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        
        {/* Left: Interactive Canvas Viewport (Col 7) */}
        <div className="md:col-span-7 flex flex-col items-center">
          <div className="relative rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950 shadow-2xl w-full max-w-[320px] aspect-square select-none">
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-full h-full block cursor-crosshair touch-none"
            />

            {/* Corner Badge */}
            <div className="absolute top-2 left-2 pointer-events-none bg-neutral-900/90 border border-neutral-700/80 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300">
              {entityName} Hitbox
            </div>
          </div>

          {/* Quick Transform Controls under Canvas */}
          <div className="flex items-center gap-1.5 mt-2.5 text-xs">
            <button
              type="button"
              onClick={handleFlipHorizontal}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 transition text-[11px]"
              title="Flip Hitbox Horizontally"
            >
              Flip ↔
            </button>
            <button
              type="button"
              onClick={handleFlipVertical}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 transition text-[11px]"
              title="Flip Hitbox Vertically"
            >
              Flip ↕
            </button>
            <div className="h-4 w-px bg-neutral-700 mx-1" />
            <span className="text-[11px] text-neutral-400">Snap:</span>
            {[
              { label: 'Off', val: 0 },
              { label: '5%', val: 0.05 },
              { label: '10%', val: 0.1 }
            ].map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => setGridSnap(s.val)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  gridSnap === s.val
                    ? 'bg-cyan-500 text-neutral-950 font-bold'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Point Inspector & Action Tools (Col 5) */}
        <div className="md:col-span-5 flex flex-col gap-3">
          
          {/* Selected Vertex Card */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm" />
                Vertex #{selectedVertexIdx + 1} of {points.length}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleAddVertex}
                  disabled={points.length >= 24}
                  className="p-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-40"
                  title="Add new vertex after this point"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteVertex}
                  disabled={points.length <= 3}
                  className="p-1 rounded bg-neutral-800 hover:bg-rose-900/60 text-neutral-400 hover:text-rose-400 transition disabled:opacity-40"
                  title="Delete this vertex (min 3)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Coordinate Precision Controls */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase font-mono block mb-1">X Position:</span>
                <span className="text-sm font-bold font-mono text-cyan-300">
                  {Math.round((selectedPoint?.x || 0) * 100)}%
                </span>
              </div>
              <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-400 uppercase font-mono block mb-1">Y Position:</span>
                <span className="text-sm font-bold font-mono text-cyan-300">
                  {Math.round((selectedPoint?.y || 0) * 100)}%
                </span>
              </div>
            </div>

            {/* 4-Directional Nudge Pad */}
            <div className="flex flex-col items-center gap-1 mt-1 bg-neutral-900/50 p-2 rounded-lg border border-neutral-800/80">
              <span className="text-[10px] font-mono text-neutral-400 uppercase mb-0.5">Nudge Vertex:</span>
              <button
                type="button"
                onClick={() => handleNudge(0, -1)}
                className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white transition cursor-pointer"
                title="Nudge Up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNudge(-1, 0)}
                  className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white transition cursor-pointer"
                  title="Nudge Left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="w-4 h-4 rounded-full border border-neutral-700 bg-neutral-950 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </div>
                <button
                  type="button"
                  onClick={() => handleNudge(1, 0)}
                  className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white transition cursor-pointer"
                  title="Nudge Right"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleNudge(0, 1)}
                className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white transition cursor-pointer"
                title="Nudge Down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Preset Shapes Strip */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-xs font-bold text-white">Preset Templates:</span>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {HITBOX_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleLoadPreset(preset)}
                  className="px-2 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-left transition text-[11px] flex flex-col cursor-pointer"
                >
                  <span className="font-semibold text-neutral-200 truncate">{preset.name}</span>
                  <span className="text-[9px] text-neutral-500 truncate">{preset.points.length} pts</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
