import { create } from 'zustand';
import { api } from '../lib/api';
import type { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (username: string, password: string, email?: string) => Promise<AuthUser>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('gravity_token', data.accessToken);
    localStorage.setItem('gravity_refresh', data.refreshToken);
    set({ user: data.user });
    return data.user;
  },

  register: async (username, password, email) => {
    const { data } = await api.post('/auth/register', { username, password, email });
    localStorage.setItem('gravity_token', data.accessToken);
    localStorage.setItem('gravity_refresh', data.refreshToken);
    set({ user: data.user });
    return data.user;
  },

  logout: () => {
    localStorage.removeItem('gravity_token');
    localStorage.removeItem('gravity_refresh');
    set({ user: null });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('gravity_token');
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, loading: false });
    } catch {
      localStorage.removeItem('gravity_token');
      set({ user: null, loading: false });
    }
  },
}));
