import React, { useState, useMemo, useEffect } from 'react';
import {
  Folder, Box, ShieldAlert, Sparkles, CircleDot, ArrowUpCircle,
  Coins, Plus, Search, Archive, Edit3, Trash2, Sliders, ChevronDown,
  ChevronRight, Layers, LayoutGrid, Check, Info, Maximize2, Minimize2
} from 'lucide-react';
import PaletteItemPreview from '../PaletteItemPreview.jsx';
import BlueprintCreatorModal from './BlueprintCreatorModal.jsx';
import ZipImportModal from './ZipImportModal.jsx';
import { getSavedBlueprints, upsertBlueprint, deleteBlueprint } from '../../utils/customAssetsManager.js';

export default function AssetBrowser({
  categories = [],
  activeCategory = 'blocks',
  onSelectCategory,
  activeEnvironment = 'neon',
  onSelectEnvironment,
  selectedObjectType = 'block_neon',
  onSelectObjectType,
  customBlueprints = [],
  onUpdateCustomBlueprints,
  activeTab = 'builtin', // 'builtin' | 'custom'
  onChangeTab,
  isCollapsed = false,
  onToggleCollapse
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [editingBlueprint, setEditingBlueprint] = useState(null);
  const [blueprintFilter, setBlueprintFilter] = useState('all'); // 'all' | 'block' | 'hazard' | 'decor' | 'orb' | 'pad' | 'collectable'
  const [deletingBlueprintId, setDeletingBlueprintId] = useState(null);

  // Ensure local blueprints are synced
  const [savedBlueprints, setSavedBlueprints] = useState(() => getSavedBlueprints());

  useEffect(() => {
    const list = getSavedBlueprints();
    setSavedBlueprints(list);
    if ((!customBlueprints || customBlueprints.length === 0) && list.length > 0) {
      onUpdateCustomBlueprints?.(list);
    }
  }, []);

  const allBlueprints = useMemo(() => {
    // Merge customBlueprints from level with saved blueprints
    const map = new Map();
    (savedBlueprints || []).forEach(b => map.set(b.id, b));
    (customBlueprints || []).forEach(b => map.set(b.id, b));
    return Array.from(map.values());
  }, [savedBlueprints, customBlueprints]);

  // Active Category Data from built-in
  const currentCategoryObj = useMemo(() => {
    return categories.find(c => c.id === activeCategory) || categories[0];
  }, [categories, activeCategory]);

  // Current items in selected environment or all category items
  const currentBuiltinItems = useMemo(() => {
    if (!currentCategoryObj) return [];
    if (currentCategoryObj.environments) {
      const env = currentCategoryObj.environments.find(e => e.id === activeEnvironment) || currentCategoryObj.environments[0];
      return env?.items || [];
    }
    return currentCategoryObj.items || [];
  }, [currentCategoryObj, activeEnvironment]);

  // Filtered built-in items based on search
  const filteredBuiltinItems = useMemo(() => {
    if (!searchQuery.trim()) return currentBuiltinItems;
    const q = searchQuery.toLowerCase();
    return currentBuiltinItems.filter(item =>
      item.label?.toLowerCase().includes(q) || item.type?.toLowerCase().includes(q)
    );
  }, [currentBuiltinItems, searchQuery]);

  // Filtered custom blueprints
  const filteredBlueprints = useMemo(() => {
    return allBlueprints.filter(bp => {
      if (blueprintFilter !== 'all' && bp.role !== blueprintFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return bp.name?.toLowerCase().includes(q) || bp.tag?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allBlueprints, blueprintFilter, searchQuery]);

  const handleSaveNewBlueprint = (bp) => {
    const updated = upsertBlueprint(bp);
    setSavedBlueprints(updated);
    onUpdateCustomBlueprints?.(updated);
    // Select the new blueprint immediately
    onSelectObjectType?.(bp.id);
  };

  const handleTriggerDeleteBlueprint = (e, bpId) => {
    e.stopPropagation();
    setDeletingBlueprintId(bpId);
  };

  const handleConfirmDeleteBlueprint = (e, bpId) => {
    e.stopPropagation();
    try {
      const updated = deleteBlueprint(bpId);
      setSavedBlueprints(updated);
      const filteredLevel = (customBlueprints || []).filter(b => b.id !== bpId);
      onUpdateCustomBlueprints?.(filteredLevel);
      if (selectedObjectType === bpId) {
        onSelectObjectType?.('block');
      }
      setDeletingBlueprintId(null);
    } catch (err) {
      console.warn('Error deleting blueprint:', err);
    }
  };

  const handleCancelDeleteBlueprint = (e) => {
    e.stopPropagation();
    setDeletingBlueprintId(null);
  };

  const handleImportZipAssets = (importedBlueprints) => {
    let current = [...savedBlueprints];
    importedBlueprints.forEach(bp => {
      current = upsertBlueprint(bp);
    });
    setSavedBlueprints(current);
    onUpdateCustomBlueprints?.(current);
    if (importedBlueprints.length > 0) {
      onSelectObjectType?.(importedBlueprints[0].id);
    }
  };

  return (
    <div className="flex flex-col bg-neutral-900 border-t border-neutral-800 text-neutral-200 select-none shadow-2xl relative z-20">
      
      {/* Top Browser Bar: Folder Tabs, Search, Actions, Minimize Toggle */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-950/80 border-b border-neutral-800/80 gap-3 text-xs">
        
        {/* Left: Source Tabs (Built-in Assets vs Custom Blueprints) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            id="tab-builtin-assets"
            onClick={() => {
              onChangeTab('builtin');
            }}
            className={`px-3 py-1 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'builtin'
                ? 'bg-cyan-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Built-in Assets</span>
          </button>

          <button
            type="button"
            id="tab-custom-blueprints"
            onClick={() => {
              onChangeTab('custom');
            }}
            className={`px-3 py-1 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-amber-400 hover:text-amber-300 hover:bg-neutral-800'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300" />
            <span>Custom Blueprints ({allBlueprints.length})</span>
          </button>
        </div>

        {/* Center: Search Field */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'builtin' ? 'Filter items...' : 'Search blueprints...'}
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Right: Custom Blueprint CTA buttons & Collapse */}
        <div className="flex items-center gap-2">
          {activeTab === 'custom' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingBlueprint(null);
                  setIsCreatorOpen(true);
                }}
                className="px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
                title="Create a new custom asset or animated sprite"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Blueprint</span>
              </button>

              <button
                type="button"
                onClick={() => setIsZipModalOpen(true)}
                className="px-2.5 py-1 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg border border-neutral-700 transition flex items-center gap-1 cursor-pointer"
                title="Import ZIP archive or direct asset URL"
              >
                <Archive className="w-3.5 h-3.5 text-amber-400" />
                <span>Import ZIP / URL</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            title={isCollapsed ? 'Expand Asset Browser' : 'Collapse Asset Browser'}
          >
            {isCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>

      {/* Main Drawer Body (Collapsible) */}
      {!isCollapsed && (
        <div className="flex h-36 border-neutral-800 overflow-hidden">
          
          {/* Left Sidebar: Categories & Environments */}
          {activeTab === 'builtin' ? (
            <div className="w-56 bg-neutral-950/60 border-r border-neutral-800 flex flex-col overflow-y-auto p-1.5 gap-1">
              {categories.map(cat => {
                const isCatActive = activeCategory === cat.id;
                return (
                  <div key={cat.id} className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => onSelectCategory(cat.id)}
                      className={`w-full px-2 py-1 text-left rounded-lg text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                        isCatActive
                          ? 'bg-neutral-800 text-cyan-400'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                      }`}
                    >
                      <span>{cat.name}</span>
                      {cat.environments && (
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {cat.environments.length} sets
                        </span>
                      )}
                    </button>

                    {/* Sub-environments list if active */}
                    {isCatActive && cat.environments && (
                      <div className="pl-3 py-0.5 space-y-0.5 border-l border-neutral-800 ml-2">
                        {cat.environments.map(env => (
                          <button
                            key={env.id}
                            type="button"
                            onClick={() => onSelectEnvironment(env.id)}
                            className={`w-full px-2 py-0.5 text-left text-[11px] rounded transition cursor-pointer truncate ${
                              activeEnvironment === env.id
                                ? 'text-cyan-300 font-bold bg-cyan-950/40 border-l-2 border-cyan-400'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            {env.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Left Sidebar for Custom Blueprints: Filter Roles */
            <div className="w-48 bg-neutral-950/60 border-r border-neutral-800 flex flex-col p-1.5 gap-0.5 text-xs">
              <span className="px-2 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                Filter by Role
              </span>
              {[
                { id: 'all', label: 'All Assets' },
                { id: 'block', label: 'Solid Blocks' },
                { id: 'hazard', label: 'Hazards & Spikes' },
                { id: 'decor', label: 'Visual Decor' },
                { id: 'orb', label: 'Jump Orbs' },
                { id: 'pad', label: 'Launch Pads' },
                { id: 'collectable', label: 'Coins & Relics' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBlueprintFilter(f.id)}
                  className={`w-full px-2 py-1 text-left rounded-lg transition cursor-pointer text-xs font-medium ${
                    blueprintFilter === f.id
                      ? 'bg-amber-950/50 text-amber-300 border-l-2 border-amber-400 font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Right Area: Asset Cards Grid */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-2 flex items-center gap-2">
            
            {activeTab === 'builtin' ? (
              filteredBuiltinItems.length > 0 ? (
                filteredBuiltinItems.map(item => {
                  const isSelected = selectedObjectType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => onSelectObjectType(item.type)}
                      className={`flex-shrink-0 w-24 h-28 rounded-xl border p-1.5 flex flex-col items-center justify-between text-center transition cursor-pointer group ${
                        isSelected
                          ? 'bg-neutral-800 border-cyan-500 shadow-md ring-2 ring-cyan-500/50'
                          : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-neutral-900/80 overflow-hidden shadow-inner">
                        <PaletteItemPreview
                          type={item.type}
                          size={44}
                          isSelected={isSelected}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-white truncate w-full px-1">
                        {item.label}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="flex items-center justify-center w-full text-xs text-neutral-500">
                  No built-in items match "{searchQuery}"
                </div>
              )
            ) : (
              /* Custom Blueprints Cards */
              filteredBlueprints.length > 0 ? (
                filteredBlueprints.map(bp => {
                  const isSelected = selectedObjectType === bp.id;
                  return (
                    <div
                      key={bp.id}
                      onClick={() => onSelectObjectType(bp.id)}
                      className={`flex-shrink-0 w-28 h-28 rounded-xl border p-1.5 flex flex-col items-center justify-between text-center transition cursor-pointer group relative ${
                        isSelected
                          ? 'bg-neutral-800 border-amber-500 shadow-md ring-2 ring-amber-500/50'
                          : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      {/* Image Preview */}
                      <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-neutral-900/90 overflow-hidden shadow-inner relative">
                        {bp.imageUrl ? (
                          <img
                            src={bp.imageUrl}
                            alt={bp.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Box className="w-6 h-6 text-neutral-500" />
                        )}
                        {bp.isAnimated && (
                          <span className="absolute bottom-0 right-0 text-[8px] bg-cyan-950/90 text-cyan-400 font-bold px-1 rounded-tl">
                            ANIM
                          </span>
                        )}
                      </div>

                      {/* Name & Role label */}
                      <div className="w-full px-0.5">
                        <span className="text-[11px] font-bold text-white truncate block w-full">
                          {bp.name}
                        </span>
                        <span className="text-[9px] text-amber-400 uppercase tracking-wide block truncate">
                          {bp.role}
                        </span>
                      </div>

                      {/* Action buttons on hover */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 bg-neutral-900/90 rounded p-0.5 border border-neutral-700">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBlueprint(bp);
                            setIsCreatorOpen(true);
                          }}
                          className="p-1 hover:text-cyan-400 text-neutral-400"
                          title="Edit Blueprint"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleTriggerDeleteBlueprint(e, bp.id)}
                          className="p-1 hover:text-rose-400 text-neutral-400"
                          title="Delete Blueprint"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Inline Delete Confirmation Overlay */}
                      {deletingBlueprintId === bp.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute inset-0 bg-neutral-950/95 rounded-xl border border-rose-500/80 p-1.5 flex flex-col items-center justify-center gap-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <span className="text-[10px] font-bold text-rose-300">Delete asset?</span>
                          <div className="flex items-center gap-1 w-full">
                            <button
                              type="button"
                              onClick={(e) => handleConfirmDeleteBlueprint(e, bp.id)}
                              className="flex-1 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold shadow transition cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelDeleteBlueprint}
                              className="flex-1 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-bold transition cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center w-full gap-2 text-xs text-neutral-500">
                  <p>No custom blueprints found.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBlueprint(null);
                      setIsCreatorOpen(true);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Your First Blueprint</span>
                  </button>
                </div>
              )
            )}

          </div>

        </div>
      )}

      {/* Blueprint Creator Modal */}
      <BlueprintCreatorModal
        isOpen={isCreatorOpen}
        onClose={() => {
          setIsCreatorOpen(false);
          setEditingBlueprint(null);
        }}
        onSave={handleSaveNewBlueprint}
        onDelete={(bpId) => {
          handleConfirmDeleteBlueprint({ stopPropagation: () => {} }, bpId);
          setIsCreatorOpen(false);
          setEditingBlueprint(null);
        }}
        initialBlueprint={editingBlueprint}
      />

      {/* ZIP / URL Importer Modal */}
      <ZipImportModal
        isOpen={isZipModalOpen}
        onClose={() => setIsZipModalOpen(false)}
        onImportAssets={handleImportZipAssets}
      />

    </div>
  );
}
