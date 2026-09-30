import React, { useState } from 'react';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  Sliders,
  HelpCircle,
  User,
  Trash2,
  Check,
  Zap,
  Sparkles,
  Gamepad2,
  AlertTriangle,
  RotateCcw,
  Music
} from 'lucide-react';
import { soundEngine } from '../engine/audioEngine.js';

export default function SettingsModal({
  isOpen,
  onClose,
  playerName = 'Runner',
  onUpdatePlayerName,
  onResetProgress,
  onOpenExternalMusic
}) {
  const [activeTab, setActiveTab] = useState('instructions'); // 'instructions' | 'audio' | 'profile'
  const [isAudioMuted, setIsAudioMuted] = useState(soundEngine.isMuted);
  const [volume, setVolume] = useState(Math.round((soundEngine.masterVolume ?? 0.85) * 100));
  const [screenShake, setScreenShake] = useState(true);
  const [particlesEnabled, setParticlesEnabled] = useState(true);
  const [nameInput, setNameInput] = useState(playerName);
  const [nameSaved, setNameSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsAudioMuted(muted);
    try { soundEngine.playMenuSelect(); } catch (e) {}
  };

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value);
    setVolume(val);
    soundEngine.setMasterVolume(val / 100);
  };

  const handleSaveName = (e) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdatePlayerName(nameInput.trim().slice(0, 16));
      setNameSaved(true);
      try { soundEngine.playMenuSelect(); } catch (e) {}
      setTimeout(() => setNameSaved(false), 2000);
    }
  };

  const handleConfirmReset = () => {
    if (typeof onResetProgress === 'function') {
      onResetProgress();
    }
    setShowResetConfirm(false);
    try { soundEngine.playCrash(); } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display tracking-wide text-white">
                SETTINGS & GUIDE
              </h2>
              <p className="text-xs text-neutral-400">Controls, gameplay mechanics, audio & player preferences</p>
            </div>
          </div>

          <button
            id="settings-close-btn"
            onClick={() => {
              try { soundEngine.playMenuSelect(); } catch (e) {}
              onClose();
            }}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-6 pt-3 gap-2">
          <button
            id="settings-tab-instructions"
            onClick={() => {
              try { soundEngine.playMenuSelect(); } catch (e) {}
              setActiveTab('instructions');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-t-xl transition cursor-pointer border-t border-x ${
              activeTab === 'instructions'
                ? 'bg-neutral-900 text-cyan-400 border-neutral-800 border-b-transparent'
                : 'text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>How to Play</span>
          </button>

          <button
            id="settings-tab-audio"
            onClick={() => {
              try { soundEngine.playMenuSelect(); } catch (e) {}
              setActiveTab('audio');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-t-xl transition cursor-pointer border-t border-x ${
              activeTab === 'audio'
                ? 'bg-neutral-900 text-cyan-400 border-neutral-800 border-b-transparent'
                : 'text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Audio & FX</span>
          </button>

          <button
            id="settings-tab-profile"
            onClick={() => {
              try { soundEngine.playMenuSelect(); } catch (e) {}
              setActiveTab('profile');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-t-xl transition cursor-pointer border-t border-x ${
              activeTab === 'profile'
                ? 'bg-neutral-900 text-cyan-400 border-neutral-800 border-b-transparent'
                : 'text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Data</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'instructions' && (
            <div className="space-y-6">
              {/* Keyboard & Touch Controls */}
              <div>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Controls & Hotkeys
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">Jump / Thrust</span>
                      <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-cyan-300 font-mono text-[11px]">
                        Space / Click
                      </kbd>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Tap or click to jump. In Jetpack vehicle mode, hold to thrust upwards.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">Practice Checkpoint</span>
                      <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-emerald-300 font-mono text-[11px]">
                        Z / Tap Flag
                      </kbd>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Places a checkpoint in Practice Mode to respawn instantly without restarting.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">Remove Checkpoint</span>
                      <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-rose-300 font-mono text-[11px]">
                        X / Tap Trash
                      </kbd>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Removes the last placed practice checkpoint.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">Pause Menu</span>
                      <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-amber-300 font-mono text-[11px]">
                        Esc / P
                      </kbd>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Pauses the current run to view attempts, adjust audio, or exit to menu.
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Gameplay Mechanics Guide */}
              <div>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Course Objects & Mechanics
                </h3>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                      ★
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Secret Collectible Coins (3 per course)</h4>
                      <p className="text-[11px] text-neutral-400">
                        Hidden along high-skill alternate paths. Collecting all 3 coins awards <strong>+1,500 bonus points</strong> and unlocks exclusive titles on the Leaderboard.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 flex items-center justify-center font-bold text-xs shrink-0">
                      ▲
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Interactive Jump Pads & Orbs</h4>
                      <p className="text-[11px] text-neutral-400">
                        Pads automatically propel you upwards on contact. Jump orbs (rings) trigger in mid-air when you click or press jump while passing through them.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                      ⇅
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Gravity Inversion Portals</h4>
                      <p className="text-[11px] text-neutral-400">
                        Blue portals flip gravity to the ceiling. Yellow portals restore standard gravity. Your jump mechanics invert along with the physics!
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-400 flex items-center justify-center font-bold text-xs shrink-0">
                      🚀
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Jetpack Rocket Mode</h4>
                      <p className="text-[11px] text-neutral-400">
                        Entering a flight portal transforms you into a jetpack runner. Press and hold to ascend; release to drop smoothly through wave corridors.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Sound Controls */}
              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isAudioMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
                    <div>
                      <span className="text-xs font-bold text-white block">Master Audio</span>
                      <span className="text-[11px] text-neutral-400">{isAudioMuted ? 'Muted' : 'Enabled'}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleMute}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer border ${
                      isAudioMuted
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    {isAudioMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>

                {/* Volume Slider */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className="text-neutral-400">Volume Level:</span>
                    <span className="font-bold text-cyan-400">{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full accent-cyan-400 bg-neutral-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* External Music YouTube Player Feature */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-1">
                    <Music className="w-4 h-4" />
                    External Music (YouTube Player)
                  </h4>
                  <p className="text-[11px] text-neutral-300 leading-relaxed max-w-sm">
                    Play your own YouTube videos or playlists via the official embedded player with local storage.
                  </p>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    if (typeof onOpenExternalMusic === 'function') {
                      onOpenExternalMusic();
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition shrink-0 cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  Open Music →
                </button>
              </div>

              {/* Visual Effects Polish */}
              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400">
                  Graphics & Performance
                </h4>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-bold text-white block">Screen Shake</span>
                    <span className="text-[11px] text-neutral-400">Camera impact shake on crash</span>
                  </div>
                  <button
                    onClick={() => setScreenShake(!screenShake)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      screenShake ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                    }`}
                  >
                    {screenShake ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-neutral-850">
                  <div>
                    <span className="text-xs font-bold text-white block">Particle Burst FX</span>
                    <span className="text-[11px] text-neutral-400">High visual fidelity sparks and shockwaves</span>
                  </div>
                  <button
                    onClick={() => setParticlesEnabled(!particlesEnabled)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      particlesEnabled ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                    }`}
                  >
                    {particlesEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Player Name Config */}
              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 mb-2">
                  Player Identity
                </h4>
                <p className="text-xs text-neutral-400 mb-3">
                  This callsign will represent you on the Leaderboards and podium records.
                </p>

                <form onSubmit={handleSaveName} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={16}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter Runner Callsign..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {nameSaved ? <Check className="w-4 h-4" /> : 'Save'}
                  </button>
                </form>
              </div>

              {/* Reset Save Data Card */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Danger Zone
                </h4>
                <p className="text-xs text-neutral-400 mb-3">
                  Clears local campaign progress, completed levels, and collected secret coins.
                </p>

                {showResetConfirm ? (
                  <div className="p-3 rounded-lg bg-neutral-950 border border-rose-500/50 space-y-2">
                    <p className="text-xs text-rose-300 font-bold">Are you sure? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmReset}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Yes, Reset Progress
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="px-4 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Campaign Progress
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
