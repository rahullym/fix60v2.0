import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import type { AuthTokens, Me } from '../api/types';

const TOKENS_KEY = 'fix60.tokens';
const USER_KEY = 'fix60.user';

export interface SessionState {
  isHydrated: boolean;
  tokens: AuthTokens | null;
  user: Me | null;
}

let state: SessionState = { isHydrated: false, tokens: null, user: null };
const listeners = new Set<() => void>();

function setState(next: Partial<SessionState>): void {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Session store: tokens live in the OS keystore, the cached profile alongside them. */
export const session = {
  getState: (): SessionState => state,

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  hydrate: async (): Promise<void> => {
    const [tokens, user] = await Promise.all([readJson<AuthTokens>(TOKENS_KEY), readJson<Me>(USER_KEY)]);
    setState({ isHydrated: true, tokens, user: tokens ? user : null });
  },

  signIn: async (tokens: AuthTokens, user: Me): Promise<void> => {
    await Promise.all([
      SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens)),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    setState({ tokens, user });
  },

  setTokens: async (tokens: AuthTokens): Promise<void> => {
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
    setState({ tokens });
  },

  setUser: async (user: Me): Promise<void> => {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    setState({ user });
  },

  clear: async (): Promise<void> => {
    await Promise.all([SecureStore.deleteItemAsync(TOKENS_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
    setState({ tokens: null, user: null });
  },
};

/** Subscribes a component to the session. */
export function useSession(): SessionState {
  return useSyncExternalStore(session.subscribe, session.getState, session.getState);
}
