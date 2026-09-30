import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Trophy,
  Play,
  Flag,
  Coins,
  Sparkles,
  Flame,
  Clock,
  RotateCcw,
  Zap,
  Lock,
  Unlock
} from 'lucide-react';
import { soundEngine } from '../engine/audioEngine.js';
import { formatRecordTime, calculateLevelPoints } from '../utils/leaderboards.js';

export default function CampaignLevelSelect({
  levels = [],
  progressStats = {},
  onSelectLevel,
  onBack,
  onOpenRecords,
}) {
  const [unlockAll, setUnlockAll] = useState(false);

  // Compute overall summary stats
  const totalLevels = levels.length;
  let clearedCount = 0;
  let totalCoinsCollected = 0;
  let maxPossibleCoins = 0;

  levels.forEach((lvl, idx) => {
    const stats = progressStats[lvl.id] || {};
    if (stats.isCleared) clearedCount++;
    const coinsInLevel = (lvl.objects || []).filter(o => o && o.type === 'collectable_coin').length || 3;
    maxPossibleCoins += coinsInLevel;
    totalCoinsCollected += (stats.coins || 0);
  });

  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return {
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          glow: 'from-emerald-950/50 to-neutral-900',
          border: 'hover:border-emerald-500/60',
          accent: 'text-emerald-400'
        };
      case 'medium':
        return {
          badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
          glow: 'from-cyan-950/50 to-neutral-900',
          border: 'hover:border-cyan-500/60',
          accent: 'text-cyan-400'
        };
      case 'hard':
        return {
          badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          glow: 'from-amber-950/50 to-neutral-900',
          border: 'hover:border-amber-500/60',
          accent: 'text-amber-400'
        };
      case 'insane':
        return {
          badge: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40',
          glow: 'from-fuchsia-950/50 to-neutral-900',
          border: 'hover:border-fuchsia-500/60',
          accent: 'text-fuchsia-400'
        };
      case 'demon':
      default:
        return {
          badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
          glow: 'from-rose-950/50 to-neutral-900',
          border: 'hover:border-rose-500/60',
          accent: 'text-rose-400'
        };
    }
  };

  const handleLevelClick = (level, isPractice = false) => {
    try {
      soundEngine.playMenuSelect();
    } catch (e) {
      console.warn('Audio play error:', e);
    }
    if (typeof onSelectLevel === 'function') {
      onSelectLevel(level, isPractice);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-neutral-950 text-neutral-100 flex flex-col overflow-y-auto">
      {/* Subtle Synthwave Glow Background Layer */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(6,182,212,0.15),transparent_70%)]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(217,70,239,0.12),transparent_70%)]" />

      {/* Top Navigation Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            id="campaign-back-btn"
            onClick={() => {
              try { soundEngine.playMenuSelect(); } catch (e) {}
              onBack();
            }}
            className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-white hover:border-cyan-500/50 hover:bg-neutral-800 transition shadow-sm cursor-pointer flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Menu</span>
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-black font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-fuchsia-400">
              CAMPAIGN LEVELS
            </h1>
            <p className="text-xs text-neutral-400">Select a course to race the rhythm and collect secret coins</p>
          </div>
        </div>

        {/* Global Progress Chips */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
          {/* Cleared Count Chip */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-mono text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">{clearedCount} / {totalLevels}</span>
            <span className="text-neutral-400 hidden sm:inline">Cleared</span>
          </div>

          {/* Secret Coins Chip */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 font-mono text-xs">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-bold">{totalCoinsCollected} / {maxPossibleCoins}</span>
            <span className="text-neutral-400 hidden sm:inline">Coins</span>
          </div>

          {/* Records Button */}
          <button
            id="campaign-open-records-btn"
            onClick={() => {
              try { soundEngine.playMenuSelect(); } catch (e) {}
              if (typeof onOpenRecords === 'function') onOpenRecords();
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Leaderboards</span>
          </button>
        </div>
      </header>

      {/* Main Campaign Grid */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((level, index) => {
            const stats = progressStats[level.id] || {
              bestPercent: 0,
              attempts: 0,
              isCleared: false,
              coins: 0,
              bestTimeMs: null
            };

            const levelNumber = index + 1;
            // Unlocking logic: Level 1 is always unlocked. Next level is unlocked if previous was cleared, or if unlockAll is true.
            const isUnlocked = unlockAll || index === 0 || (progressStats[levels[index - 1]?.id]?.isCleared);
            const isCleared = Boolean(stats.isCleared);
            const coinsCollected = stats.coins || 0;
            const coinsInLevel = (level.objects || []).filter(o => o && o.type === 'collectable_coin').length || 3;
            const diffTheme = getDifficultyColor(level.difficulty);
            const pts = calculateLevelPoints(level, stats);

            return (
              <div
                key={level.id}
                id={`level-card-${level.id}`}
                className={`relative flex flex-col justify-between rounded-2xl border bg-gradient-to-b ${diffTheme.glow} p-5 transition-all duration-300 shadow-lg ${
                  isCleared
                    ? 'border-emerald-500/50 shadow-emerald-950/40 ring-1 ring-emerald-500/20'
                    : isUnlocked
                    ? `border-neutral-800 hover:border-cyan-500/50 ${diffTheme.border} hover:shadow-cyan-950/30 hover:-translate-y-1`
                    : 'border-neutral-850 opacity-65'
                }`}
              >
                {/* Level Card Header */}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    {/* Big Square Number Badge */}
                    <div className="flex items-center gap-2.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black font-mono text-lg border ${
                        isCleared
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                          : 'bg-neutral-900/90 text-cyan-400 border-neutral-700/80'
                      }`}>
                        {String(levelNumber).padStart(2, '0')}
                      </div>

                      <div>
                        <h2 className="text-base sm:text-lg font-bold font-display text-white tracking-wide">
                          {level.name}
                        </h2>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          BPM {level.bpm || 130} • {level.length || 120} tiles
                        </span>
                      </div>
                    </div>

                    {/* Green Tick / Completed Status or Difficulty Badge */}
                    <div className="flex flex-col items-end gap-1">
                      {isCleared ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>100% DONE</span>
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${diffTheme.badge}`}>
                          {level.difficulty === 'Demon' && <Flame className="w-3 h-3 text-rose-400" />}
                          {level.difficulty}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar & Coin Collector Slots */}
                  <div className="my-3 p-3 rounded-xl bg-neutral-950/80 border border-neutral-850">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-neutral-400">Best Run:</span>
                      <span className={`font-bold ${isCleared ? 'text-emerald-400' : 'text-cyan-300'}`}>
                        {isCleared ? '100% CLEARED' : `${stats.bestPercent || 0}%`}
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCleared
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                            : 'bg-gradient-to-r from-cyan-500 to-fuchsia-500'
                        }`}
                        style={{ width: `${Math.min(100, isCleared ? 100 : (stats.bestPercent || 0))}%` }}
                      />
                    </div>

                    {/* Secret Coins 3-Slot Visual Display */}
                    <div className="mt-3 pt-2.5 border-t border-neutral-850 flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        Secret Coins:
                      </span>

                      {/* 3 coin dots */}
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((slotIdx) => {
                          const isCollected = slotIdx < coinsCollected;
                          return (
                            <div
                              key={slotIdx}
                              title={isCollected ? `Coin ${slotIdx + 1} Collected` : `Coin ${slotIdx + 1} Uncollected`}
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                                isCollected
                                  ? 'bg-gradient-to-br from-amber-400 to-yellow-500 border-amber-300 text-neutral-950 shadow-sm shadow-amber-400/60 scale-105'
                                  : 'bg-neutral-900 border-neutral-800 text-neutral-600'
                              }`}
                            >
                              ★
                            </div>
                          );
                        })}
                        <span className="text-xs font-mono font-bold text-amber-400 ml-1">
                          {coinsCollected}/{coinsInLevel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Level Stats Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-neutral-400 mb-4">
                    <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-850">
                      <span className="text-[10px] block text-neutral-500">Best Time</span>
                      <span className="text-neutral-200 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        {stats.bestTimeMs ? formatRecordTime(stats.bestTimeMs) : '--:--.---'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-850">
                      <span className="text-[10px] block text-neutral-500">Score Earned</span>
                      <span className="text-cyan-300 font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        {pts.toLocaleString()} pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Level Actions Bar */}
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-850">
                  {/* Big Play Button */}
                  <button
                    id={`play-level-${level.id}`}
                    onClick={() => handleLevelClick(level, false)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-neutral-950 font-bold text-xs uppercase tracking-wider transition shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isCleared ? 'Replay' : 'Play'}</span>
                  </button>

                  {/* Practice Mode Button */}
                  <button
                    id={`practice-level-${level.id}`}
                    onClick={() => handleLevelClick(level, true)}
                    title="Practice mode with checkpoints"
                    className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition cursor-pointer"
                  >
                    <Flag className="w-4 h-4 text-emerald-400" />
                  </button>

                  {/* Individual Level Records Button */}
                  <button
                    id={`records-level-${level.id}`}
                    onClick={() => {
                      try { soundEngine.playMenuSelect(); } catch (e) {}
                      if (typeof onOpenRecords === 'function') onOpenRecords(level.id);
                    }}
                    title="View level leaderboard"
                    className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-amber-400 transition cursor-pointer"
                  >
                    <Trophy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Campaign Footer Helper */}
        <div className="mt-12 p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Collect all 3 hidden gold coins in every course to claim the ultimate <strong>Grandmaster</strong> title!</span>
          </div>

          <button
            onClick={() => setUnlockAll(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[11px] transition cursor-pointer"
          >
            {unlockAll ? <Unlock className="w-3.5 h-3.5 text-cyan-400" /> : <Lock className="w-3.5 h-3.5 text-neutral-400" />}
            <span>{unlockAll ? 'Progression: Free Select (All Open)' : 'Progression: Sequential'}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
