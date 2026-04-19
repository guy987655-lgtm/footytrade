import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  credits: number;
  referralCode: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateCredits: (credits: number) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  hydrated: false,
  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem('token');
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      set({ user, token, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, hydrated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },
  updateCredits: (credits) =>
    set((state) => {
      if (state.user) {
        const updated = { ...state.user, credits };
        localStorage.setItem('user', JSON.stringify(updated));
        return { user: updated };
      }
      return {};
    }),
}));

interface PriceMap {
  [playerId: string]: number;
}

interface PriceStore {
  prices: PriceMap;
  updatePrice: (playerId: string, price: number) => void;
}

export const usePriceStore = create<PriceStore>((set) => ({
  prices: {},
  updatePrice: (playerId, price) =>
    set((state) => ({
      prices: { ...state.prices, [playerId]: price },
    })),
}));
