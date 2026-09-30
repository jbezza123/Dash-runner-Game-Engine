import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Award,
  X,
  CheckCircle2,
  Clock,
  Coins
} from 'lucide-react';
import { soundEngine } from '../engine/audioEngine.js';
import {
  getRankedLevelLeaderboard,
  getRealCoursesOverview,
  calculateCollectivePlayerStats,
  formatRecordTime
} from '../utils/leaderboards.js';

export default function RecordsModal({
  isOpen,
  onClose,
  levels = [],
  progressStats = {},
  initialLevelId = null,
  playerName = 'Runner'
}) {
  const [activeTab, setActiveTab] = useState('levels'); // 'levels' | 'overview'
  const [selectedLevelId, setSelectedLevelId] = useState(
    initialLevelId || levels[0]?.id || 'lvl_neon_velocity'
  );

  if (!isOpen) return null;

  const currentLevel = levels.find(l => l.id === selectedLevelId) || levels[0];
  const userLevelStats = currentLevel ? progressStats[currentLevel.id] : null;

  // Real ranked runs for selected level
  const levelRuns = currentLevel
    ? getRankedLevelLeaderboard(currentLevel, userLevelStats, playerName)
    : [];

  // Real career stats across all courses
  const userCollective = calculateCollectivePlayerStats(levels, progressStats);
  const coursesOverview = getRealCoursesOverview(levels, progressStats);

  const getMedalBadge = (medal, rank) => {
    if (medal === 'gold' || rank === 1) {
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-400 border border-amber-300 text-neutral-950 flex items-center justify-center font-black font-mono shadow-sm">
          <Trophy className="w-4 h-4 fill-current" />
        </div>
      );
    }
    if (medal === 'silver' || rank === 2) {
      return (
        <div className="w-8 h-8 rounded-xl bg-slate-300 border border-slate-200 text-neutral-950 flex items-center justify-center font-black font-mono shadow-sm">
          <Medal className="w-4 h-4 fill-current" />
        </div>
      );
    }
    if (medal === 'bronze' || rank === 3) {
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-700 border border-amber-600 text-amber-100 flex items-center justify-center font-black font-mono shadow-sm">
          <Award className="w-4 h-4 fill-current" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center justify-center font-bold font-mono text-xs">
        #{rank}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display tracking-wide text-white">
                PLAYER RECORDS
              </h2>
              <p className="text-xs text-neutral-400">Verified speedrun times and course completions</p>
            </div>
          </div>

          <button
            id="records-close-btn"
            onClick={() => {
              try { soundEngine.playMenuSelect(); } catch (e) {}
              onClose();
            }}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-6 pt-3 gap-2">
          <button
            id="records-tab-levels"
            onClick={() => {
              try { soundEngine.playMenuSelect(); } catch (e) {}
              setActiveTab('levels');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-t-xl transition cursor-pointer border-t border-x ${
              activeTab === 'levels'
                ? 'bg-neutral-900 text-cyan-400 border-neutral-800 border-b-transparent'
                : 'text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Course Speedruns</span>
          </button>

          <button
            id="records-tab-overall"
            onClick={() => {
              try { soundEngine.playMenuSelect(); } catch (e) {}
              setActiveTab('overview');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-t-xl transition cursor-pointer border-t border-x ${
              activeTab === 'overview'
                ? 'bg-neutral-900 text-amber-400 border-neutral-800 border-b-transparent'
                : 'text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>All Courses Summary</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'levels' ? (
            <div className="flex flex-col gap-5">
              {/* Level Selector Ribbon */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {levels.map((lvl, index) => {
                  const isSelected = lvl.id === selectedLevelId;
                  const isCleared = progressStats[lvl.id]?.isCleared;
                  return (
                    <button
                      key={lvl.id}
                      id={`leaderboard-select-level-${lvl.id}`}
                      onClick={() => {
                        try { soundEngine.playMenuSelect(); } catch (e) {}
                        setSelectedLevelId(lvl.id);
                      }}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition cursor-pointer border ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                          : 'bg-neutral-900/80 text-neutral-400 hover:text-neutral-200 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <span>#{index + 1} {lvl.name}</span>
                      {isCleared && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Selected Level Header Banner */}
              {currentLevel && (
                <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                      Level Records
                    </span>
                    <h3 className="text-lg font-bold font-display text-white">{currentLevel.name}</h3>
                    <p className="text-xs text-neutral-400">
                      Difficulty: <span className="text-cyan-400 font-bold">{currentLevel.difficulty}</span> • Par Time: {currentLevel.length ? `${Math.round(currentLevel.length * 0.2)}s` : '30s'}
                    </p>
                  </div>

                  {/* Player's personal record card for this level */}
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">Best Time</span>
                      <span className="text-cyan-300 font-bold">
                        {userLevelStats?.bestTimeMs
                          ? formatRecordTime(userLevelStats.bestTimeMs)
                          : userLevelStats?.isCleared ? 'Cleared' : 'Not Cleared'}
                      </span>
                    </div>
                    <div className="border-l border-neutral-800 pl-3">
                      <span className="text-[10px] text-neutral-500 uppercase block">Coins</span>
                      <span className="text-amber-400 font-bold">
                        ★ {userLevelStats?.coins || 0}/3
                      </span>
                    </div>
                    <div className="border-l border-neutral-800 pl-3">
                      <span className="text-[10px] text-neutral-500 uppercase block">Attempts</span>
                      <span className="text-neutral-200 font-bold">
                        {userLevelStats?.attempts || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Real Level Records Table */}
              {levelRuns.length === 0 ? (
                <div className="p-8 rounded-xl bg-neutral-950/40 border border-neutral-800/80 text-center flex flex-col items-center justify-center space-y-2">
                  <Clock className="w-8 h-8 text-neutral-600 mb-1" />
                  <p className="text-sm font-semibold text-neutral-300">No Runs Recorded Yet</p>
                  <p className="text-xs text-neutral-500 max-w-sm">
                    Complete this course to record your first real speedrun time on this level.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {levelRuns.map((entry) => (
                    <div
                      key={entry.id || `${entry.timeMs}-${entry.rank}`}
                      className="flex items-center justify-between p-3.5 rounded-xl border bg-neutral-950/60 border-neutral-800 transition-all"
                    >
                      {/* Left side: Medal / Rank & Run Details */}
                      <div className="flex items-center gap-3.5">
                        {getMedalBadge(entry.medal, entry.rank)}

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-sm text-cyan-300">
                              {entry.rank === 1 ? 'Personal Best' : `Run #${entry.rank}`}
                            </span>
                            {entry.date && (
                              <span className="text-[10px] font-mono text-neutral-500">
                                • {entry.date}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {entry.attempts} attempt{entry.attempts > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Right side: Secret Coins & Speedrun Time */}
                      <div className="flex items-center gap-4 text-right font-mono">
                        <div className="hidden sm:block">
                          <span className="text-[10px] text-neutral-500 uppercase block">Coins</span>
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1 justify-end">
                            <Coins className="w-3 h-3" />
                            {entry.coins}/3
                          </span>
                        </div>

                        <div className="min-w-[90px]">
                          <span className="text-[10px] text-neutral-500 uppercase block">Time</span>
                          <span className={`text-sm font-bold flex items-center gap-1 justify-end ${
                            entry.medal === 'gold' ? 'text-amber-300' : 'text-cyan-300'
                          }`}>
                            <Clock className="w-3 h-3 text-cyan-400" />
                            {formatRecordTime(entry.timeMs)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* All Courses Real Summary Tab */
            <div className="flex flex-col gap-6">
              {/* Career Stats Card */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-lg">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold font-display text-white">{playerName}</h3>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">
                      Career Progression • Rank: <span className="text-cyan-400 font-bold">{userCollective.careerRank}</span>
                    </p>
                  </div>

                  {/* Summary Stat Badges */}
                  <div className="flex items-center gap-3 font-mono">
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-center min-w-[100px]">
                      <span className="text-[10px] text-neutral-500 uppercase block">Total Points</span>
                      <span className="text-lg font-black text-amber-400">
                        {userCollective.totalPoints.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-center min-w-[90px]">
                      <span className="text-[10px] text-neutral-500 uppercase block">Cleared</span>
                      <span className="text-lg font-black text-emerald-400">
                        {userCollective.clearedCount} / {userCollective.totalLevels}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-center min-w-[90px]">
                      <span className="text-[10px] text-neutral-500 uppercase block">Coins</span>
                      <span className="text-lg font-black text-amber-300">
                        {userCollective.totalCoins} / {userCollective.maxPossibleCoins}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-center min-w-[90px]">
                      <span className="text-[10px] text-neutral-500 uppercase block">Attempts</span>
                      <span className="text-lg font-black text-neutral-200">
                        {userCollective.totalAttempts}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real Courses Table */}
              <div>
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Course Breakdown
                </h4>

                <div className="flex flex-col gap-2">
                  {coursesOverview.map((item) => (
                    <div
                      key={item.levelId}
                      className="flex items-center justify-between p-3.5 rounded-xl border bg-neutral-950/60 border-neutral-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          item.isCleared
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                        }`}>
                          {item.isCleared ? <CheckCircle2 className="w-4 h-4" /> : `${item.bestPercent}%`}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{item.name}</span>
                            <span className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                              {item.difficulty}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-500 font-mono">
                            {item.attempts} attempt{item.attempts === 1 ? '' : 's'} • Par: {item.parTimeMs ? `${item.parTimeMs / 1000}s` : '30s'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right font-mono">
                        <div className="hidden sm:block">
                          <span className="text-[10px] text-neutral-500 uppercase block">Coins</span>
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1 justify-end">
                            <Coins className="w-3 h-3" />
                            {item.coins}/3
                          </span>
                        </div>

                        <div className="min-w-[80px]">
                          <span className="text-[10px] text-neutral-500 uppercase block">Best Time</span>
                          <span className={`text-xs font-bold ${
                            item.bestTimeMs ? 'text-cyan-300' : 'text-neutral-500'
                          }`}>
                            {item.bestTimeMs ? formatRecordTime(item.bestTimeMs) : '--:--.---'}
                          </span>
                        </div>

                        <div className="min-w-[70px]">
                          <span className="text-[10px] text-neutral-500 uppercase block">Score</span>
                          <span className="text-sm font-bold text-amber-400">
                            {item.points.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Point Calculation Guide */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 text-xs text-neutral-400 space-y-1 font-mono">
                <span className="font-bold text-neutral-200 block mb-1">Point System Breakdown:</span>
                <p>• Course Clears: 1,000 to 5,000 base pts according to difficulty</p>
                <p>• Secret Coins: +500 pts per coin collected</p>
                <p>• Speedrun Bonus: Extra points for finishing under par time</p>
                <p>• Low Attempts: Up to +350 precision bonus for single-digit attempts</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
