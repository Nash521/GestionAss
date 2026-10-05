import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_STORAGE_KEY, createAuthStorage } from '../src/lib/auth-storage.ts';

function memoryStorage(entries) {
  const data = new Map(entries);
  return {
    data,
    async getItem(key) { return data.get(key) ?? null; },
    async setItem(key, value) { data.set(key, value); },
    async removeItem(key) { data.delete(key); },
  };
}

test('restores the browser session saved before the local backend address changed', async () => {
  const storage = memoryStorage([['sb-10-auth-token', 'admin-session']]);
  const authStorage = createAuthStorage(storage);

  assert.equal(await authStorage.getItem(AUTH_STORAGE_KEY), 'admin-session');
  assert.equal(storage.data.get(AUTH_STORAGE_KEY), 'admin-session');
});

test('keeps the current session and does not replace it with an older one', async () => {
  const storage = memoryStorage([[AUTH_STORAGE_KEY, 'current-session'], ['sb-10-auth-token', 'old-session']]);

  assert.equal(await createAuthStorage(storage).getItem(AUTH_STORAGE_KEY), 'current-session');
});

test('prefers the session from the current local network when both former keys exist', async () => {
  const storage = memoryStorage([['sb-10-auth-token', 'earlier-session'], ['sb-192-auth-token', 'recent-session']]);

  assert.equal(await createAuthStorage(storage).getItem(AUTH_STORAGE_KEY), 'recent-session');
});

test('signing out clears the current and former session keys', async () => {
  const storage = memoryStorage([[AUTH_STORAGE_KEY, 'current-session'], ['sb-10-auth-token', 'old-session']]);

  await createAuthStorage(storage).removeItem(AUTH_STORAGE_KEY);
  assert.equal(await createAuthStorage(storage).getItem(AUTH_STORAGE_KEY), null);
});
