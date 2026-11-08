type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export const AUTH_STORAGE_KEY = "gestionass-auth-session";
const legacyKeys = ["sb-192-auth-token", "sb-10-auth-token", "sb-127-auth-token"];

export function createAuthStorage(storage: Storage): Storage {
  return {
    async getItem(key) {
      const current = await storage.getItem(key);
      if (current !== null || key !== AUTH_STORAGE_KEY) return current;
      for (const legacyKey of legacyKeys) {
        const previous = await storage.getItem(legacyKey);
        if (previous !== null) {
          await storage.setItem(key, previous);
          return previous;
        }
      }
      return null;
    },
    async setItem(key, value) { await storage.setItem(key, value); },
    async removeItem(key) {
      await storage.removeItem(key);
      if (key === AUTH_STORAGE_KEY) {
        for (const legacyKey of legacyKeys) await storage.removeItem(legacyKey);
      }
    },
  };
}
