import { create } from 'zustand';
import type { User } from '@/types/user.types';

const STORAGE_KEY = 'forklift_flow_auth';

interface PersistedSession {
  token: string;
  user: User;
}

function readPersisted(): { token: string | null; user: User | null } {
  if (typeof sessionStorage === 'undefined') {
    return { token: null, user: null };
  }
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { token: null, user: null };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (typeof parsed.token === 'string' && parsed.user && typeof parsed.user.id === 'string') {
      return { token: parsed.token, user: parsed.user as User };
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  return { token: null, user: null };
}

const initial = readPersisted();

interface AuthState {
  user: User | null;
  /** JWT da API; ausente no login demo sem `VITE_API_URL`. */
  token: string | null;
  setSession: (token: string | null, user: User | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: initial.user,
  token: initial.token,
  setSession: (token, user) => {
    if (typeof sessionStorage !== 'undefined') {
      if (token && user) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user } satisfies PersistedSession));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    set({ token, user });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    set({ user: null, token: null });
  },
}));
