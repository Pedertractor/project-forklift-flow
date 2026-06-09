import { create } from 'zustand';
import type { User } from '@/types/user.types';

const STORAGE_KEY = 'forklift_flow_auth';

export type SetSessionPayload =
  | { token: string; user: User; requiresPasswordChange: boolean }
  | { token: null; user: null };

interface PersistedSession {
  token: string;
  user: User;
  requiresPasswordChange?: boolean;
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

function readPersisted(): {
  token: string | null;
  user: User | null;
  requiresPasswordChange: boolean;
} {
  if (typeof localStorage === 'undefined') {
    return { token: null, user: null, requiresPasswordChange: false };
  }
  migrateSessionStorageToLocalStorage();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { token: null, user: null, requiresPasswordChange: false };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (typeof parsed.token === 'string' && parsed.user && typeof parsed.user.id === 'string') {
      return {
        token: parsed.token,
        user: parsed.user as User,
        requiresPasswordChange: parsed.requiresPasswordChange === true,
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return { token: null, user: null, requiresPasswordChange: false };
}

const initial = readPersisted();

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
  user: initial.user,
  token: initial.token,
  requiresPasswordChange: initial.requiresPasswordChange,
  setSession: (payload) => {
    if (payload.token && payload.user) {
      const { token, user, requiresPasswordChange } = payload;
      if (typeof localStorage !== 'undefined') {
        const toSave: PersistedSession = {
          token,
          user,
          ...(requiresPasswordChange ? { requiresPasswordChange: true } : {}),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      }
      set({ token, user, requiresPasswordChange });
    } else {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEY);
      }
      set({ user: null, token: null, requiresPasswordChange: false });
    }
  },
  setUser: (user) => set({ user }),
  syncSessionFromProfile: (user, requiresPasswordChange, nextToken) => {
    const token = nextToken ?? get().token;
    if (!token) {
      return;
    }
    if (typeof localStorage !== 'undefined') {
      const toSave: PersistedSession = {
        token,
        user,
        ...(requiresPasswordChange ? { requiresPasswordChange: true } : {}),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
    set({ user, requiresPasswordChange, token });
  },
  logout: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    set({ user: null, token: null, requiresPasswordChange: false });
  },
}));
