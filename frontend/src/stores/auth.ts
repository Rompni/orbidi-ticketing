import { create } from "zustand";

export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  setUser: (u: User | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
