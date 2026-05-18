import { create } from 'zustand';

const TOKEN_KEY = 'auth_token';

interface AuthStore {
  token: string | null;
  isAuthorized: boolean;
  setToken: (token: string) => void;
  clearAuth: () => void;
}

const initialToken = localStorage.getItem(TOKEN_KEY);

export const useAuthStore = create<AuthStore>((set) => ({
  token: initialToken,
  isAuthorized: Boolean(initialToken),

  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token, isAuthorized: true });
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, isAuthorized: false });
  },
}));
