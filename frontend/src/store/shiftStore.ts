import { create } from "zustand";

import { beatShift, fetchShiftMe, startShift, stopShift } from "../api/shift";

type Coords = { latitude: number; longitude: number };

type ShiftState = {
  onShift: boolean;
  coords: Coords | null;
  pending: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  heartbeat: () => Promise<void>;
  reset: () => void;
};

function readPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Геолокация недоступна"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => reject(new Error("Не удалось определить место")),
    );
  });
}

export const useShiftStore = create<ShiftState>()((set, get) => ({
  onShift: false,
  coords: null,
  pending: false,
  error: null,
  hydrate: async () => {
    try {
      const state = await fetchShiftMe();
      set({
        onShift: state.on_shift,
        coords:
          state.latitude != null && state.longitude != null
            ? { latitude: state.latitude, longitude: state.longitude }
            : get().coords,
        error: null,
      });
    } catch {
      set({ onShift: false });
    }
  },
  start: async () => {
    set({ pending: true, error: null });
    try {
      const coords = await readPosition();
      const state = await startShift(coords);
      set({
        onShift: state.on_shift,
        coords,
        pending: false,
        error: null,
      });
    } catch (error) {
      set({
        pending: false,
        error: error instanceof Error ? error.message : "Не удалось выйти на смену",
      });
    }
  },
  stop: async () => {
    set({ pending: true, error: null });
    try {
      await stopShift();
      set({ onShift: false, pending: false, error: null });
    } catch (error) {
      set({
        pending: false,
        error: error instanceof Error ? error.message : "Не удалось выйти со смены",
      });
    }
  },
  heartbeat: async () => {
    if (!get().onShift) {
      return;
    }
    try {
      const coords = await readPosition().catch(() => get().coords);
      if (!coords) {
        return;
      }
      const state = await beatShift(coords);
      set({ onShift: state.on_shift, coords });
    } catch {
      set({ onShift: false });
    }
  },
  reset: () => set({ onShift: false, coords: null, pending: false, error: null }),
}));
