import React, { useState, useEffect, useRef } from 'react';
import {
  X, Grid, Image as ImageIcon, Plus, Trash2, Download, Copy,
  Check, Move, ZoomIn, ZoomOut, Maximize2, Scissors, Box,
  Layers, FileText, Sparkles, RefreshCw, AlertCircle, ArrowRight
} from 'lucide-react';
import {
  getSavedSpritesheets,
  upsertSpritesheet,
  deleteSpritesheet,
  packImagesToSpritesheet,
  sliceImageToBlocks,
  generateAtlasExportText
} from '../../utils/spritesheetManager.js';
import { upsertBlueprint } from '../../utils/customAssetsManager.js';
import MultiRegionSlicer from './MultiRegionSlicer.jsx';

export default function SpriteStudioModal({
  isOpen,
  onClose,
  onOpenBlueprintCreatorWithSprite = null,
  onSaveToLevel = null,
  onAddParallaxLayer = null,
  onUpdateLevelBlueprints = null
}) {
  const [activeTab, setActiveTab] = useState('multiregion'); // 'multiregion' | 'packer' | 'slicer' | 'export'
  const [savedSheets, setSavedSheets] = useState([]);
  const [selectedSheetId, setSelectedSheetId] = useState(null);

  // PACKER STATE
  const [sheetName, setSheetName] = useState('New Spritesheet');
  const [sourceImages, setSourceImages] = useState([]);
  const [currentSheetData, setCurrentSheetData] = useState(null);
  const [selectedSprite, setSelectedSprite] = useState(null);
  const [isPacking, setIsPacking] = useState(false);
  const [packPadding, setPackPadding] = useState(4);
  const [notification, setNotification] = useState('');

  // SLICER (MULTI-BLOCK GRID) STATE
  const [slicerGridCols, setSlicerGridCols] = useState(2);
  const [slicerGridRows, setSlicerGridRows] = useState(2);
  const [slicerBlockSize, setSlicerBlockSize] = useState(64);
  const [slicerBaseName, setSlicerBaseName] = useState('Monster Boss');
  const [slicerImageUrl, setSlicerImageUrl] = useState('');
  const [slicerImageLoaded, setSlicerImageLoaded] = useState(false);
  const [slicerOffsetX, setSlicerOffsetX] = useState(0);
  const [slicerOffsetY, setSlicerOffsetY] = useState(0);
  const [slicerScale, setSlicerScale] = useState(1);
  const [slicerSlicedBlocks, setSlicerSlicedBlocks] = useState([]);
  const [isDraggingSlicer, setIsDraggingSlicer] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [editingSlicerField, setEditingSlicerField] = useState(null); // 'scale' | 'offsetX' | 'offsetY'
  const [tempSlicerVal, setTempSlicerVal] = useState('');

  // EXPORT FORMAT
  const [exportFormat, setExportFormat] = useState('json');
  const [hasCopiedText, setHasCopiedText] = useState(false);

  const slicerImgRef = useRef(null);
  const slicerCanvasRef = useRef(null);
  const packerCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const slicerFileInputRef = useRef(null);

  // Load saved sheets on open
  useEffect(() => {
    if (!isOpen) return;
    const sheets = getSavedSpritesheets();
    setSavedSheets(sheets);
    if (sheets.length > 0 && !selectedSheetId) {
      loadSheet(sheets[0]);
    }
  }, [isOpen]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const loadSheet = (sheet) => {
    if (!sheet) return;
    setSelectedSheetId(sheet.id);
    setSheetName(sheet.name || 'Spritesheet');
    setCurrentSheetData(sheet);
    if (Array.isArray(sheet.sprites) && sheet.sprites.length > 0) {
      setSelectedSprite(sheet.sprites[0]);
    } else {
      setSelectedSprite(null);
    }
  };

  // -------------------------------------------------------------
  // PACKER ACTIONS
  // -------------------------------------------------------------
  const handleAddImagesFiles = (e) => {
    const files = Array.from(e.target?.files || []);
    if (files.length === 0) return;

    const newItems = [];
    let loadedCount = 0;

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result;
        const img = new Image();
        img.onload = () => {
          newItems.push({
            id: `src_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            dataUrl,
            img,
            width: img.naturalWidth,
            height: img.naturalHeight
          });
          loadedCount++;
          if (loadedCount === files.length) {
            setSourceImages(prev => [...prev, ...newItems]);
            showToast(`Added ${newItems.length} image(s). Click "Re-Pack Sheet" to compile!`);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveSourceImage = (id) => {
    setSourceImages(prev => prev.filter(img => img.id !== id));
  };

  const handleCompileSpritesheet = async () => {
    if (sourceImages.length === 0) {
      showToast('Please add at least one image to pack.');
      return;
    }

    setIsPacking(true);
    try {
      const result = await packImagesToSpritesheet(sourceImages, {
        padding: Number(packPadding) || 4,
        maxSheetWidth: 1024
      });

      const sheetObj = {
        id: selectedSheetId || `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: sheetName.trim() || 'Custom Spritesheet',
        dataUrl: result.dataUrl,
        imageUrl: result.dataUrl,
        width: result.width,
        height: result.height,
        sprites: result.sprites,
        createdAt: Date.now()
      };

      const updated = upsertSpritesheet(sheetObj);
      setSavedSheets(updated);
      setSelectedSheetId(sheetObj.id);
      setCurrentSheetData(sheetObj);
      if (sheetObj.sprites.length > 0) {
        setSelectedSprite(sheetObj.sprites[0]);
      }
      if (onSaveToLevel) onSaveToLevel(sheetObj);
      showToast('Spritesheet compiled and saved successfully!');
    } catch (err) {
      console.error('Failed to compile spritesheet:', err);
      showToast('Compilation error: ' + err.message);
    } finally {
      setIsPacking(false);
    }
  };

  const handleCreateNewSheet = () => {
    setSelectedSheetId(null);
    setSheetName(`Spritesheet ${savedSheets.length + 1}`);
    setSourceImages([]);
    setCurrentSheetData(null);
    setSelectedSprite(null);
  };

  const handleDeleteSheet = (id) => {
    const updated = deleteSpritesheet(id);
    setSavedSheets(updated);
    if (selectedSheetId === id) {
      if (updated.length > 0) loadSheet(updated[0]);
      else handleCreateNewSheet();
    }
    showToast('Spritesheet removed.');
  };

  // Convert individual sprite to custom blueprint
  const handleTurnSpriteIntoBlueprint = (sprite, role = 'decor') => {
    if (!sprite || !sprite.dataUrl) return;

    const bp = {
      id: `bp_spr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: sprite.name || 'Custom Sprite',
      tag: 'Spritesheet',
      role,
      imageUrl: sprite.dataUrl,
      layer: role === 'decor' ? 'foreground' : 'background',
      isAnimated: false,
      frameCount: 1,
      fps: 8,
      loopMode: 'loop',
      width: sprite.width || 64,
      height: sprite.height || 64,
      createdAt: Date.now()
    };

    upsertBlueprint(bp);
    showToast(`Created Blueprint "${bp.name}"! Ready in Asset Browser.`);
    if (onOpenBlueprintCreatorWithSprite) {
      onOpenBlueprintCreatorWithSprite(bp);
    }
  };

  // -------------------------------------------------------------
  // MULTI-BLOCK SLICER ACTIONS
  // -------------------------------------------------------------
  const handleSlicerImageUpload = (e) => {
    const file = e.target?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      const img = new Image();
      img.onload = () => {
        slicerImgRef.current = img;
        setSlicerImageUrl(dataUrl);
        setSlicerImageLoaded(true);
        setSlicerBaseName(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
        // Reset transform to fit target grid nicely
        const targetW = slicerGridCols * slicerBlockSize;
        const targetH = slicerGridRows * slicerBlockSize;
        const scaleX = targetW / img.naturalWidth;
        const scaleY = targetH / img.naturalHeight;
        const bestScale = Math.min(scaleX, scaleY);
        setSlicerScale(bestScale);
        setSlicerOffsetX(Math.round((targetW - img.naturalWidth * bestScale) / 2));
        setSlicerOffsetY(Math.round((targetH - img.naturalHeight * bestScale) / 2));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Draw Slicer Workspace Canvas
  useEffect(() => {
    if (activeTab !== 'slicer') return;
    const canvas = slicerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetW = slicerGridCols * slicerBlockSize;
    const targetH = slicerGridRows * slicerBlockSize;

    canvas.width = targetW;
    canvas.height = targetH;

    ctx.clearRect(0, 0, targetW, targetH);

    // Dark grid background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, targetW, targetH);

    // Draw user transformed image
    const img = slicerImgRef.current;
    if (img && slicerImageLoaded) {
      const dw = img.naturalWidth * slicerScale;
      const dh = img.naturalHeight * slicerScale;
      ctx.drawImage(img, slicerOffsetX, slicerOffsetY, dw, dh);
    } else {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload an image to align and slice', targetW / 2, targetH / 2);
    }

    // Grid overlays
    ctx.lineWidth = 1.5;
    for (let r = 0; r < slicerGridRows; r++) {
      for (let c = 0; c < slicerGridCols; c++) {
        const x = c * slicerBlockSize;
        const y = r * slicerBlockSize;

        ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
        ctx.strokeRect(x, y, slicerBlockSize, slicerBlockSize);

        // Coordinate tag
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x + 4, y + 4, 34, 16);
        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`[${c},${r}]`, x + 6, y + 15);
      }
    }
  }, [activeTab, slicerGridCols, slicerGridRows, slicerBlockSize, slicerScale, slicerOffsetX, slicerOffsetY, slicerImageLoaded]);

  const handleExecuteSlice = () => {
    const img = slicerImgRef.current;
    if (!img || !slicerImageLoaded) {
      showToast('Please upload an image first.');
      return;
    }

    try {
      const sliced = sliceImageToBlocks(img, {
        gridCols: slicerGridCols,
        gridRows: slicerGridRows,
        blockSize: slicerBlockSize,
        offsetX: slicerOffsetX,
        offsetY: slicerOffsetY,
        scale: slicerScale,
        baseName: slicerBaseName
      });

      setSlicerSlicedBlocks(sliced);

      // Add slices directly into sourceImages of packer so they can be bundled!
      const newSources = sliced.map(b => {
        const simg = new Image();
        simg.src = b.dataUrl;
        return {
          id: b.id,
          name: b.name,
          dataUrl: b.dataUrl,
          img: simg,
          width: b.width,
          height: b.height
        };
      });

      setSourceImages(prev => [...prev, ...newSources]);
      showToast(`Successfully sliced into ${sliced.length} individual block tiles! Added to Spritesheet.`);
    } catch (err) {
      console.error('Slice failed:', err);
      showToast('Slice error: ' + err.message);
    }
  };

  const handleAddAllSlicesAsBlueprints = (role = 'block') => {
    if (slicerSlicedBlocks.length === 0) return;
    slicerSlicedBlocks.forEach(b => {
      const bp = {
        id: `bp_slice_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: b.name,
        tag: 'Multi-Block',
        role,
        imageUrl: b.dataUrl,
        layer: role === 'decor' ? 'foreground' : 'background',
        width: b.width,
        height: b.height,
        createdAt: Date.now()
      };
      upsertBlueprint(bp);
    });
    showToast(`Created ${slicerSlicedBlocks.length} Blueprints! They are ready to place.`);
  };

  // -------------------------------------------------------------
  // EXPORT ATLAS ACTIONS
  // -------------------------------------------------------------
  const atlasText = generateAtlasExportText(currentSheetData, exportFormat);

  const handleCopyAtlasText = () => {
    if (!atlasText) return;
    navigator.clipboard.writeText(atlasText).then(() => {
      setHasCopiedText(true);
      showToast('Atlas coordinates copied to clipboard!');
      setTimeout(() => setHasCopiedText(false), 2000);
    }).catch(err => {
      showToast('Copy failed: ' + err.message);
    });
  };

  const handleDownloadAtlasJson = () => {
    if (!currentSheetData) return;
    const jsonStr = generateAtlasExportText(currentSheetData, 'json');
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(currentSheetData.name || 'spritesheet').toLowerCase().replace(/\s+/g, '_')}_atlas.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Atlas JSON downloaded!');
  };

  const handleDownloadSheetPng = () => {
    if (!currentSheetData?.dataUrl) return;
    const a = document.createElement('a');
    a.href = currentSheetData.dataUrl;
    a.download = `${(currentSheetData.name || 'spritesheet').toLowerCase().replace(/\s+/g, '_')}.png`;
    a.click();
    showToast('Spritesheet PNG downloaded!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in text-neutral-100">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">2D Spritesheet Studio</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-semibold">
                  PRO TOOLS
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Pack custom sprites, slice multi-block structures, and export texture atlases
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-neutral-800/80 rounded-lg p-1 border border-neutral-700">
            <button
              onClick={() => setActiveTab('multiregion')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'multiregion'
                  ? 'bg-purple-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Multi-Region Slicer</span>
            </button>

            <button
              onClick={() => setActiveTab('packer')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'packer'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Atlas Packer</span>
            </button>

            <button
              onClick={() => setActiveTab('slicer')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'slicer'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Multi-Block Slicer</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Atlas Coordinates</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="bg-cyan-950/90 border-b border-cyan-500/40 px-6 py-2 text-xs font-medium text-cyan-300 flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-900/60">
          
          {/* ========================================================= */}
          {/* TAB 0: MULTI-REGION & MULTI-GRID SLICER */}
          {/* ========================================================= */}
          {activeTab === 'multiregion' && (
            <MultiRegionSlicer
              onAddParallaxLayer={onAddParallaxLayer}
              onUpdateLevelBlueprints={onUpdateLevelBlueprints}
              showToast={showToast}
            />
          )}

          {/* ========================================================= */}
          {/* TAB 1: ATLAS PACKER & SPRITE MANAGER */}
          {/* ========================================================= */}
          {activeTab === 'packer' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Source Images & Settings */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                
                {/* Spritesheet Title & Presets */}
                <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-300">Spritesheet Name</label>
                    <button
                      onClick={handleCreateNewSheet}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> New Sheet
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-sm text-white focus:outline-none focus:border-cyan-500 font-medium"
                    placeholder="e.g. Castle Tiles & Traps"
                  />

                  {/* Padding & Options */}
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Sprite Padding</span>
                    <div className="flex items-center gap-2">
                      {[0, 2, 4, 8].map(p => (
                        <button
                          key={p}
                          onClick={() => setPackPadding(p)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer border ${
                            packPadding === p
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                          }`}
                        >
                          {p}px
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCompileSpritesheet}
                    disabled={sourceImages.length === 0 || isPacking}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-neutral-950 font-bold text-xs tracking-wide shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-1"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isPacking ? 'Packing Sprites...' : 'Pack & Generate Spritesheet'}</span>
                  </button>
                </div>

                {/* Source Images Queue */}
                <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-300">
                      Input Sprites ({sourceImages.length})
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-cyan-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Images
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleAddImagesFiles}
                      className="hidden"
                    />
                  </div>

                  {/* Images Drop/List */}
                  {sourceImages.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-neutral-700 rounded-xl p-6 text-center text-neutral-500 hover:border-cyan-500/60 hover:text-cyan-400 transition cursor-pointer flex flex-col items-center gap-2"
                    >
                      <ImageIcon className="w-8 h-8 opacity-60" />
                      <p className="text-xs font-medium">Click or Drag & Drop images here</p>
                      <span className="text-[10px] text-neutral-500">Supports PNG, JPG, WEBP with translucency</span>
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {sourceImages.map(img => (
                        <div
                          key={img.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <img
                              src={img.dataUrl}
                              alt={img.name}
                              className="w-7 h-7 object-contain rounded bg-neutral-950 border border-neutral-800"
                            />
                            <div className="flex flex-col truncate">
                              <span className="text-xs text-neutral-200 font-medium truncate">{img.name}</span>
                              <span className="text-[10px] text-neutral-500 font-mono">{img.width}×{img.height}px</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveSourceImage(img.id)}
                            className="p-1 text-neutral-500 hover:text-rose-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Existing Stored Sheets */}
                {savedSheets.length > 0 && (
                  <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-neutral-400">Library Spritesheets</span>
                    <div className="flex flex-wrap gap-1.5">
                      {savedSheets.map(s => (
                        <button
                          key={s.id}
                          onClick={() => loadSheet(s)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 border ${
                            selectedSheetId === s.id
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <span>{s.name}</span>
                          <span className="text-[10px] opacity-60">({s.sprites?.length || 0})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Spritesheet Canvas Preview & Inspector */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                
                {/* Atlas Preview Card */}
                <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-200">
                        {currentSheetData ? `Generated Atlas: ${currentSheetData.width}×${currentSheetData.height}px` : 'Compiled Sheet Preview'}
                      </span>
                      {currentSheetData && (
                        <span className="text-[10px] text-cyan-400 font-mono">
                          {currentSheetData.sprites?.length || 0} Sprites
                        </span>
                      )}
                    </div>
                    {currentSheetData && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDownloadSheetPng}
                          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> PNG
                        </button>
                        <button
                          onClick={handleDownloadAtlasJson}
                          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-cyan-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Atlas JSON
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Spritesheet Viewer Canvas Box */}
                  <div className="w-full min-h-[260px] max-h-[360px] overflow-auto rounded-xl bg-[#090d16] border border-neutral-800 p-4 flex items-center justify-center relative select-none">
                    {currentSheetData?.dataUrl ? (
                      <div className="relative inline-block border border-neutral-700/60 shadow-lg">
                        <img
                          src={currentSheetData.dataUrl}
                          alt="Spritesheet"
                          className="block max-w-none"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        {/* Interactive overlay boxes for each sprite */}
                        {currentSheetData.sprites?.map(spr => {
                          const isSel = selectedSprite?.id === spr.id;
                          return (
                            <div
                              key={spr.id}
                              onClick={() => setSelectedSprite(spr)}
                              className={`absolute border transition-all cursor-pointer ${
                                isSel
                                  ? 'border-cyan-400 bg-cyan-400/20 ring-2 ring-cyan-400/50 z-10'
                                  : 'border-cyan-500/30 hover:border-amber-400 hover:bg-amber-400/10'
                              }`}
                              style={{
                                left: `${spr.x}px`,
                                top: `${spr.y}px`,
                                width: `${spr.width}px`,
                                height: `${spr.height}px`
                              }}
                              title={`${spr.name} (${spr.width}x${spr.height}) at [${spr.x}, ${spr.y}]`}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-neutral-500 flex flex-col items-center gap-2">
                        <Grid className="w-10 h-10 opacity-30" />
                        <p className="text-xs">No spritesheet compiled yet</p>
                        <span className="text-[10px]">Add images on the left and click "Pack & Generate"</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Individual Sprite Inspector & Direct Blueprint Creator */}
                {selectedSprite && (
                  <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-neutral-900 border border-cyan-500/40 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-inner">
                        <img
                          src={selectedSprite.dataUrl}
                          alt={selectedSprite.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{selectedSprite.name}</span>
                        <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono mt-0.5">
                          <span>Size: {selectedSprite.width}×{selectedSprite.height}px</span>
                          <span>Pos: x:{selectedSprite.x}, y:{selectedSprite.y}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick convert buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleTurnSpriteIntoBlueprint(selectedSprite, 'block')}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                        title="Add as Solid Block Blueprint"
                      >
                        <Box className="w-3.5 h-3.5" />
                        <span>Solid Block</span>
                      </button>
                      <button
                        onClick={() => handleTurnSpriteIntoBlueprint(selectedSprite, 'hazard')}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                        title="Add as Hazard Spike / Trap Blueprint"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Hazard</span>
                      </button>
                      <button
                        onClick={() => handleTurnSpriteIntoBlueprint(selectedSprite, 'decor')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                        title="Add as Visual Decor Blueprint"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Decor</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: MULTI-BLOCK GRID SLICER */}
          {/* ========================================================= */}
          {activeTab === 'slicer' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Controls */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                  <span className="text-xs font-semibold text-neutral-300">Target Grid Dimensions</span>
                  
                  {/* Grid Columns & Rows */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-neutral-400">Width (Blocks: 1–32)</label>
                      <input
                        type="number"
                        min="1"
                        max="32"
                        value={slicerGridCols}
                        onChange={(e) => setSlicerGridCols(Math.max(1, Math.min(32, Number(e.target.value) || 1)))}
                        className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-sm text-cyan-300 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400">Height (Blocks: 1–32)</label>
                      <input
                        type="number"
                        min="1"
                        max="32"
                        value={slicerGridRows}
                        onChange={(e) => setSlicerGridRows(Math.max(1, Math.min(32, Number(e.target.value) || 1)))}
                        className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-sm text-cyan-300 font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { cols: 2, rows: 2, label: '2×2 (4 Blocks)' },
                      { cols: 3, rows: 2, label: '3×2 (6 Blocks)' },
                      { cols: 4, rows: 4, label: '4×4 (16 Blocks)' },
                      { cols: 8, rows: 8, label: '8×8 (64 Blocks)' },
                      { cols: 16, rows: 16, label: '16×16' },
                      { cols: 32, rows: 32, label: '32×32' }
                    ].map(p => (
                      <button
                        key={p.label}
                        onClick={() => {
                          setSlicerGridCols(p.cols);
                          setSlicerGridRows(p.rows);
                        }}
                        className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white hover:border-cyan-500/50 cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Base Name */}
                  <div className="mt-1">
                    <label className="text-[11px] text-neutral-400">Slice Prefix Name</label>
                    <input
                      type="text"
                      value={slicerBaseName}
                      onChange={(e) => setSlicerBaseName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-sm text-white font-medium"
                      placeholder="e.g. Castle Boss"
                    />
                  </div>

                  {/* Upload Image Button */}
                  <button
                    onClick={() => slicerFileInputRef.current?.click()}
                    className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-cyan-400 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition border border-neutral-700 mt-1"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Upload Image to Slice</span>
                  </button>
                  <input
                    ref={slicerFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSlicerImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Alignment & Zoom Controls */}
                <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                  <span className="text-xs font-semibold text-neutral-300">Align & Scale Image</span>
                  
                  {/* Zoom Scale */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs text-neutral-400">
                      <span>Scale / Zoom (Click digit to edit)</span>
                      {editingSlicerField === 'scale' ? (
                        <input
                          type="number"
                          autoFocus
                          step="1"
                          min="1"
                          max="3000"
                          value={tempSlicerVal}
                          onChange={(e) => setTempSlicerVal(e.target.value)}
                          onBlur={() => {
                            const val = parseFloat(tempSlicerVal);
                            if (!isNaN(val) && val > 0) {
                              setSlicerScale(Math.max(0.01, Math.min(30.0, val / 100)));
                            }
                            setEditingSlicerField(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = parseFloat(tempSlicerVal);
                              if (!isNaN(val) && val > 0) {
                                setSlicerScale(Math.max(0.01, Math.min(30.0, val / 100)));
                              }
                              setEditingSlicerField(null);
                            }
                          }}
                          className="w-20 px-1.5 py-0.5 rounded bg-neutral-900 border border-cyan-500 font-mono text-cyan-300 text-xs text-right font-bold"
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingSlicerField('scale');
                            setTempSlicerVal(String(Math.round(slicerScale * 100)));
                          }}
                          className="font-mono text-cyan-300 font-bold px-1.5 py-0.5 rounded hover:bg-neutral-800 cursor-pointer border border-transparent hover:border-cyan-500/40"
                          title="Click to type exact Scale %"
                        >
                          {Math.round(slicerScale * 100)}%
                        </span>
                      )}
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="16.0"
                      step="0.01"
                      value={slicerScale}
                      onChange={(e) => setSlicerScale(Number(e.target.value))}
                      className="accent-cyan-500 cursor-pointer"
                    />

                    {/* Scale Preset Buttons */}
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {[
                        { label: '25%', val: 0.25 },
                        { label: '50%', val: 0.5 },
                        { label: '100%', val: 1.0 },
                        { label: '200%', val: 2.0 },
                        { label: '400%', val: 4.0 },
                        { label: '800%', val: 8.0 },
                        { label: '1200%', val: 12.0 },
                        { label: '1600%', val: 16.0 }
                      ].map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setSlicerScale(preset.val)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition ${
                            Math.abs(slicerScale - preset.val) < 0.05
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Offset X and Offset Y with editable numbers */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="flex justify-between items-center text-neutral-400 mb-0.5">
                        <span className="text-[11px]">Offset X:</span>
                        {editingSlicerField === 'offsetX' ? (
                          <input
                            type="number"
                            autoFocus
                            value={tempSlicerVal}
                            onChange={(e) => setTempSlicerVal(e.target.value)}
                            onBlur={() => {
                              const val = parseInt(tempSlicerVal);
                              if (!isNaN(val)) setSlicerOffsetX(val);
                              setEditingSlicerField(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = parseInt(tempSlicerVal);
                                if (!isNaN(val)) setSlicerOffsetX(val);
                                setEditingSlicerField(null);
                              }
                            }}
                            className="w-14 px-1 py-0.5 rounded bg-neutral-900 border border-cyan-500 font-mono text-cyan-300 text-[11px] text-right font-bold"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingSlicerField('offsetX');
                              setTempSlicerVal(String(slicerOffsetX));
                            }}
                            className="font-mono text-cyan-300 font-bold px-1 py-0.5 rounded hover:bg-neutral-800 cursor-pointer"
                            title="Click to edit Offset X px"
                          >
                            {slicerOffsetX}px
                          </span>
                        )}
                      </div>
                      <input
                        type="range"
                        min="-1000"
                        max="1000"
                        value={slicerOffsetX}
                        onChange={(e) => setSlicerOffsetX(Number(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-neutral-400 mb-0.5">
                        <span className="text-[11px]">Offset Y:</span>
                        {editingSlicerField === 'offsetY' ? (
                          <input
                            type="number"
                            autoFocus
                            value={tempSlicerVal}
                            onChange={(e) => setTempSlicerVal(e.target.value)}
                            onBlur={() => {
                              const val = parseInt(tempSlicerVal);
                              if (!isNaN(val)) setSlicerOffsetY(val);
                              setEditingSlicerField(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = parseInt(tempSlicerVal);
                                if (!isNaN(val)) setSlicerOffsetY(val);
                                setEditingSlicerField(null);
                              }
                            }}
                            className="w-14 px-1 py-0.5 rounded bg-neutral-900 border border-cyan-500 font-mono text-cyan-300 text-[11px] text-right font-bold"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingSlicerField('offsetY');
                              setTempSlicerVal(String(slicerOffsetY));
                            }}
                            className="font-mono text-cyan-300 font-bold px-1 py-0.5 rounded hover:bg-neutral-800 cursor-pointer"
                            title="Click to edit Offset Y px"
                          >
                            {slicerOffsetY}px
                          </span>
                        )}
                      </div>
                      <input
                        type="range"
                        min="-1000"
                        max="1000"
                        value={slicerOffsetY}
                        onChange={(e) => setSlicerOffsetY(Number(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Quick Fit Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const img = slicerImgRef.current;
                        if (!img) return;
                        const targetW = slicerGridCols * slicerBlockSize;
                        const s = targetW / img.naturalWidth;
                        setSlicerScale(s);
                        setSlicerOffsetX(0);
                        setSlicerOffsetY(0);
                      }}
                      className="flex-1 py-1 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white cursor-pointer"
                    >
                      Fit Width
                    </button>
                    <button
                      onClick={() => {
                        const img = slicerImgRef.current;
                        if (!img) return;
                        const targetH = slicerGridRows * slicerBlockSize;
                        const s = targetH / img.naturalHeight;
                        setSlicerScale(s);
                        setSlicerOffsetX(0);
                        setSlicerOffsetY(0);
                      }}
                      className="flex-1 py-1 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white cursor-pointer"
                    >
                      Fit Height
                    </button>
                    <button
                      onClick={() => {
                        setSlicerOffsetX(0);
                        setSlicerOffsetY(0);
                      }}
                      className="py-1 px-2 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Confirm Slice Button */}
                  <button
                    onClick={handleExecuteSlice}
                    disabled={!slicerImageLoaded}
                    className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>Confirm & Slice into {slicerGridCols * slicerGridRows} Blocks</span>
                  </button>
                </div>
              </div>

              {/* Slicer Workspace View */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-200">
                      Grid Slicer View: {slicerGridCols * slicerBlockSize}×{slicerGridRows * slicerBlockSize}px
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Drag or use sliders to align image inside the {slicerGridCols}×{slicerGridRows} block frame
                    </span>
                  </div>

                  {/* Canvas Container */}
                  <div className="w-full min-h-[300px] overflow-auto rounded-xl bg-[#090d16] border border-neutral-800 p-6 flex items-center justify-center relative">
                    <canvas
                      ref={slicerCanvasRef}
                      className="border-2 border-cyan-500 shadow-2xl rounded"
                    />
                  </div>
                </div>

                {/* Sliced Blocks Result Grid */}
                {slicerSlicedBlocks.length > 0 && (
                  <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        Generated Individual Block Sprites ({slicerSlicedBlocks.length})
                      </span>
                      <button
                        onClick={() => handleAddAllSlicesAsBlueprints('block')}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add All to Blueprints</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {slicerSlicedBlocks.map((blk) => (
                        <div
                          key={blk.id}
                          className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 flex flex-col items-center gap-1.5 hover:border-cyan-500/50 transition"
                        >
                          <div className="w-12 h-12 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-center p-0.5 overflow-hidden">
                            <img src={blk.dataUrl} alt={blk.name} className="max-w-full max-h-full object-contain" />
                          </div>
                          <span className="text-[10px] text-neutral-300 font-medium text-center truncate w-full">
                            {blk.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: ATLAS COORDINATES & EXPORT */}
          {/* ========================================================= */}
          {activeTab === 'export' && (
            <div className="flex flex-col gap-4">
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">Atlas Mapping Coordinates & Data</h3>
                    <p className="text-xs text-neutral-400">
                      Locations, bounding boxes, and dimensions for every image on the sheet
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-neutral-900 rounded-lg p-0.5 border border-neutral-800">
                      {['json', 'csv', 'text'].map(fmt => (
                        <button
                          key={fmt}
                          onClick={() => setExportFormat(fmt)}
                          className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition cursor-pointer ${
                            exportFormat === fmt
                              ? 'bg-cyan-500 text-neutral-950 font-bold'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleCopyAtlasText}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition border border-neutral-700"
                    >
                      {hasCopiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{hasCopiedText ? 'Copied!' : 'Copy to Clipboard'}</span>
                    </button>

                    <button
                      onClick={handleDownloadAtlasJson}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download JSON</span>
                    </button>
                  </div>
                </div>

                {/* Text View Area */}
                <textarea
                  readOnly
                  value={atlasText || '// No compiled spritesheet available. Pack images in Atlas Packer first.'}
                  className="w-full h-96 p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-cyan-200 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/70 flex items-center justify-between text-xs text-neutral-400">
          <span>All spritesheets and sliced blocks are stored locally and packaged with your level.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold cursor-pointer transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
