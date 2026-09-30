import React, { useState, useEffect, useRef } from 'react';
import {
  Grid, Image as ImageIcon, Plus, Trash2, Move, Scissors, Box,
  Layers, Sparkles, Check, ZoomIn, ZoomOut, Maximize2, RotateCcw,
  ArrowRight, ShieldCheck, Eye, EyeOff, LayoutTemplate
} from 'lucide-react';
import { extractRegionFromImage, extractRegionsBatch } from '../../utils/spritesheetManager.js';
import { upsertBlueprint } from '../../utils/customAssetsManager.js';

/**
 * MultiRegionSlicer
 * 
 * Allows users to import complex multi-purpose game sheets containing tilesets,
 * standalone backgrounds, parallax strips, and props all in one large image.
 * 
 * Users can define multiple draggable & resizable regions over the master image:
 *  - Type: 'tileset' (cut into NxM grid of block/hazard/decor tiles)
 *  - Type: 'single' (cut as a single whole rectangle for backgrounds, parallax layers, or decor)
 * 
 * Provides interactive canvas selection, fine-tuning inputs for x, y, width, height,
 * grid subdivisions, live preview of cuts, direct conversion to Blueprints,
 * and direct export to Parallax / Background layers.
 */
export default function MultiRegionSlicer({
  onAddParallaxLayer = null,
  onUpdateLevelBlueprints = null,
  showToast = () => {}
}) {
  const [masterImgUrl, setMasterImgUrl] = useState('');
  const [masterImgLoaded, setMasterImgLoaded] = useState(false);
  const [sheetFileName, setSheetFileName] = useState('');

  // Regions array
  const [regions, setRegions] = useState([
    {
      id: 'reg_tileset_1',
      name: 'Ground & Hazard Tileset',
      type: 'tileset', // 'tileset' | 'single'
      x: 0,
      y: 0,
      width: 256,
      height: 256,
      gridCols: 4,
      gridRows: 4,
      targetRole: 'block', // 'block' | 'hazard' | 'decor'
      color: '#06b6d4',
      isBackgroundOrParallax: false
    },
    {
      id: 'reg_bg_1',
      name: 'Sky & Mountain Background',
      type: 'single',
      x: 280,
      y: 0,
      width: 512,
      height: 256,
      gridCols: 1,
      gridRows: 1,
      targetRole: 'decor',
      color: '#a855f7',
      isBackgroundOrParallax: true
    }
  ]);

  const [selectedRegionId, setSelectedRegionId] = useState('reg_tileset_1');
  const [extractedItems, setExtractedItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Canvas interaction & viewport zoom/pan
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Region interaction on canvas: 'drag' or 'resize'
  const [dragMode, setDragMode] = useState(null); // null | 'move' | 'resize'
  const [dragHandle, setDragHandle] = useState(''); // 'se', 'sw', 'ne', 'nw', 'e', 's'
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });
  const [dragInitialRegion, setDragInitialRegion] = useState(null);

  // Direct editing states for precision clicks
  const [editingField, setEditingField] = useState(null); // 'x' | 'y' | 'w' | 'h' | 'cols' | 'rows' | 'scale'
  const [tempValue, setTempValue] = useState('');

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const masterImgRef = useRef(null);
  const containerRef = useRef(null);

  const selectedRegion = regions.find(r => r.id === selectedRegionId) || regions[0] || null;

  // Handle Sheet Image File Upload
  const handleFileUpload = (e) => {
    const file = e.target?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      const img = new Image();
      img.onload = () => {
        masterImgRef.current = img;
        setMasterImgUrl(dataUrl);
        setMasterImgLoaded(true);
        setSheetFileName(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));

        // Center view on canvas
        const container = containerRef.current;
        if (container) {
          const cw = container.clientWidth || 800;
          const ch = container.clientHeight || 500;
          const fitScale = Math.min(1.5, Math.max(0.2, Math.min(cw / img.naturalWidth, ch / img.naturalHeight) * 0.9));
          setZoomScale(fitScale);
          setPanX(Math.round((cw - img.naturalWidth * fitScale) / 2));
          setPanY(Math.round((ch - img.naturalHeight * fitScale) / 2));
        }

        // Adjust default regions to fit within the uploaded image
        setRegions(prev => prev.map(r => {
          const maxW = Math.min(r.width, img.naturalWidth);
          const maxH = Math.min(r.height, img.naturalHeight);
          return {
            ...r,
            x: Math.min(r.x, Math.max(0, img.naturalWidth - maxW)),
            y: Math.min(r.y, Math.max(0, img.naturalHeight - maxH)),
            width: maxW,
            height: maxH
          };
        }));

        showToast(`Loaded "${file.name}" (${img.naturalWidth}×${img.naturalHeight}px). Define your regions!`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Add new region
  const handleAddRegion = (type = 'tileset') => {
    const img = masterImgRef.current;
    const imgW = img?.naturalWidth || 800;
    const imgH = img?.naturalHeight || 600;

    const colors = ['#06b6d4', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
    const assignedColor = colors[regions.length % colors.length];

    const isSingle = type === 'single';
    const defaultW = isSingle ? Math.min(512, imgW) : Math.min(256, imgW);
    const defaultH = isSingle ? Math.min(256, imgH) : Math.min(256, imgH);
    const spawnX = Math.max(0, Math.min(imgW - defaultW, regions.length * 30));
    const spawnY = Math.max(0, Math.min(imgH - defaultH, regions.length * 30));

    const newReg = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: isSingle ? `Background / Parallax Section ${regions.length + 1}` : `Tileset Grid ${regions.length + 1}`,
      type,
      x: spawnX,
      y: spawnY,
      width: defaultW,
      height: defaultH,
      gridCols: isSingle ? 1 : 4,
      gridRows: isSingle ? 1 : 4,
      targetRole: isSingle ? 'decor' : 'block',
      color: assignedColor,
      isBackgroundOrParallax: isSingle
    };

    setRegions(prev => [...prev, newReg]);
    setSelectedRegionId(newReg.id);
    showToast(`Added new ${isSingle ? 'Single Region' : 'Grid Tileset Region'}!`);
  };

  // Remove region
  const handleRemoveRegion = (id) => {
    if (regions.length <= 1) {
      showToast('Keep at least one region on the sheet.');
      return;
    }
    setRegions(prev => prev.filter(r => r.id !== id));
    if (selectedRegionId === id) {
      const remaining = regions.filter(r => r.id !== id);
      setSelectedRegionId(remaining[0]?.id || null);
    }
    showToast('Region removed.');
  };

  // Update selected region properties
  const updateRegion = (patch) => {
    if (!selectedRegionId) return;
    setRegions(prev => prev.map(r => {
      if (r.id === selectedRegionId) {
        return { ...r, ...patch };
      }
      return r;
    }));
  };

  // Convert canvas mouse coords to image natural pixels
  const screenToImageCoords = (screenX, screenY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const mouseX = screenX - rect.left;
    const mouseY = screenY - rect.top;

    const imgX = (mouseX - panX) / zoomScale;
    const imgY = (mouseY - panY) / zoomScale;
    return { x: imgX, y: imgY };
  };

  // Draw Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    const cw = container?.clientWidth || 800;
    const ch = container?.clientHeight || 520;

    canvas.width = cw;
    canvas.height = ch;

    // Dark checkerboard background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, cw, ch);

    // Grid dots
    ctx.fillStyle = '#1e293b';
    const dotSpacing = 24;
    for (let x = 0; x < cw; x += dotSpacing) {
      for (let y = 0; y < ch; y += dotSpacing) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoomScale, zoomScale);

    const img = masterImgRef.current;
    if (img && masterImgLoaded) {
      // Draw image
      ctx.drawImage(img, 0, 0);

      // Sheet boundary
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1 / zoomScale;
      ctx.strokeRect(0, 0, img.naturalWidth, img.naturalHeight);
    } else {
      // Placeholder prompt
      ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.fillRect(0, 0, 800, 500);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 2 / zoomScale;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(0, 0, 800, 500);
      ctx.setLineDash([]);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload a Spritesheet / Game Texture to start carving sections', 400, 250);
    }

    // Draw all regions
    regions.forEach(reg => {
      const isSelected = reg.id === selectedRegionId;
      const rx = Math.round(reg.x);
      const ry = Math.round(reg.y);
      const rw = Math.round(reg.width);
      const rh = Math.round(reg.height);

      // Fill tint
      ctx.fillStyle = isSelected ? `${reg.color}33` : `${reg.color}15`;
      ctx.fillRect(rx, ry, rw, rh);

      // Border outline
      ctx.strokeStyle = reg.color;
      ctx.lineWidth = (isSelected ? 2.5 : 1.5) / zoomScale;
      ctx.strokeRect(rx, ry, rw, rh);

      // Grid division lines (if tileset)
      if (reg.type === 'tileset' && reg.gridCols > 1) {
        ctx.strokeStyle = `${reg.color}88`;
        ctx.lineWidth = 1 / zoomScale;
        const cellW = rw / reg.gridCols;
        for (let c = 1; c < reg.gridCols; c++) {
          ctx.beginPath();
          ctx.moveTo(rx + c * cellW, ry);
          ctx.lineTo(rx + c * cellW, ry + rh);
          ctx.stroke();
        }
      }
      if (reg.type === 'tileset' && reg.gridRows > 1) {
        ctx.strokeStyle = `${reg.color}88`;
        ctx.lineWidth = 1 / zoomScale;
        const cellH = rh / reg.gridRows;
        for (let r = 1; r < reg.gridRows; r++) {
          ctx.beginPath();
          ctx.moveTo(rx, ry + r * cellH);
          ctx.lineTo(rx + rw, ry + r * cellH);
          ctx.stroke();
        }
      }

      // Title & badge
      const badgeText = `${reg.name} (${rw}×${rh}px)${reg.type === 'tileset' ? ` [${reg.gridCols}×${reg.gridRows}]` : ' [Single]'}`;
      ctx.font = `bold ${Math.max(10, Math.round(11 / zoomScale))}px sans-serif`;
      const textMetrics = ctx.measureText(badgeText);
      const badgeW = textMetrics.width + 12 / zoomScale;
      const badgeH = 18 / zoomScale;

      ctx.fillStyle = reg.color;
      ctx.fillRect(rx, ry - badgeH, badgeW, badgeH);

      ctx.fillStyle = '#090d16';
      ctx.textAlign = 'left';
      ctx.fillText(badgeText, rx + 6 / zoomScale, ry - 5 / zoomScale);

      // Draw resize corner handles for the active selected region
      if (isSelected) {
        const handleSize = 8 / zoomScale;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = reg.color;
        ctx.lineWidth = 2 / zoomScale;

        // Bottom-Right handle
        ctx.fillRect(rx + rw - handleSize / 2, ry + rh - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(rx + rw - handleSize / 2, ry + rh - handleSize / 2, handleSize, handleSize);

        // Top-Right handle
        ctx.fillRect(rx + rw - handleSize / 2, ry - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(rx + rw - handleSize / 2, ry - handleSize / 2, handleSize, handleSize);

        // Bottom-Left handle
        ctx.fillRect(rx - handleSize / 2, ry + rh - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(rx - handleSize / 2, ry + rh - handleSize / 2, handleSize, handleSize);
      }
    });

    ctx.restore();
  }, [regions, selectedRegionId, zoomScale, panX, panY, masterImgLoaded]);

  // Handle Mouse Down on Canvas (Start Drag or Pan)
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Right-click or Space or Middle-click = Pan viewport
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      return;
    }

    const { x: imgX, y: imgY } = screenToImageCoords(e.clientX, e.clientY);

    // 1. Check if clicking on active region resize handle (bottom-right)
    if (selectedRegion) {
      const rx = selectedRegion.x;
      const ry = selectedRegion.y;
      const rw = selectedRegion.width;
      const rh = selectedRegion.height;
      const hitDist = 14 / zoomScale;

      // Bottom-right corner
      if (Math.abs(imgX - (rx + rw)) < hitDist && Math.abs(imgY - (ry + rh)) < hitDist) {
        setDragMode('resize');
        setDragHandle('se');
        setDragStartMouse({ x: imgX, y: imgY });
        setDragInitialRegion({ ...selectedRegion });
        return;
      }
      // Top-right corner
      if (Math.abs(imgX - (rx + rw)) < hitDist && Math.abs(imgY - ry) < hitDist) {
        setDragMode('resize');
        setDragHandle('ne');
        setDragStartMouse({ x: imgX, y: imgY });
        setDragInitialRegion({ ...selectedRegion });
        return;
      }
    }

    // 2. Check if clicking inside any region to select/move
    const clickedRegion = [...regions].reverse().find(r => (
      imgX >= r.x && imgX <= r.x + r.width &&
      imgY >= r.y && imgY <= r.y + r.height
    ));

    if (clickedRegion) {
      setSelectedRegionId(clickedRegion.id);
      setDragMode('move');
      setDragStartMouse({ x: imgX, y: imgY });
      setDragInitialRegion({ ...clickedRegion });
      return;
    }

    // 3. Otherwise, click on background pans the view
    setIsPanning(true);
    setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  // Mouse Move on Canvas
  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanX(e.clientX - panStart.x);
      setPanY(e.clientY - panStart.y);
      return;
    }

    if (!dragMode || !dragInitialRegion || !selectedRegionId) return;

    const { x: imgX, y: imgY } = screenToImageCoords(e.clientX, e.clientY);
    const dx = Math.round(imgX - dragStartMouse.x);
    const dy = Math.round(imgY - dragStartMouse.y);

    const img = masterImgRef.current;
    const maxW = img ? img.naturalWidth : 4096;
    const maxH = img ? img.naturalHeight : 4096;

    if (dragMode === 'move') {
      const newX = Math.max(0, Math.min(maxW - dragInitialRegion.width, dragInitialRegion.x + dx));
      const newY = Math.max(0, Math.min(maxH - dragInitialRegion.height, dragInitialRegion.y + dy));
      updateRegion({ x: Math.round(newX), y: Math.round(newY) });
    } else if (dragMode === 'resize') {
      if (dragHandle === 'se') {
        const newW = Math.max(16, Math.min(maxW - dragInitialRegion.x, dragInitialRegion.width + dx));
        const newH = Math.max(16, Math.min(maxH - dragInitialRegion.y, dragInitialRegion.height + dy));
        updateRegion({ width: Math.round(newW), height: Math.round(newH) });
      } else if (dragHandle === 'ne') {
        const newW = Math.max(16, Math.min(maxW - dragInitialRegion.x, dragInitialRegion.width + dx));
        const newY = Math.max(0, dragInitialRegion.y + dy);
        const newH = Math.max(16, dragInitialRegion.height - dy);
        updateRegion({ width: Math.round(newW), y: Math.round(newY), height: Math.round(newH) });
      }
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    setIsPanning(false);
    setDragMode(null);
    setDragHandle('');
    setDragInitialRegion(null);
  };

  // Mouse Wheel Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(4.0, Math.max(0.1, zoomScale * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom towards mouse pointer
    setPanX(mouseX - (mouseX - panX) * (newZoom / zoomScale));
    setPanY(mouseY - (mouseY - panY) * (newZoom / zoomScale));
    setZoomScale(newZoom);
  };

  // Execute Extraction of All Regions
  const handleExtractAll = () => {
    const img = masterImgRef.current;
    if (!img || !masterImgLoaded) {
      showToast('Please upload a sheet image first.');
      return;
    }

    setIsProcessing(true);
    try {
      const extracted = extractRegionsBatch(img, regions);
      setExtractedItems(extracted);
      showToast(`Successfully extracted ${extracted.length} sprite(s) & background layer(s) from ${regions.length} regions!`);
    } catch (err) {
      console.error('Extraction error:', err);
      showToast('Error extracting regions: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Add Extracted Item to Blueprints
  const handleMakeBlueprint = (item, role = 'block') => {
    const bp = {
      id: `bp_reg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: item.name,
      tag: item.regionType === 'tileset' ? 'Tileset' : 'Decor',
      role,
      imageUrl: item.dataUrl,
      layer: role === 'decor' ? 'foreground' : 'background',
      width: item.width || 64,
      height: item.height || 64,
      createdAt: Date.now()
    };

    upsertBlueprint(bp);
    if (onUpdateLevelBlueprints) {
      onUpdateLevelBlueprints([bp]);
    }
    showToast(`Created Blueprint "${bp.name}"! Available in Asset Browser.`);
  };

  // Add Item to Parallax Background Layers
  const handleSendToParallax = (item) => {
    if (!onAddParallaxLayer) {
      showToast('Parallax studio callback unavailable.');
      return;
    }

    const layer = {
      id: `layer_sheet_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: item.name || 'Extracted Background',
      url: item.dataUrl,
      speed: 0.35,
      opacity: 1.0,
      offsetY: 0,
      scale: 1.0,
      repeatX: true,
      isForeground: false
    };

    onAddParallaxLayer(layer);
    showToast(`Added "${layer.name}" to Parallax Background Layers!`);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-neutral-950/70 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">Multi-Region & Multi-Grid Slicer</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-500/30 font-semibold">
                ALL-IN-ONE GAME SHEET IMPORT
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Carve mixed game sheets: define movable grid tilesets for blocks AND single boxes for backgrounds or parallax strips.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 cursor-pointer transition"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Upload Mixed Sheet</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={handleExtractAll}
            disabled={!masterImgLoaded || isProcessing}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Slicing...' : `Extract All ${regions.length} Regions`}</span>
          </button>
        </div>
      </div>

      {/* Main Split View: Left Controls, Middle Workspace, Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Column 1: Regions Manager (3 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">

          {/* Region List Card */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-200">
                Regions ({regions.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAddRegion('tileset')}
                  className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-cyan-500 text-cyan-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                  title="Add Tileset Grid (Cols × Rows)"
                >
                  <Plus className="w-3 h-3" /> +Tileset
                </button>
                <button
                  onClick={() => handleAddRegion('single')}
                  className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-purple-500 text-purple-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                  title="Add Single Background / Parallax Box"
                >
                  <Plus className="w-3 h-3" /> +Single BG
                </button>
              </div>
            </div>

            {/* Region items */}
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {regions.map(reg => {
                const isSelected = reg.id === selectedRegionId;
                return (
                  <div
                    key={reg.id}
                    onClick={() => setSelectedRegionId(reg.id)}
                    className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-neutral-900 border-cyan-500/70 shadow-sm'
                        : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: reg.color }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-white truncate">{reg.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                          <span>{reg.width}×{reg.height}px</span>
                          <span>{reg.type === 'tileset' ? `${reg.gridCols}×${reg.gridRows} grid` : 'Single Box'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRegion(reg.id);
                      }}
                      className="p-1 text-neutral-500 hover:text-rose-400 transition cursor-pointer"
                      title="Delete Region"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Region Detailed Parameters */}
          {selectedRegion && (
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-xs font-bold text-cyan-300">
                  Edit Selected Region
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold"
                  style={{ color: selectedRegion.color, backgroundColor: `${selectedRegion.color}22` }}
                >
                  {selectedRegion.type === 'tileset' ? 'Tileset Grid' : 'Single Rectangle'}
                </span>
              </div>

              {/* Name */}
              <div>
                <label className="text-[11px] text-neutral-400">Region Name</label>
                <input
                  type="text"
                  value={selectedRegion.name}
                  onChange={(e) => updateRegion({ name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white mt-0.5 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Type Switch */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateRegion({ type: 'tileset', isBackgroundOrParallax: false })}
                  className={`flex-1 py-1 rounded text-xs font-semibold border transition cursor-pointer ${
                    selectedRegion.type === 'tileset'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                >
                  Tileset (Grid)
                </button>
                <button
                  onClick={() => updateRegion({ type: 'single', isBackgroundOrParallax: true })}
                  className={`flex-1 py-1 rounded text-xs font-semibold border transition cursor-pointer ${
                    selectedRegion.type === 'single'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                >
                  Single (BG/Parallax)
                </button>
              </div>

              {/* Position & Dimensions (Click to edit directly or adjust) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-neutral-400">Position X (px)</span>
                  <input
                    type="number"
                    min="0"
                    max="8192"
                    value={selectedRegion.x}
                    onChange={(e) => updateRegion({ x: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 text-white font-mono mt-0.5 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-neutral-400">Position Y (px)</span>
                  <input
                    type="number"
                    min="0"
                    max="8192"
                    value={selectedRegion.y}
                    onChange={(e) => updateRegion({ y: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 text-white font-mono mt-0.5 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-neutral-400">Width (px)</span>
                  <input
                    type="number"
                    min="8"
                    max="8192"
                    value={selectedRegion.width}
                    onChange={(e) => updateRegion({ width: Math.max(8, parseInt(e.target.value) || 8) })}
                    className="w-full px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 text-white font-mono mt-0.5 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-neutral-400">Height (px)</span>
                  <input
                    type="number"
                    min="8"
                    max="8192"
                    value={selectedRegion.height}
                    onChange={(e) => updateRegion({ height: Math.max(8, parseInt(e.target.value) || 8) })}
                    className="w-full px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 text-white font-mono mt-0.5 text-xs"
                  />
                </div>
              </div>

              {/* Grid subdivisions (Only shown if tileset) */}
              {selectedRegion.type === 'tileset' ? (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
                  <div>
                    <span className="text-[11px] text-neutral-400">Columns (up to 32)</span>
                    <input
                      type="number"
                      min="1"
                      max="32"
                      value={selectedRegion.gridCols}
                      onChange={(e) => updateRegion({ gridCols: Math.max(1, Math.min(32, parseInt(e.target.value) || 1)) })}
                      className="w-full px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 text-cyan-300 font-mono mt-0.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400">Rows (up to 32)</span>
                    <input
                      type="number"
                      min="1"
                      max="32"
                      value={selectedRegion.gridRows}
                      onChange={(e) => updateRegion({ gridRows: Math.max(1, Math.min(32, parseInt(e.target.value) || 1)) })}
                      className="w-full px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 text-cyan-300 font-mono mt-0.5 text-xs font-bold"
                    />
                  </div>
                  <div className="col-span-2 text-[10px] text-neutral-400">
                    Tile size: ~{Math.round(selectedRegion.width / selectedRegion.gridCols)}×{Math.round(selectedRegion.height / selectedRegion.gridRows)}px each ({selectedRegion.gridCols * selectedRegion.gridRows} total tiles)
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-neutral-800 flex flex-col gap-2">
                  <span className="text-[11px] text-purple-300 font-semibold">Single Background / Parallax Layer</span>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    Extracts this entire rectangle as a single image. You can click "Add to Parallax Backgrounds" directly below to use it as a seamless sky, skyline, or backdrop layer.
                  </p>
                </div>
              )}

              {/* Target Role */}
              <div>
                <label className="text-[11px] text-neutral-400">Default Game Role</label>
                <div className="flex items-center gap-1.5 mt-1">
                  {[
                    { id: 'block', label: 'Solid Block' },
                    { id: 'hazard', label: 'Hazard' },
                    { id: 'decor', label: 'Decor' }
                  ].map(r => (
                    <button
                      key={r.id}
                      onClick={() => updateRegion({ targetRole: r.id })}
                      className={`flex-1 py-1 rounded text-[11px] font-semibold border transition cursor-pointer ${
                        selectedRegion.targetRole === r.id
                          ? 'bg-neutral-800 text-white border-neutral-600'
                          : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Column 2: Interactive Master Canvas (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">

          {/* Canvas Box */}
          <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Visual Sheet Workspace</span>
                {masterImgLoaded && (
                  <span className="text-[11px] text-neutral-400 font-mono">
                    ({masterImgRef.current?.naturalWidth}×{masterImgRef.current?.naturalHeight}px)
                  </span>
                )}
              </div>

              {/* Zoom Controls & Clickable Digits */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setZoomScale(z => Math.max(0.1, z - 0.1))}
                    className="p-1 hover:text-white text-neutral-400 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  {/* Clickable Digit to Finetune Zoom */}
                  {editingField === 'scale' ? (
                    <input
                      type="number"
                      autoFocus
                      step="5"
                      min="10"
                      max="400"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onBlur={() => {
                        const val = parseFloat(tempValue);
                        if (!isNaN(val) && val > 0) {
                          setZoomScale(val / 100);
                        }
                        setEditingField(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseFloat(tempValue);
                          if (!isNaN(val) && val > 0) {
                            setZoomScale(val / 100);
                          }
                          setEditingField(null);
                        }
                      }}
                      className="w-14 px-1 py-0.5 text-[11px] font-mono text-center bg-neutral-800 text-cyan-300 rounded border border-cyan-500"
                    />
                  ) : (
                    <span
                      onClick={() => {
                        setEditingField('scale');
                        setTempValue(String(Math.round(zoomScale * 100)));
                      }}
                      className="px-2 py-0.5 text-[11px] font-mono text-cyan-300 font-bold cursor-pointer hover:bg-neutral-800 rounded select-none"
                      title="Click to type exact zoom %"
                    >
                      {Math.round(zoomScale * 100)}%
                    </span>
                  )}

                  <button
                    onClick={() => setZoomScale(z => Math.min(4.0, z + 0.1))}
                    className="p-1 hover:text-white text-neutral-400 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    const img = masterImgRef.current;
                    const container = containerRef.current;
                    if (img && container) {
                      const fitScale = Math.min(container.clientWidth / img.naturalWidth, container.clientHeight / img.naturalHeight) * 0.95;
                      setZoomScale(fitScale);
                      setPanX(Math.round((container.clientWidth - img.naturalWidth * fitScale) / 2));
                      setPanY(Math.round((container.clientHeight - img.naturalHeight * fitScale) / 2));
                    } else {
                      setZoomScale(1.0);
                      setPanX(0);
                      setPanY(0);
                    }
                  }}
                  className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                  title="Fit whole image to screen"
                >
                  Fit View
                </button>
              </div>
            </div>

            {/* Canvas Area */}
            <div
              ref={containerRef}
              className="w-full h-[460px] bg-[#07090e] rounded-xl overflow-hidden relative border border-neutral-800 cursor-crosshair select-none"
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                className="w-full h-full block"
              />

              {/* Floating Canvas Guide */}
              <div className="absolute bottom-2.5 left-3 px-2.5 py-1 rounded-md bg-neutral-950/80 border border-neutral-800 text-[10px] text-neutral-400 pointer-events-none flex items-center gap-2">
                <span>🖱️ Click & Drag inside region to move</span>
                <span>•</span>
                <span>Grab corner to resize</span>
                <span>•</span>
                <span>Shift+Drag to pan view</span>
              </div>
            </div>
          </div>

          {/* Sliced Output Gallery */}
          {extractedItems.length > 0 && (
            <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Extracted Pieces ({extractedItems.length})
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Individual cut tilesets and single background layers ready to apply
                  </p>
                </div>

                <button
                  onClick={() => {
                    const bps = extractedItems.map(item => ({
                      id: `bp_reg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                      name: item.name,
                      tag: item.regionType === 'tileset' ? 'Tileset' : 'Decor',
                      role: item.targetRole || 'block',
                      imageUrl: item.dataUrl,
                      layer: item.targetRole === 'decor' ? 'foreground' : 'background',
                      width: item.width || 64,
                      height: item.height || 64,
                      createdAt: Date.now()
                    }));
                    bps.forEach(b => upsertBlueprint(b));
                    if (onUpdateLevelBlueprints) onUpdateLevelBlueprints(bps);
                    showToast(`Added all ${bps.length} pieces as Blueprints!`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add All as Blueprints</span>
                </button>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                {extractedItems.map(item => (
                  <div
                    key={item.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 flex flex-col items-center gap-2 hover:border-cyan-500/50 transition"
                  >
                    <div className="w-full h-24 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-center p-1 overflow-hidden">
                      <img
                        src={item.dataUrl}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>

                    <div className="flex flex-col items-center text-center w-full min-w-0">
                      <span className="text-[11px] font-semibold text-neutral-200 truncate w-full">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {item.width}×{item.height}px
                      </span>
                    </div>

                    <div className="flex items-center gap-1 w-full mt-1">
                      <button
                        onClick={() => handleMakeBlueprint(item, item.targetRole || 'block')}
                        className="flex-1 py-1 rounded bg-neutral-800 hover:bg-cyan-500/20 hover:text-cyan-300 border border-neutral-700 hover:border-cyan-500/40 text-[10px] font-semibold transition cursor-pointer"
                        title="Add as Blueprint"
                      >
                        +Blueprint
                      </button>

                      {item.isBackgroundOrParallax && (
                        <button
                          onClick={() => handleSendToParallax(item)}
                          className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[10px] font-semibold transition cursor-pointer"
                          title="Send to Parallax Studio as Background Layer"
                        >
                          Parallax
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
