/**
 * Community Level Browser (Vanilla JS / React).
 * Browse curated community levels, created levels, import/export codes, search, and filter.
 */

import { useState } from 'react';
import { BUILTIN_COMMUNITY_LEVELS } from '../constants/gameDefaults.js';
import { parseAndValidateLevelString } from '../utils/levelValidator.js';
import {
  Play,
  Edit3,
  Plus,
  Search,
  Download,
  Trash2,
  Heart,
  Upload,
  Trophy,
  Flame,
  CheckCircle2,
  Share2
} from 'lucide-react';

export default function CommunityBrowser({
  customLevels = [],
  progressStats = {},
  onSelectPlayLevel,
  onSelectEditLevel,
  onCreateNewLevel,
  onDeleteCustomLevel,
  onImportLevel
}) {
  const [activeTab, setActiveTab] = useState('community'); // 'community', 'my_levels'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [localLikes, setLocalLikes] = useState({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState(null);
  const [copyToast, setCopyToast] = useState(null);

  const allLevels = activeTab === 'community' ? BUILTIN_COMMUNITY_LEVELS : customLevels;

  const filteredLevels = allLevels.filter(lvl => {
    if (!lvl) return false;
    const matchesSearch = lvl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lvl.creator.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiff = selectedDifficulty === 'All' || lvl.difficulty === selectedDifficulty;
    return matchesSearch && matchesDiff;
  });

  const handleLike = (lvlId, initialLikes = 0) => {
    setLocalLikes(prev => ({
      ...prev,
      [lvlId]: (prev[lvlId] || initialLikes) + 1
    }));
  };

  const handleCopyCode = (lvl) => {
    try {
      const str = JSON.stringify(lvl, null, 2);
      navigator.clipboard.writeText(str).then(() => {
        setCopyToast(lvl.id);
        setTimeout(() => setCopyToast(null), 2000);
      });
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleDoImport = () => {
    setImportError(null);
    const res = parseAndValidateLevelString(importText);
    if (!res.valid) {
      setImportError(res.error || 'Invalid level JSON data.');
      return;
    }
    if (typeof onImportLevel === 'function') {
      onImportLevel(res.level);
    }
    setShowImportModal(false);
    setImportText('');
  };

  const getDifficultyBadge = (diff) => {
    const styles = {
      Easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      Hard: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      Insane: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      Demon: 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-extrabold shadow-sm shadow-purple-500/20',
    }[diff] || 'bg-neutral-800 text-neutral-300 border-neutral-700';

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${styles}`}>
        {diff}
      </span>
    );
  };

  return (
    <div id="community-browser-container" className="fixed inset-0 z-30 bg-neutral-950/95 flex flex-col p-6 overflow-hidden text-neutral-100">
      
      {/* Header Bar */}
      <div className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-wide flex items-center gap-3">
            <Flame className="w-7 h-7 text-cyan-400" /> Community Level Hub
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Browse handcrafted rhythm obstacle courses or design your own for the community
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="community-import-btn"
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 border border-neutral-700 transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> Import JSON
          </button>

          <button
            id="create-new-level-btn"
            onClick={onCreateNewLevel}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Level
          </button>
        </div>
      </div>

      {/* Navigation Tabs & Search/Filter Controls */}
      <div className="max-w-6xl w-full mx-auto py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Hub Tabs */}
        <div className="flex items-center p-1 bg-neutral-900 rounded-xl border border-neutral-800 w-full sm:w-auto">
          <button
            id="tab-community-levels"
            onClick={() => setActiveTab('community')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'community'
                ? 'bg-neutral-800 text-cyan-400 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Community Catalog ({BUILTIN_COMMUNITY_LEVELS.length})
          </button>
          <button
            id="tab-my-levels"
            onClick={() => setActiveTab('my_levels')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'my_levels'
                ? 'bg-neutral-800 text-cyan-400 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            My Levels ({customLevels.length})
          </button>
        </div>

        {/* Search Input & Difficulty Filter */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-levels-input"
              placeholder="Search level or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <select
            id="filter-difficulty-select"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 focus:outline-none"
          >
            {['All', 'Easy', 'Medium', 'Hard', 'Insane', 'Demon'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Level Cards Grid */}
      <div className="max-w-6xl w-full mx-auto flex-1 overflow-y-auto pr-1 pb-6 space-y-3">
        {filteredLevels.length === 0 ? (
          <div className="text-center py-16 bg-neutral-900/40 rounded-2xl border border-neutral-800">
            <Trophy className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <div className="text-sm font-bold text-neutral-300">No levels found</div>
            <p className="text-xs text-neutral-500 mt-1">
              {activeTab === 'my_levels'
                ? 'You have not created or imported any custom levels yet.'
                : 'Try adjusting your search query or difficulty filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLevels.map((lvl) => {
              const stats = progressStats[lvl.id] || { bestPercent: 0, attempts: 0, isCleared: false };
              const likes = localLikes[lvl.id] !== undefined ? localLikes[lvl.id] : (lvl.likes || 0);

              return (
                <div
                  key={lvl.id}
                  id={`level-card-${lvl.id}`}
                  className="p-5 rounded-2xl bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-white font-display group-hover:text-cyan-400 transition">
                            {lvl.name}
                          </h3>
                          {stats.isCleared && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                              <CheckCircle2 className="w-3 h-3" /> Cleared
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          By <span className="text-neutral-200 font-semibold">{lvl.creator || 'Community'}</span>
                        </div>
                      </div>

                      {getDifficultyBadge(lvl.difficulty)}
                    </div>

                    {/* Level Meta info */}
                    <div className="flex items-center gap-4 text-xs text-neutral-400 font-mono my-3">
                      <span>BPM: <strong className="text-neutral-200">{lvl.bpm}</strong></span>
                      <span>Length: <strong className="text-neutral-200">{lvl.length}b</strong></span>
                      <span>Objects: <strong className="text-neutral-200">{lvl.objects?.length || 0}</strong></span>
                    </div>

                    {/* Player Progress Bar */}
                    <div className="mt-2 mb-4">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1 font-mono">
                        <span>Best: <strong className="text-cyan-400">{stats.bestPercent || 0}%</strong></span>
                        <span>Attempts: <strong className="text-neutral-300">{stats.attempts || 0}</strong></span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, stats.bestPercent || 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions Strip */}
                  <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        id={`like-btn-${lvl.id}`}
                        onClick={() => handleLike(lvl.id, lvl.likes)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-xs text-neutral-400 hover:text-rose-400 transition"
                      >
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        <span className="font-mono text-[11px]">{likes}</span>
                      </button>

                      <button
                        id={`copy-code-btn-${lvl.id}`}
                        onClick={() => handleCopyCode(lvl)}
                        className="p-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                        title="Copy Level JSON"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {copyToast === lvl.id && (
                        <span className="text-[10px] text-cyan-400 font-semibold">Copied!</span>
                      )}

                      {/* Delete option for custom levels */}
                      {activeTab === 'my_levels' && (
                        <button
                          id={`delete-level-${lvl.id}`}
                          onClick={() => {
                            if (window.confirm(`Delete level "${lvl.name}"?`)) {
                              onDeleteCustomLevel(lvl.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-neutral-800/60 hover:bg-red-950/50 text-neutral-400 hover:text-red-400 transition"
                          title="Delete Level"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id={`edit-level-${lvl.id}`}
                        onClick={() => onSelectEditLevel(lvl)}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>

                      <button
                        id={`play-level-${lvl.id}`}
                        onClick={() => onSelectPlayLevel(lvl)}
                        className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Play
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* IMPORT JSON MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-cyan-400" /> Import Community Level
            </h3>
            <p className="text-xs text-neutral-400">
              Paste level JSON string from clipboard to add it to your local level catalog.
            </p>

            <textarea
              id="community-import-textarea"
              placeholder="Paste JSON here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={7}
              className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
            />

            {importError && (
              <div className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800">
                {importError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                id="cancel-community-import-modal"
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setImportError(null);
                }}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300"
              >
                Cancel
              </button>
              <button
                id="submit-community-import"
                onClick={handleDoImport}
                disabled={!importText.trim()}
                className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-neutral-950 font-bold text-xs uppercase"
              >
                Import & Add Level
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
