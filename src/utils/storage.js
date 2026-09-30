/**
 * Safe local storage utility with comprehensive error checking and fallback handling.
 */

const STORAGE_KEYS = {
  SKIN: 'dash_runner_skin_v1',
  CUSTOM_LEVELS: 'dash_runner_custom_levels_v1',
  SAVED_PROGRESS: 'dash_runner_progress_v1',
  SETTINGS: 'dash_runner_settings_v1',
};

/**
 * Checks if localStorage is supported and accessible.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('LocalStorage unavailable or quota exceeded:', e);
    return false;
  }
}

/**
 * Safely retrieve parsed JSON data from localStorage.
 * @param {string} key 
 * @param {any} fallbackDefault 
 * @returns {any}
 */
export function safeGetItem(key, fallbackDefault = null) {
  if (!key || typeof key !== 'string') {
    console.error('Invalid key provided to safeGetItem');
    return fallbackDefault;
  }

  if (!isStorageAvailable()) {
    return fallbackDefault;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallbackDefault;
    }
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallbackDefault;
  } catch (err) {
    console.error(`Error reading or parsing localStorage key "${key}":`, err);
    return fallbackDefault;
  }
}

/**
 * Safely write data to localStorage with error catching and quota mitigation.
 * @param {string} key 
 * @param {any} value 
 * @returns {boolean} Success status
 */
export function safeSetItem(key, value) {
  if (!key || typeof key !== 'string') {
    console.error('Invalid key provided to safeSetItem');
    return false;
  }

  if (!isStorageAvailable()) {
    console.warn('LocalStorage is not available for writing.');
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (err) {
    console.error(`Error serializing or saving to localStorage key "${key}":`, err);
    return false;
  }
}

/**
 * Safely delete an item from localStorage.
 * @param {string} key 
 * @returns {boolean}
 */
export function safeRemoveItem(key) {
  if (!key || typeof key !== 'string') return false;
  try {
    if (isStorageAvailable()) {
      window.localStorage.removeItem(key);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error removing localStorage key "${key}":`, err);
    return false;
  }
}

export { STORAGE_KEYS };
