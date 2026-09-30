/**
 * Local-only storage helper for External Music YouTube sources.
 * Strictly persists to user's browser localStorage; no telemetry, no server transmission.
 */

const STORAGE_KEY = 'dash_runner_external_music_sources_v1';
const ACTIVE_KEY = 'dash_runner_external_music_active_id_v1';

/**
 * @typedef {Object} YouTubeSource
 * @property {string} id Unique identifier for the source item
 * @property {'video' | 'playlist'} type
 * @property {string} ytId YouTube video or playlist ID
 * @property {string} title Custom title or display name
 * @property {string} url Original sanitized URL
 * @property {string} addedAt ISO timestamp
 */

/**
 * Default curated sample sources (public domain/creative commons/royalty free synthwave stream samples)
 * for immediate testing so the player can test playback right away if they don't have a URL handy.
 */
export const DEFAULT_MUSIC_PRESETS = [];

/**
 * Loads all saved external music sources from localStorage.
 * Does not provide any default songs/links due to copyright; users add their own if they wish.
 * @returns {YouTubeSource[]}
 */
export function loadSavedSources() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any previous default presets as well
      return parsed.filter(item => 
        item && 
        item.id && 
        !item.id.startsWith('preset_') &&
        item.ytId && 
        (item.type === 'video' || item.type === 'playlist')
      );
    }
    return [];
  } catch (err) {
    console.warn('[ExternalMusic] Error reading local storage:', err);
    return [];
  }
}

/**
 * Saves the entire sources array to localStorage.
 * @param {YouTubeSource[]} sources 
 */
export function saveSources(sources) {
  try {
    if (!Array.isArray(sources)) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch (err) {
    console.warn('[ExternalMusic] Error saving to local storage:', err);
  }
}

/**
 * Loads the ID of the last active source.
 * @returns {string | null}
 */
export function loadActiveSourceId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || null;
  } catch (err) {
    return null;
  }
}

/**
 * Saves the active source ID.
 * @param {string | null} id 
 */
export function saveActiveSourceId(id) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  } catch (err) {
    console.warn('[ExternalMusic] Error saving active ID:', err);
  }
}

/**
 * Clears all saved sources from localStorage.
 */
export function clearAllSources() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_KEY);
  } catch (err) {
    console.warn('[ExternalMusic] Error clearing storage:', err);
  }
}
