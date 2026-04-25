import { create } from 'zustand';

interface AppState {
  user: any | null;
  setUser: (user: any) => void;
  isAuthenticated: boolean;
  setAuthenticated: (status: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isAuthenticated: false,
  setAuthenticated: (status) => set({ isAuthenticated: status }),
}));
