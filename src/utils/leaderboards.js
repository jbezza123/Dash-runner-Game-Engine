/**
 * Leaderboards and Ranking Engine
 * Calculates individual level records, podium medals (Gold, Silver, Bronze),
 * and collective overall player points across all campaign and custom levels.
 */

// Par times in milliseconds for built-in campaign levels
export const LEVEL_PAR_TIMES = {
  lvl_neon_velocity: 24000,
  lvl_pulse_circuit: 28500,
  lvl_cyber_overdrive: 31000,
  lvl_starlight_demon: 34500,
  lvl_electro_blitz: 32000,
  lvl_hyper_singularity: 36000,
};

// Base points per difficulty tier
export const DIFFICULTY_POINTS = {
  Easy: 1000,
  Medium: 1800,
  Hard: 2600,
  Insane: 3500,
  Demon: 5000,
};

const REAL_RUNS_STORAGE_KEY = 'dash_runner_real_runs_v2';

/**
 * Load all recorded runs from local storage
 */
export function loadAllRecordedRuns() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REAL_RUNS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('Error reading recorded runs:', err);
    return {};
  }
}

/**
 * Save a real completed run for a level
 */
export function recordRealPlayerRun(levelId, { timeMs, coins = 0, attempts = 1, playerName = 'Player' }) {
  if (!levelId || !timeMs) return;
  try {
    const runs = loadAllRecordedRuns();
    if (!Array.isArray(runs[levelId])) {
      runs[levelId] = [];
    }

    const newRun = {
      id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: playerName || 'Player',
      timeMs: Math.round(timeMs),
      coins: Number(coins) || 0,
      attempts: Number(attempts) || 1,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      timestamp: Date.now()
    };

    runs[levelId].push(newRun);
    // Sort fastest first
    runs[levelId].sort((a, b) => a.timeMs - b.timeMs);
    // Keep up to 25 best real runs
    runs[levelId] = runs[levelId].slice(0, 25);

    localStorage.setItem(REAL_RUNS_STORAGE_KEY, JSON.stringify(runs));
  } catch (err) {
    console.warn('Error recording player run:', err);
  }
}

/**
 * Get real ranked runs for an individual level (only genuine player runs)
 */
export function getRankedLevelLeaderboard(level, userStats, playerName = 'Player') {
  if (!level) return [];
  const allRuns = loadAllRecordedRuns();
  const levelRuns = Array.isArray(allRuns[level.id]) ? [...allRuns[level.id]] : [];

  // If userStats reports a cleared run that hasn't been logged yet, include it
  if (userStats && userStats.isCleared && userStats.bestTimeMs) {
    const alreadyLogged = levelRuns.some(r => Math.abs(r.timeMs - userStats.bestTimeMs) < 10);
    if (!alreadyLogged) {
      levelRuns.push({
        id: `legacy_best_${level.id}`,
        name: playerName,
        timeMs: Math.round(userStats.bestTimeMs),
        coins: userStats.coins || 0,
        attempts: userStats.attempts || 1,
        date: 'Personal Best',
        timestamp: Date.now()
      });
    }
  }

  // Sort by timeMs ascending (fastest speedrun first)
  levelRuns.sort((a, b) => a.timeMs - b.timeMs);

  // Assign ranks & medals
  return levelRuns.map((entry, index) => {
    const rank = index + 1;
    let medal = null;
    if (rank === 1) medal = 'gold';
    else if (rank === 2) medal = 'silver';
    else if (rank === 3) medal = 'bronze';

    return {
      ...entry,
      rank,
      medal,
      isUser: true
    };
  });
}

/**
 * Compiles a real summary of all courses with real player scores
 */
export function getRealCoursesOverview(levels = [], progressStats = {}) {
  return levels.map(level => {
    const stats = progressStats[level.id] || null;
    const isCleared = Boolean(stats && stats.isCleared);
    const bestTimeMs = stats?.bestTimeMs || null;
    const parTimeMs = LEVEL_PAR_TIMES[level.id] || null;
    const coins = stats?.coins || 0;
    const attempts = stats?.attempts || 0;
    const bestPercent = stats?.bestPercent || 0;
    const points = calculateLevelPoints(level, stats);

    return {
      levelId: level.id,
      name: level.name,
      difficulty: level.difficulty || 'Easy',
      isCleared,
      bestTimeMs,
      parTimeMs,
      coins,
      attempts,
      bestPercent,
      points
    };
  });
}

/**
 * Calculates score earned on a specific level
 */
export function calculateLevelPoints(level, stats) {
  if (!level || !stats) return 0;
  const difficulty = level.difficulty || 'Easy';
  const basePoints = DIFFICULTY_POINTS[difficulty] || 1000;
  const isCleared = Boolean(stats.isCleared);
  const percent = Math.min(100, stats.bestPercent || 0);
  const coins = stats.coins || 0;

  let points = 0;

  if (isCleared) {
    points += basePoints;
    points += coins * 500; // Secret coins bonus

    const parTime = LEVEL_PAR_TIMES[level.id] || 30000;
    if (stats.bestTimeMs && stats.bestTimeMs < parTime) {
      const timeDiff = parTime - stats.bestTimeMs;
      points += Math.min(1200, Math.floor(timeDiff / 10));
    }

    const attempts = stats.attempts || 1;
    if (attempts <= 3) points += 350;
    else if (attempts <= 10) points += 200;
    else if (attempts <= 25) points += 100;
  } else {
    points += Math.floor((percent / 100) * (basePoints * 0.45));
    points += coins * 250;
  }

  return Math.max(0, points);
}

/**
 * Calculates user's collective points, cleared count, total coins
 */
export function calculateCollectivePlayerStats(levels = [], progressStats = {}) {
  let totalPoints = 0;
  let clearedCount = 0;
  let totalCoins = 0;
  let maxPossibleCoins = 0;
  let totalAttempts = 0;

  levels.forEach(level => {
    if (!level) return;
    const coinsInLevel = (level.objects || []).filter(o => o && o.type === 'collectable_coin').length || 3;
    maxPossibleCoins += coinsInLevel;

    const stats = progressStats[level.id];
    if (stats) {
      const pts = calculateLevelPoints(level, stats);
      totalPoints += pts;
      if (stats.isCleared) clearedCount += 1;
      totalCoins += (stats.coins || 0);
      totalAttempts += (stats.attempts || 0);
    }
  });

  return {
    totalPoints,
    clearedCount,
    totalCoins,
    maxPossibleCoins,
    totalAttempts,
    totalLevels: levels.length,
    careerRank: getPlayerTitle(totalPoints)
  };
}

export function getPlayerTitle(points = 0) {
  if (points >= 22000) return 'Grandmaster';
  if (points >= 17000) return 'Demon Slayer';
  if (points >= 13000) return 'Speed Demon';
  if (points >= 9000) return 'Cyber Vanguard';
  if (points >= 5000) return 'Pulse Runner';
  if (points >= 2000) return 'Acrobat';
  if (points > 0) return 'Novice Runner';
  return 'Unranked';
}

/**
 * Format milliseconds to MM:SS.mmm
 */
export function formatRecordTime(ms) {
  if (!ms || ms <= 0) return '--:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor(ms % 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

