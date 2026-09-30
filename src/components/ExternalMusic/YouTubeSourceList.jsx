import React, { useState } from 'react';
import {
  Play,
  Trash2,
  ListMusic,
  Video,
  ExternalLink,
  Check,
  AlertCircle
} from 'lucide-react';

/**
 * Lists user-saved YouTube videos and playlists.
 * Allows playing, removing individual items, or clearing all items.
 */
export default function YouTubeSourceList({
  sources = [],
  activeSourceId = null,
  onSelectSource,
  onRemoveSource,
  onClearAll
}) {
  const [confirmClear, setConfirmClear] = useState(false);

  if (!sources || sources.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center">
        <ListMusic className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-neutral-300">No YouTube Sources Added</p>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          Paste a YouTube video or playlist link in the box above to save it locally and play it in the game.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
          <ListMusic className="w-4 h-4 text-cyan-400" />
          Saved Sources ({sources.length})
        </h3>

        {confirmClear ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-rose-400 font-medium">Remove all?</span>
            <button
              id="confirm-clear-all-sources-btn"
              onClick={() => {
                onClearAll();
                setConfirmClear(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
            >
              Yes, Clear
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="px-2 py-1 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white text-xs transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            id="clear-all-sources-btn"
            onClick={() => setConfirmClear(true)}
            className="text-xs text-neutral-400 hover:text-rose-400 font-medium transition cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {sources.map((item) => {
          const isActive = item.id === activeSourceId;
          const isPlaylist = item.type === 'playlist';

          return (
            <div
              key={item.id}
              id={`source-item-${item.id}`}
              className={`flex items-center justify-between p-3 rounded-xl border transition ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md shadow-cyan-950/40'
                  : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                onClick={() => onSelectSource(item)}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    isActive
                      ? 'bg-cyan-500 text-neutral-950 border-cyan-400 shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {isPlaylist ? <ListMusic className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-bold truncate ${isActive ? 'text-cyan-300' : 'text-neutral-200'}`}>
                      {item.title}
                    </p>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border uppercase shrink-0 ${
                        isPlaylist
                          ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-mono truncate mt-0.5">
                    {item.url}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                <button
                  id={`play-source-btn-${item.id}`}
                  onClick={() => onSelectSource(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500 text-neutral-950 shadow-sm'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white'
                  }`}
                >
                  {isActive ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Loaded</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play</span>
                    </>
                  )}
                </button>

                <button
                  id={`remove-source-btn-${item.id}`}
                  onClick={() => onRemoveSource(item.id)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition cursor-pointer"
                  title="Remove from saved list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
