const STORAGE_PREFIX = 'error-graph-app-';

export const saveToStorage = <T>(key: string, data: T): void => {
  try {
    const fullKey = STORAGE_PREFIX + key;
    localStorage.setItem(fullKey, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const fullKey = STORAGE_PREFIX + key;
    const stored = localStorage.getItem(fullKey);
    if (stored === null) {
      return defaultValue;
    }
    return JSON.parse(stored) as T;
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
    return defaultValue;
  }
};

export const clearStorage = (key?: string): void => {
  try {
    if (key) {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } else {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(k);
        }
      });
    }
  } catch (e) {
    console.error('Failed to clear localStorage:', e);
  }
};
