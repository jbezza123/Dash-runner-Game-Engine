/**
 * Dash Runner - Main Application Coordinator (Vanilla JS / React).
 * Controls game modes, campaign level select, records, character skin customizer, and settings.
 */

import { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas.jsx';
import LevelEditor from './components/LevelEditor.jsx';
import SkinCustomizer from './components/SkinCustomizer.jsx';
import CommunityBrowser from './components/CommunityBrowser.jsx';
import CampaignLevelSelect from './components/CampaignLevelSelect.jsx';
import RecordsModal from './components/RecordsModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ExternalMusicPanel from './components/ExternalMusic/ExternalMusicPanel.jsx';
import RotateDevicePrompt from './components/RotateDevicePrompt.jsx';
import menuBackgroundImg from './assets/images/menu_background_1789657655959.jpg';

import {
  DEFAULT_SKIN,
  BUILTIN_COMMUNITY_LEVELS
} from './constants/gameDefaults.js';
import {
  safeGetItem,
  safeSetItem,
  STORAGE_KEYS
} from './utils/storage.js';
import { validateLevelData } from './utils/levelValidator.js';
import { soundEngine } from './engine/audioEngine.js';
import { calculateCollectivePlayerStats, recordRealPlayerRun } from './utils/leaderboards.js';

import {
  Play,
  Hammer,
  Sparkles,
  Compass,
  Trophy,
  Volume2,
  VolumeX,
  Flame,
  Settings,
  Coins,
  CheckCircle2,
  Gamepad2,
  HelpCircle,
  Music
} from 'lucide-react';

export default function App() {
  // Current view: 'menu', 'campaign', 'play', 'editor', 'community', 'music'
  const [activeView, setActiveView] = useState('menu');

  // Equipped character skin
  const [equippedSkin, setEquippedSkin] = useState(() => {
    return safeGetItem(STORAGE_KEYS.SKIN, DEFAULT_SKIN);
  });

  // User authored or imported custom levels
  const [customLevels, setCustomLevels] = useState(() => {
    return safeGetItem(STORAGE_KEYS.CUSTOM_LEVELS, []);
  });

  // Player movement trajectory recorded during playtest to assist editor placements
  const [editorTrajectory, setEditorTrajectory] = useState(null);

  // Persistent progress records: { [levelId]: { bestPercent, attempts, isCleared, coins, bestTimeMs } }
  const [progressStats, setProgressStats] = useState(() => {
    return safeGetItem(STORAGE_KEYS.SAVED_PROGRESS, {});
  });

  // Player callsign name
  const [playerName, setPlayerName] = useState(() => {
    return safeGetItem('dash_runner_player_name_v1', 'NeonRunner');
  });

  // Active level being played or edited
  const [currentLevel, setCurrentLevel] = useState(BUILTIN_COMMUNITY_LEVELS[0]);

  // Origin of active gameplay ('menu' | 'campaign' | 'editor' | 'community')
  const [playOrigin, setPlayOrigin] = useState('campaign');

  // Modal toggles
  const [showSkinModal, setShowSkinModal] = useState(false);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [recordsInitialLevelId, setRecordsInitialLevelId] = useState(null);

  // Audio mute state
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted);

  // Handle skin saving
  const handleSaveSkin = (newSkin) => {
    setEquippedSkin(newSkin);
    safeSetItem(STORAGE_KEYS.SKIN, newSkin);
  };

  // Handle player name update
  const handleUpdatePlayerName = (newName) => {
    setPlayerName(newName);
    safeSetItem('dash_runner_player_name_v1', newName);
  };

  // Reset all campaign progress
  const handleResetProgress = () => {
    setProgressStats({});
    safeSetItem(STORAGE_KEYS.SAVED_PROGRESS, {});
  };

  // Save level progress stats
  const handleSaveProgress = (levelId, { bestPercent, isCleared, attempts, coinsCollected, timeMs }) => {
    if (!levelId) return;

    setProgressStats(prev => {
      const existing = prev[levelId] || { bestPercent: 0, attempts: 0, isCleared: false, coins: 0, bestTimeMs: null };
      const updatedCoins = Math.max(existing.coins || 0, coinsCollected || 0);
      let updatedBestTime = existing.bestTimeMs || null;
      if (timeMs && isCleared) {
        updatedBestTime = updatedBestTime ? Math.min(updatedBestTime, timeMs) : timeMs;
        recordRealPlayerRun(levelId, {
          timeMs,
          coins: updatedCoins,
          attempts: (existing.attempts || 0) + (attempts || 1),
          playerName: 'Runner'
        });
      }

      const updated = {
        ...prev,
        [levelId]: {
          bestPercent: Math.max(existing.bestPercent || 0, bestPercent || 0),
          attempts: (existing.attempts || 0) + (attempts || 1),
          isCleared: existing.isCleared || Boolean(isCleared),
          coins: updatedCoins,
          bestTimeMs: updatedBestTime,
          lastPlayed: new Date().toISOString()
        }
      };
      safeSetItem(STORAGE_KEYS.SAVED_PROGRESS, updated);
      return updated;
    });
  };

  // Save custom level from editor
  const handleSaveCustomLevel = (levelToSave) => {
    const validated = validateLevelData(levelToSave);
    if (!validated.valid || !validated.level) {
      console.error('Invalid level data:', validated.error);
      return;
    }

    setCustomLevels(prev => {
      const existingIndex = prev.findIndex(l => l.id === validated.level.id);
      let updated;
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = validated.level;
      } else {
        updated = [validated.level, ...prev];
      }
      safeSetItem(STORAGE_KEYS.CUSTOM_LEVELS, updated);
      return updated;
    });
  };

  // Delete custom level
  const handleDeleteCustomLevel = (levelId) => {
    setCustomLevels(prev => {
      const updated = prev.filter(l => l.id !== levelId);
      safeSetItem(STORAGE_KEYS.CUSTOM_LEVELS, updated);
      return updated;
    });
  };

  // Import community level
  const handleImportLevel = (newLevel) => {
    const validated = validateLevelData(newLevel);
    if (!validated.valid || !validated.level) return;

    setCustomLevels(prev => {
      const updated = [validated.level, ...prev.filter(l => l.id !== validated.level.id)];
      safeSetItem(STORAGE_KEYS.CUSTOM_LEVELS, updated);
      return updated;
    });
  };

  // Launch playtest from editor
  const handlePlaytestFromEditor = (level) => {
    setCurrentLevel(level);
    setPlayOrigin('editor');
    setActiveView('play');
  };

  // Launch level from campaign select
  const handlePlayLevelFromCampaign = (level, isPractice = false) => {
    setCurrentLevel(level);
    setPlayOrigin('campaign');
    setActiveView('play');
  };

  // Launch level from community browser
  const handlePlayLevelFromHub = (level) => {
    setCurrentLevel(level);
    setPlayOrigin('community');
    setActiveView('play');
  };

  // Launch edit level from community browser
  const handleEditLevelFromHub = (level) => {
    setEditorTrajectory(null);
    setCurrentLevel(level);
    setActiveView('editor');
  };

  // Start new empty level in editor
  const handleCreateNewLevel = () => {
    setEditorTrajectory(null);
    const newLvl = {
      id: `custom_${Date.now()}`,
      name: 'My New Course',
      creator: playerName || 'Player',
      difficulty: 'Medium',
      bpm: 130,
      theme: 'cyber_cyan',
      length: 120,
      verified: false,
      gameStyle: 'runner',
      chaseHazard: { type: 'none', speed: 290, delay: 1.8 },
      objects: [
        { type: 'finish_gate', x: 110, y: 1 }
      ]
    };
    setCurrentLevel(newLvl);
    setActiveView('editor');
  };

  // Return to editor from playtest, capturing movement trajectory & verification
  const handleReturnToEditor = (result = null) => {
    if (result && typeof result === 'object') {
      if (Array.isArray(result.trajectory) && result.trajectory.length > 0) {
        setEditorTrajectory(result.trajectory);
      }
      if (result.verified) {
        setCurrentLevel(prev => {
          if (!prev) return prev;
          const updated = { ...prev, verified: true, verifiedAt: new Date().toISOString() };
          handleSaveCustomLevel(updated);
          return updated;
        });
      }
    }
    setActiveView('editor');
  };

  const toggleSoundMute = () => {
    const nextMute = soundEngine.toggleMute();
    setIsMuted(nextMute);
  };

  // Open records modal optionally focused on a specific level
  const handleOpenRecords = (levelId = null) => {
    setRecordsInitialLevelId(levelId);
    setShowRecordsModal(true);
  };

  // Calculate overall player statistics for the clean main menu footer
  const collectiveStats = calculateCollectivePlayerStats(BUILTIN_COMMUNITY_LEVELS, progressStats);

  return (
    <div id="app-root-container" className="w-full h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans overflow-hidden select-none">
      
      {/* VIEW 1: ACTIVE GAMEPLAY */}
      {activeView === 'play' && currentLevel && (
        <GameCanvas
          level={currentLevel}
          skin={equippedSkin}
          isPlaytest={playOrigin === 'editor'}
          onReturnToEditor={handleReturnToEditor}
          onExitToMenu={() => {
            if (playOrigin === 'campaign') setActiveView('campaign');
            else if (playOrigin === 'community') setActiveView('community');
            else setActiveView('menu');
          }}
          onSaveProgress={handleSaveProgress}
          onOpenSkinCustomizer={() => setShowSkinModal(true)}
        />
      )}

      {/* VIEW 2: CAMPAIGN LEVEL SELECT (Mobile-game style square icon grid) */}
      {activeView === 'campaign' && (
        <CampaignLevelSelect
          levels={BUILTIN_COMMUNITY_LEVELS}
          progressStats={progressStats}
          onSelectLevel={handlePlayLevelFromCampaign}
          onBack={() => setActiveView('menu')}
          onOpenRecords={handleOpenRecords}
        />
      )}

      {/* VIEW 3: LEVEL EDITOR */}
      {activeView === 'editor' && currentLevel && (
        <LevelEditor
          initialLevel={currentLevel}
          onPlaytest={handlePlaytestFromEditor}
          onSaveLevel={handleSaveCustomLevel}
          onExit={() => setActiveView('menu')}
          trajectory={editorTrajectory}
          onClearTrajectory={() => setEditorTrajectory(null)}
        />
      )}

      {/* VIEW 4: COMMUNITY BROWSER */}
      {activeView === 'community' && (
        <>
          <div className="absolute top-6 left-6 z-40">
            <button
              id="exit-community-hub-btn"
              onClick={() => setActiveView('menu')}
              className="px-3.5 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-300 transition shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              ← Back to Main Menu
            </button>
          </div>
          <CommunityBrowser
            customLevels={customLevels}
            progressStats={progressStats}
            onSelectPlayLevel={handlePlayLevelFromHub}
            onSelectEditLevel={handleEditLevelFromHub}
            onCreateNewLevel={handleCreateNewLevel}
            onDeleteCustomLevel={handleDeleteCustomLevel}
            onImportLevel={handleImportLevel}
          />
        </>
      )}

      {/* PERSISTENT EXTERNAL MUSIC (Official YouTube Player with continuous background playback) */}
      <ExternalMusicPanel
        isOpen={activeView === 'music'}
        onBack={() => setActiveView('menu')}
        onOpenStudio={() => setActiveView('music')}
      />

      {/* VIEW 6: MAIN MENU */}
      {activeView === 'menu' && (
        <div id="main-menu-screen" className="relative w-full h-full flex flex-col justify-between p-6 sm:p-10 overflow-y-auto overflow-x-hidden bg-neutral-950">
          
          {/* Synthwave Cyberpunk Background Image */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
            <img
              id="menu-bg-image"
              src={menuBackgroundImg || '/assets/menu_background.jpg'}
              alt="Dash Runner Synthwave Background"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center scale-[1.02] transform transition-transform duration-1000"
            />
            {/* Atmospheric overlay to guarantee WCAG text contrast while keeping vivid moons and grid */}
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/75 via-neutral-950/45 to-neutral-950/90" />
            <div className="absolute inset-0 bg-radial-at-c from-transparent via-neutral-950/30 to-neutral-950/70" />
          </div>

          {/* Top Bar (Floating Glassmorphic Header) */}
          <div className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between p-3.5 px-5 rounded-2xl bg-neutral-950/70 backdrop-blur-md border border-cyan-500/20 shadow-2xl shadow-cyan-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-black text-xl text-white tracking-widest block leading-none drop-shadow-[0_2px_8px_rgba(6,182,212,0.6)]">
                  DASH RUNNER
                </span>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
                  Precision Rhythm Platformer
                </span>
              </div>
            </div>

            {/* Quick Action Utilities */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* External Music (YouTube Player) */}
              <button
                id="menu-open-music-btn"
                onClick={() => {
                  try { soundEngine.playMenuSelect(); } catch (e) {}
                  setActiveView('music');
                }}
                className="p-2.5 sm:px-3.5 sm:py-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/60 hover:border-cyan-500/40 text-neutral-300 hover:text-cyan-300 transition shadow-md flex items-center gap-2 cursor-pointer"
                title="External Music (YouTube Player)"
              >
                <Music className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Music</span>
              </button>

              {/* Leaderboards / Records */}
              <button
                id="menu-open-records-btn"
                onClick={() => handleOpenRecords()}
                className="p-2.5 sm:px-3.5 sm:py-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/60 hover:border-amber-500/40 text-neutral-300 hover:text-amber-300 transition shadow-md flex items-center gap-2 cursor-pointer"
                title="Records & Leaderboards"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Records</span>
              </button>

              {/* Skin Workshop */}
              <button
                id="menu-open-skins-btn"
                onClick={() => setShowSkinModal(true)}
                className="px-3.5 py-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/60 hover:border-cyan-500/40 text-xs font-semibold text-neutral-200 transition flex items-center gap-2 shadow-md cursor-pointer"
                title="Skin Workshop"
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border border-white/60 shadow-sm"
                  style={{ backgroundColor: equippedSkin.primaryColor }}
                />
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Skins</span>
              </button>

              {/* Settings / Guide */}
              <button
                id="menu-open-settings-btn"
                onClick={() => setShowSettingsModal(true)}
                className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/60 hover:border-cyan-500/40 text-neutral-300 hover:text-cyan-300 transition shadow-md cursor-pointer"
                title="Settings & Guide"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Audio Mute Toggle */}
              <button
                id="menu-toggle-audio"
                onClick={toggleSoundMute}
                className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-cyan-300 transition shadow-md cursor-pointer"
                title="Toggle Audio"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-neutral-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>
            </div>
          </div>

          {/* Central Hero Showcase */}
          <div className="relative z-10 w-full max-w-4xl mx-auto my-auto py-6 text-center flex flex-col items-center">
            
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs font-medium mb-4">
              <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" /> Rhythm Platformer
            </div>

            {/* Stylized Logo Title inspired by the Retro-Futuristic Artwork */}
            <div className="relative my-2">
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black font-display tracking-wider leading-tight select-none">
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 via-cyan-400 to-blue-600 drop-shadow-[0_0_35px_rgba(6,182,212,0.8)]">
                  DASH
                </span>{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-fuchsia-200 via-fuchsia-400 to-purple-600 drop-shadow-[0_0_35px_rgba(217,70,239,0.8)]">
                  RUNNER
                </span>
              </h1>
            </div>

            <p className="text-sm sm:text-base text-neutral-300 max-w-xl mx-auto mt-2 leading-relaxed drop-shadow-md">
              Sprint, rocket dash, gravity-flip, and dodge pulse hazards to the electronic beat.
              Conquer campaign stages, collect secret coins, and climb the podium!
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg">
              {/* Primary Campaign Play Button */}
              <button
                id="menu-play-campaign-btn"
                onClick={() => {
                  try { soundEngine.playMenuSelect(); } catch (e) {}
                  setActiveView('campaign');
                }}
                className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 hover:from-cyan-400 hover:via-teal-300 hover:to-blue-400 text-neutral-950 font-black text-sm uppercase tracking-wider transition transform hover:scale-105 active:scale-95 shadow-xl shadow-cyan-500/40 flex items-center justify-center gap-2.5 cursor-pointer border border-cyan-300/40"
              >
                <Play className="w-5 h-5 fill-current" /> Campaign Play
              </button>

              {/* Records & Standings Button */}
              <button
                id="menu-hero-records-btn"
                onClick={() => handleOpenRecords()}
                className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-700/80 hover:border-amber-500/50 text-white font-bold text-sm transition transform hover:scale-105 active:scale-95 shadow-xl backdrop-blur-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-400" /> Leaderboards
              </button>
            </div>

            {/* Secondary Utility Row: Community Hub, Level Creator, & External Music */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                id="menu-open-music-row-btn"
                onClick={() => {
                  try { soundEngine.playMenuSelect(); } catch (e) {}
                  setActiveView('music');
                }}
                className="text-xs font-semibold text-neutral-300 hover:text-cyan-300 transition flex items-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-950/60 hover:bg-neutral-900/80 border border-neutral-800/80 hover:border-cyan-500/30 backdrop-blur-sm shadow-md cursor-pointer"
              >
                <Music className="w-3.5 h-3.5 text-cyan-400" /> External Music
              </button>

              <button
                id="menu-open-community-hub-btn"
                onClick={() => {
                  try { soundEngine.playMenuSelect(); } catch (e) {}
                  setActiveView('community');
                }}
                className="text-xs font-semibold text-neutral-300 hover:text-cyan-300 transition flex items-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-950/60 hover:bg-neutral-900/80 border border-neutral-800/80 hover:border-cyan-500/30 backdrop-blur-sm shadow-md cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" /> Community Courses
              </button>

              <button
                id="menu-open-editor-btn"
                onClick={handleCreateNewLevel}
                className="text-xs font-semibold text-neutral-300 hover:text-cyan-300 transition flex items-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-950/60 hover:bg-neutral-900/80 border border-neutral-800/80 hover:border-cyan-500/30 backdrop-blur-sm shadow-md cursor-pointer"
              >
                <Hammer className="w-3.5 h-3.5 text-cyan-400" /> Level Creator &amp; Tools
              </button>
            </div>
          </div>

          {/* Clean, Elegant Bottom Bar (Replaces cluttered open cards as requested) */}
          <div className="relative z-10 w-full max-w-5xl mx-auto pt-4 pb-2 border-t border-neutral-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
            {/* Live Progress Stats Chip */}
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {collectiveStats.clearedCount} / {collectiveStats.totalLevels} Cleared
              </span>
              <span className="text-neutral-600">•</span>
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Coins className="w-3.5 h-3.5" />
                {collectiveStats.totalCoins} / {collectiveStats.maxPossibleCoins} Secret Coins
              </span>
              <span className="text-neutral-600">•</span>
              <span className="text-cyan-300 font-bold">
                {collectiveStats.totalPoints.toLocaleString()} Pts
              </span>
            </div>

            {/* Quick Settings & Help Shortcut */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="text-[11px] text-neutral-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer font-mono"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                Controls &amp; Help (In Settings)
              </button>
            </div>
          </div>

        </div>
      )}

      {/* SKIN WORKSHOP MODAL */}
      {showSkinModal && (
        <SkinCustomizer
          currentSkin={equippedSkin}
          onSaveSkin={handleSaveSkin}
          onClose={() => setShowSkinModal(false)}
        />
      )}

      {/* RECORDS & LEADERBOARDS MODAL */}
      {showRecordsModal && (
        <RecordsModal
          isOpen={showRecordsModal}
          onClose={() => setShowRecordsModal(false)}
          levels={BUILTIN_COMMUNITY_LEVELS}
          progressStats={progressStats}
          initialLevelId={recordsInitialLevelId}
          playerName={playerName}
        />
      )}

      {/* SETTINGS & INSTRUCTIONS MODAL */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          playerName={playerName}
          onUpdatePlayerName={handleUpdatePlayerName}
          onResetProgress={handleResetProgress}
          onOpenExternalMusic={() => setActiveView('music')}
        />
      )}

      {/* MOBILE LANDSCAPE PROMPT */}
      <RotateDevicePrompt />

    </div>
  );
}

