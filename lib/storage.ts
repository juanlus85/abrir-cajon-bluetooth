import AsyncStorage from '@react-native-async-storage/async-storage';

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const memoryStorage = new Map<string, string>();

function getBrowserStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

function getAsyncStorage(): StorageLike | null {
  const candidate = AsyncStorage as Partial<StorageLike> | undefined;
  if (
    candidate &&
    typeof candidate.getItem === 'function' &&
    typeof candidate.setItem === 'function' &&
    typeof candidate.removeItem === 'function'
  ) {
    return candidate as StorageLike;
  }
  return null;
}

export const safeStorage: StorageLike = {
  async getItem(key) {
    const nativeStorage = getAsyncStorage();
    if (nativeStorage) {
      return nativeStorage.getItem(key);
    }

    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      return browserStorage.getItem(key);
    }

    return memoryStorage.get(key) ?? null;
  },

  async setItem(key, value) {
    const nativeStorage = getAsyncStorage();
    if (nativeStorage) {
      await nativeStorage.setItem(key, value);
      return;
    }

    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      browserStorage.setItem(key, value);
      return;
    }

    memoryStorage.set(key, value);
  },

  async removeItem(key) {
    const nativeStorage = getAsyncStorage();
    if (nativeStorage) {
      await nativeStorage.removeItem(key);
      return;
    }

    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      browserStorage.removeItem(key);
      return;
    }

    memoryStorage.delete(key);
  },
};
