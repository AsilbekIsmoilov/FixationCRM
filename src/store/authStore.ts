import { create } from 'zustand';
import { auth } from './api';

type User = {
  id: number;
  username: string;
  fio?: string;
  role?: string;
  position?: string;
  name?: string;        
  first_name?: string; 
  last_name?: string;   
};

type State = {
  user: User | null;
  initializing: boolean;
  loadMe: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
};

export const useAuthStore = create<State>((set, get) => ({
  user: null,
  initializing: true,

  async loadMe() {
    try {
      const me = await auth.me();
      set({ user: me, initializing: false });
    } catch {
      set({ user: null, initializing: false });
    }
  },

  async login(username, password) {
    await auth.login(username, password);
    await get().loadMe();
    return !!get().user;
  },

  logout() {
    auth.logout();
    set({ user: null });
  },
}));
