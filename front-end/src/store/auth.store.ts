import { create } from 'zustand';
import type { User } from '@/types/user.types';

const STORAGE_KEY = 'forklift_flow_auth';

export type SetSessionPayload =
  | { token: string; user: User; requiresPasswordChange: boolean }
  | { token: null; user: null };

/** Persiste só o JWT (string pura). Formatos antigos com `user` são migrados. */
function writeToken(token: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(STORAGE_KEY, token);
}

function clearStoredToken(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

function migrateSessionStorageToLocalStorage(): void {
  if (typeof localStorage === 'undefined' || typeof sessionStorage === 'undefined') {
    return;
  }
  if (localStorage.getItem(STORAGE_KEY)) {
    return;
  }
  const legacy = sessionStorage.getItem(STORAGE_KEY);
  if (legacy) {
    localStorage.setItem(STORAGE_KEY, legacy);
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

function parseStoredToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  // Formato novo: só o JWT
  if (!trimmed.startsWith('{')) {
    return trimmed;
  }
  try {
    const parsed = JSON.parse(trimmed) as { token?: unknown };
    if (typeof parsed.token === 'string' && parsed.token.length > 0) {
      // Migra legado `{ token, user, ... }` → só o token
      writeToken(parsed.token);
      return parsed.token;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function readPersistedToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  migrateSessionStorageToLocalStorage();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  const token = parseStoredToken(raw);
  if (!token) {
    localStorage.removeItem(STORAGE_KEY);
  }
  return token;
}

const initialToken = readPersistedToken();

interface AuthState {
  user: User | null;
  /** JWT retornado pelo login na API. */
  token: string | null;
  /** Quando `true`, bloqueia o app até `POST /auth/password` (primeiro acesso). */
  requiresPasswordChange: boolean;
  setSession: (payload: SetSessionPayload) => void;
  setUser: (user: User | null) => void;
  /** Atualiza usuário e flag de senha a partir de `GET /auth/me`, mantendo o token atual. */
  syncSessionFromProfile: (
    user: User,
    requiresPasswordChange: boolean,
    token?: string,
  ) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: initialToken,
  requiresPasswordChange: false,
  setSession: (payload) => {
    if (payload.token && payload.user) {
      const { token, user, requiresPasswordChange } = payload;
      writeToken(token);
      set({ token, user, requiresPasswordChange });
    } else {
      clearStoredToken();
      set({ user: null, token: null, requiresPasswordChange: false });
    }
  },
  setUser: (user) => set({ user }),
  syncSessionFromProfile: (user, requiresPasswordChange, nextToken) => {
    const token = nextToken ?? get().token;
    if (!token) {
      return;
    }
    writeToken(token);
    set({ user, requiresPasswordChange, token });
  },
  logout: () => {
    clearStoredToken();
    set({ user: null, token: null, requiresPasswordChange: false });
  },
}));
