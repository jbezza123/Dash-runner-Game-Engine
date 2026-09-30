import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Music2,
  Maximize2,
  X,
  SkipBack,
  SkipForward,
  GripHorizontal
} from 'lucide-react';

/**
 * Official YouTube Embedded Player component.
 * Renders a genuine, fully visible, un-obscured YouTube IFrame player.
 * Supports persistent playback across views without unmounting the iframe.
 * Dimensions: Compact 16:9 aspect ratio (~420x236 studio, ~260x146 docked).
 * Includes drag handle for positioning and next/prev controls for saved video links.
 */
export default function YouTubePlayer({
  activeSource,
  onError,
  isDocked = false,
  onOpenStudio,
  onStopPlayback,
  onNextTrack,
  onPrevTrack,
  currentIndex = -1,
  totalTracks = 0,
  dragHandleProps = {}
}) {
  const [embedKey, setEmbedKey] = useState(0);
  const [playerError, setPlayerError] = useState(null);

  useEffect(() => {
    // Reset any local error state when switching active sources
    setPlayerError(null);
    setEmbedKey(k => k + 1);
  }, [activeSource?.id, activeSource?.ytId]);

  if (!activeSource || !activeSource.ytId) {
    if (isDocked) return null; // In docked mode, don't show empty placeholder
    return (
      <div className="w-full max-w-[420px] h-[236px] mx-auto rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col items-center justify-center p-6 text-center text-neutral-400">
        <div className="w-12 h-12 rounded-full bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-neutral-500 mb-3">
          <Music2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-neutral-200 mb-1">No Active YouTube Source</h4>
        <p className="text-xs text-neutral-400 max-w-xs">
          Select a saved video or playlist below, or paste a new YouTube link to load the official player.
        </p>
      </div>
    );
  }

  // Construct official YouTube embed URL
  let embedUrl = '';
  if (activeSource.type === 'playlist') {
    embedUrl = `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(activeSource.ytId)}&rel=0&modestbranding=1`;
  } else {
    embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(activeSource.ytId)}?rel=0&modestbranding=1`;
  }

  return (
    <div
      id="persistent-youtube-player-unit"
      className={
        isDocked
          ? "w-full flex flex-col"
          : "w-full max-w-[420px] mx-auto flex flex-col items-center"
      }
    >
      {/* Player Header & Controls */}
      <div
        className={`w-full flex items-center justify-between text-xs text-neutral-300 mb-1.5 px-1 ${
          isDocked ? 'cursor-move select-none' : ''
        }`}
        {...dragHandleProps}
      >
        <div className="flex items-center gap-1.5 truncate max-w-[170px] sm:max-w-[210px]">
          {isDocked ? (
            <GripHorizontal className="w-3.5 h-3.5 text-neutral-400 shrink-0" title="Drag to move video window" />
          ) : (
            <Music2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          )}
          <span className="font-bold text-neutral-200 truncate text-[11px] sm:text-xs">
            {activeSource.title || (activeSource.type === 'playlist' ? 'YouTube Playlist' : 'YouTube Video')}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0" onPointerDown={e => e.stopPropagation()}>
          {/* Track counter if multiple items exist */}
          {totalTracks > 1 && (
            <span className="text-[10px] font-mono text-neutral-400 mr-1">
              {currentIndex >= 0 ? currentIndex + 1 : 1}/{totalTracks}
            </span>
          )}

          {/* Previous saved video */}
          {totalTracks > 1 && typeof onPrevTrack === 'function' && (
            <button
              type="button"
              onClick={onPrevTrack}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              title="Previous Saved Video"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Next saved video */}
          {totalTracks > 1 && typeof onNextTrack === 'function' && (
            <button
              type="button"
              onClick={onNextTrack}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              title="Next Saved Video"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}

          {isDocked && typeof onOpenStudio === 'function' && (
            <button
              type="button"
              onClick={onOpenStudio}
              className="p-1 rounded hover:bg-cyan-950/80 text-neutral-400 hover:text-cyan-300 transition cursor-pointer"
              title="Open External Music Menu"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setEmbedKey(k => k + 1)}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
            title="Reload Player"
          >
            <RefreshCw className="w-3 h-3" />
          </button>

          <a
            href={activeSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-cyan-400 transition cursor-pointer"
            title="Open on YouTube"
          >
            <ExternalLink className="w-3 h-3" />
          </a>

          {isDocked && typeof onStopPlayback === 'function' && (
            <button
              type="button"
              onClick={onStopPlayback}
              className="p-1 rounded hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 transition cursor-pointer"
              title="Close Player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Genuine Visible 16:9 Official YouTube Player */}
      <div
        className={
          isDocked
            ? "relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-neutral-800 shadow-xl"
            : "relative w-full max-w-[420px] aspect-video bg-black rounded-xl overflow-hidden border border-neutral-800 shadow-xl"
        }
      >
        <iframe
          key={embedKey}
          id="official-youtube-embed-frame"
          className="w-full h-full border-0 block"
          src={embedUrl}
          title={activeSource.title || 'Official YouTube Player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => {
            const err = 'This YouTube video cannot be played through the embedded player.';
            setPlayerError(err);
            if (onError) onError(err);
          }}
        />
      </div>

      {/* Embedded playback error notice if video owner disabled external playback */}
      {playerError && (
        <div className="w-full mt-2 p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 flex items-start gap-2 text-xs text-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-[11px]">{playerError}</p>
            <p className="text-[10px] text-amber-300/80 mt-0.5">
              Some YouTube creators restrict embedding on third-party websites or mark videos age-restricted.
            </p>
          </div>
        </div>
      )}

      {/* Subtitle Badge */}
      {!isDocked && (
        <div className="w-full flex items-center justify-between text-[10px] text-neutral-500 mt-1.5 px-1">
          <span>Official YouTube Embed Player</span>
          <span>16:9 Format</span>
        </div>
      )}
    </div>
  );
}
