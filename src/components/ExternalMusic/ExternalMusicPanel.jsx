import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Plus,
  Info,
  ArrowLeft,
  AlertCircle,
  Radio,
  ExternalLink,
  Sparkles,
  VolumeX,
  Volume2
} from 'lucide-react';
import YouTubePlayer from './YouTubePlayer.jsx';
import YouTubeSourceList from './YouTubeSourceList.jsx';
import ExternalMusicNoticeModal from './ExternalMusicNoticeModal.jsx';
import { parseYouTubeUrl } from './YouTubeUrlParser.js';
import {
  loadSavedSources,
  saveSources,
  loadActiveSourceId,
  saveActiveSourceId,
  clearAllSources
} from './externalMusicStorage.js';
import { soundEngine } from '../../engine/audioEngine.js';

/**
 * Main External Music Panel & Tab.
 * Allows adding, managing, and playing external YouTube videos and playlists
 * strictly through the official embedded player without storing media or using external APIs.
 */
export default function ExternalMusicPanel({
  isOpen = false,
  onBack,
  onOpenStudio
}) {
  const [sources, setSources] = useState(() => loadSavedSources());
  const [activeSourceId, setActiveSourceId] = useState(() => {
    const savedId = loadActiveSourceId();
    const existing = loadSavedSources();
    if (savedId && existing.some(s => s.id === savedId)) return savedId;
    return null;
  });

  const [inputUrl, setInputUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [urlError, setUrlError] = useState(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [isGameMusicMuted, setIsGameMusicMuted] = useState(() => soundEngine.isMusicMuted);

  // Active source object
  const activeSource = sources.find(s => s.id === activeSourceId) || null;

  // Persist sources whenever they change
  useEffect(() => {
    saveSources(sources);
  }, [sources]);

  // Persist active source ID
  useEffect(() => {
    saveActiveSourceId(activeSourceId);
  }, [activeSourceId]);

  // Add new YouTube URL
  const handleAddUrl = (e) => {
    e.preventDefault();
    setUrlError(null);

    if (!inputUrl.trim()) {
      setUrlError('Please enter a YouTube video or playlist URL.');
      return;
    }

    const parsed = parseYouTubeUrl(inputUrl);
    if (!parsed.valid) {
      setUrlError(parsed.error || 'Invalid YouTube URL.');
      try { soundEngine.playCrash(); } catch (err) {}
      return;
    }

    // Check if ID already exists
    const duplicate = sources.find(s => s.ytId === parsed.id && s.type === parsed.type);
    if (duplicate) {
      setActiveSourceId(duplicate.id);
      setInputUrl('');
      setCustomTitle('');
      setUrlError('This source is already in your list! Loaded into player.');
      try { soundEngine.playMenuSelect(); } catch (err) {}
      return;
    }

    const defaultLabel = customTitle.trim()
      ? customTitle.trim()
      : parsed.type === 'playlist'
        ? `Playlist (${parsed.id.slice(0, 8)}...)`
        : `Video (${parsed.id})`;

    const newSource = {
      id: `yt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: parsed.type,
      ytId: parsed.id,
      title: defaultLabel,
      url: parsed.cleanUrl || inputUrl.trim(),
      addedAt: new Date().toISOString()
    };

    const updated = [newSource, ...sources];
    setSources(updated);
    setActiveSourceId(newSource.id);
    setInputUrl('');
    setCustomTitle('');
    setUrlError(null);
    try { soundEngine.playCoin(); } catch (err) {}
  };

  // Remove individual source
  const handleRemoveSource = (idToRemove) => {
    const updated = sources.filter(s => s.id !== idToRemove);
    setSources(updated);
    if (activeSourceId === idToRemove) {
      setActiveSourceId(updated.length > 0 ? updated[0].id : null);
    }
    try { soundEngine.playMenuSelect(); } catch (err) {}
  };

  // Clear all saved sources
  const handleClearAll = () => {
    clearAllSources();
    setSources([]);
    setActiveSourceId(null);
    try { soundEngine.playMenuSelect(); } catch (err) {}
  };

  // Select a source to play
  const handleSelectSource = (source) => {
    setActiveSourceId(source.id);
    try { soundEngine.playMenuSelect(); } catch (err) {}
  };

  // Toggle internal game synth audio so it doesn't clash with YouTube
  const handleToggleGameAudio = () => {
    const next = soundEngine.toggleMusicMute();
    setIsGameMusicMuted(next);
  };

  // Draggable docked player position state
  const [dockedPosition, setDockedPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      const h = window.innerHeight;
      return {
        x: Math.max(16, w - 286),
        y: Math.max(16, h - 200)
      };
    }
    return { x: 20, y: 20 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  });

  // Cycle through saved tracks
  const handleNextTrack = () => {
    if (!sources || sources.length === 0) return;
    const currentIndex = sources.findIndex(s => s.id === activeSourceId);
    const nextIndex = (currentIndex + 1) % sources.length;
    handleSelectSource(sources[nextIndex]);
  };

  const handlePrevTrack = () => {
    if (!sources || sources.length === 0) return;
    const currentIndex = sources.findIndex(s => s.id === activeSourceId);
    const prevIndex = (currentIndex - 1 + sources.length) % sources.length;
    handleSelectSource(sources[prevIndex]);
  };

  // Start drag handler
  const handleDragStart = (e) => {
    if (isOpen) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      originX: dockedPosition.x,
      originY: dockedPosition.y
    };
  };

  // Drag listener
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      const width = 270;
      const height = 180;
      const maxX = Math.max(0, window.innerWidth - width - 8);
      const maxY = Math.max(0, window.innerHeight - height - 8);

      setDockedPosition({
        x: Math.max(8, Math.min(maxX, dragRef.current.originX + dx)),
        y: Math.max(8, Math.min(maxY, dragRef.current.originY + dy))
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('touchcancel', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('touchcancel', handlePointerUp);
    };
  }, [isDragging]);

  // Keep player inside window boundaries on resize
  useEffect(() => {
    const handleResize = () => {
      setDockedPosition(pos => {
        const width = 270;
        const height = 180;
        const maxX = Math.max(0, window.innerWidth - width - 8);
        const maxY = Math.max(0, window.innerHeight - height - 8);
        return {
          x: Math.max(8, Math.min(maxX, pos.x)),
          y: Math.max(8, Math.min(maxY, pos.y))
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // If studio is closed and no source is active, do not render anything
  if (!isOpen && !activeSource) {
    return null;
  }

  const currentTrackIndex = sources.findIndex(s => s.id === activeSourceId);

  return (
    <div
      id="external-music-container"
      className={
        isOpen
          ? "fixed inset-0 z-40 bg-neutral-950 text-neutral-100 flex flex-col overflow-y-auto overflow-x-hidden font-sans select-none pointer-events-auto"
          : "fixed inset-0 z-50 pointer-events-none overflow-hidden"
      }
    >
      {/* Invisible shield over screen during drag so iframe doesn't swallow pointer events */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-move pointer-events-auto select-none bg-transparent" />
      )}

      {/* Background Ambience (Visible only when studio is open) */}
      {isOpen && (
        <div className="absolute inset-0 bg-radial-at-t from-cyan-950/20 via-neutral-950/80 to-neutral-950 pointer-events-none" />
      )}

      {/* Header Bar (Visible only when studio is open) */}
      {isOpen && (
        <div className="relative z-10 w-full max-w-5xl mx-auto pt-6 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="music-back-btn"
              onClick={onBack}
              className="p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 hover:text-white transition flex items-center gap-2 text-xs font-bold shadow-md cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Menu</span>
            </button>

            <div>
              <h1 className="text-xl sm:text-2xl font-black font-display tracking-wide text-white flex items-center gap-2">
                <Music className="w-6 h-6 text-cyan-400" />
                EXTERNAL MUSIC
              </h1>
              <p className="text-xs text-neutral-400">
                Official YouTube embedded player with background audio persistence
              </p>
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-2">
            {/* Information & Compliance Notice */}
            <button
              id="music-info-btn"
              onClick={() => setShowNoticeModal(true)}
              className="p-2.5 px-3.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 hover:border-cyan-500/40 text-neutral-300 hover:text-cyan-300 transition text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              title="External Music Notice & Information"
            >
              <Info className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Notice</span>
            </button>

            {/* Quick Mute Internal Game Synth */}
            <button
              id="music-toggle-game-audio-btn"
              onClick={handleToggleGameAudio}
              className="p-2.5 px-3.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 hover:text-white transition text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              title="Toggle Built-in Game Background Synth Music"
            >
              {isGameMusicMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span className="hidden md:inline text-rose-300">Synth Music Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span className="hidden md:inline text-neutral-300">Synth Music Active</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SINGLE PERSISTENT PLAYER CONTAINER: Reconciles at the same React tree position */}
      <div
        id="persistent-player-anchor"
        className={
          isOpen
            ? "relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pointer-events-auto"
            : "pointer-events-auto fixed z-50"
        }
        style={
          isOpen
            ? undefined
            : {
                left: `${dockedPosition.x}px`,
                top: `${dockedPosition.y}px`,
                width: '270px',
                maxWidth: 'calc(100vw - 16px)'
              }
        }
      >
        <div
          className={
            isOpen
              ? "p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-xl flex flex-col items-center"
              : "p-2.5 rounded-xl bg-neutral-950/95 border border-neutral-800 shadow-2xl backdrop-blur-md"
          }
        >
          <YouTubePlayer
            activeSource={activeSource}
            onError={(msg) => setUrlError(msg)}
            isDocked={!isOpen}
            onOpenStudio={onOpenStudio}
            onStopPlayback={() => {
              setActiveSourceId(null);
              saveActiveSourceId(null);
            }}
            onNextTrack={handleNextTrack}
            onPrevTrack={handlePrevTrack}
            currentIndex={currentTrackIndex}
            totalTracks={sources.length}
            dragHandleProps={{
              onMouseDown: handleDragStart,
              onTouchStart: handleDragStart
            }}
          />
        </div>
      </div>

      {/* Studio Body: Add URL form & Saved Sources List (Visible only when studio is open) */}
      {isOpen && (
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1 pointer-events-auto">
          {/* Middle Section: Add YouTube URL Form */}
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Add YouTube Video or Playlist
              </h2>
              <span className="text-[11px] text-neutral-500 font-mono">
                Accepts watch URLs, youtu.be, and playlist links
              </span>
            </div>

            <form onSubmit={handleAddUrl} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="youtube-url-input"
                  type="text"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  placeholder="https://www.youtube.com/watch?v=... or https://www.youtube.com/playlist?list=..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
                <input
                  id="youtube-title-input"
                  type="text"
                  maxLength={40}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Optional custom title..."
                  className="sm:w-56 px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
                <button
                  id="youtube-add-btn"
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {/* Error Message Notice */}
              {urlError && (
                <div
                  id="youtube-error-message"
                  className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{urlError}</p>
                    <p className="text-[11px] text-rose-400/80 mt-0.5">
                      Please ensure the link is a valid public YouTube video or playlist URL.
                    </p>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Bottom Section: Saved Sources List */}
          <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-xl">
            <YouTubeSourceList
              sources={sources}
              activeSourceId={activeSourceId}
              onSelectSource={handleSelectSource}
              onRemoveSource={handleRemoveSource}
              onClearAll={handleClearAll}
            />
          </div>

          {/* Minimal Footer Note */}
          <div className="text-center text-[11px] text-neutral-500 font-sans pb-4">
            External Music plays content through YouTube&apos;s official embedded player. No media is downloaded or stored on our servers.
          </div>
        </div>
      )}

      {/* Compliance & Legal Notice Modal */}
      {isOpen && showNoticeModal && (
        <ExternalMusicNoticeModal
          isOpen={showNoticeModal}
          onClose={() => setShowNoticeModal(false)}
        />
      )}
    </div>
  );
}
