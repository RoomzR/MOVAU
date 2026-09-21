import { create } from "zustand";
import { persist } from "zustand/middleware";

import { fetchMe, login as loginRequest, register as registerRequest } from "../api/auth";
import type { User } from "../types";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    display_name: string;
    as_executor: boolean;
    as_volunteer?: boolean;
  }) => Promise<void>;
  loadMe: () => Promise<void>;
  setUser: (user: User) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      login: async (email, password) => {
        const tokens = await loginRequest({ email, password });
        set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
        await get().loadMe();
      },
      register: async (payload) => {
        const tokens = await registerRequest(payload);
        set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
        await get().loadMe();
      },
      loadMe: async () => {
        if (!get().accessToken) {
          return;
        }
        const user = await fetchMe();
        set({ user });
      },
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "movau-auth" },
  ),
);
