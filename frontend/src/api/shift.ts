import { useAuthStore } from "../store/authStore";
import { apiFetch } from "./client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type ShiftState = {
  on_shift: boolean;
  latitude: number | null;
  longitude: number | null;
  updated_at: string | null;
};

export type ShiftLocation = {
  latitude: number;
  longitude: number;
};

export function listShiftLive() {
  return apiFetch<import("../types").ShiftLivePerson[]>("/api/v1/shift/live");
}

export function fetchShiftMe() {
  return apiFetch<ShiftState>("/api/v1/shift/me");
}

export function startShift(payload: ShiftLocation) {
  return apiFetch<ShiftState>("/api/v1/shift/on", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function beatShift(payload: ShiftLocation) {
  return apiFetch<ShiftState>("/api/v1/shift/heartbeat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function stopShift() {
  return apiFetch<ShiftState>("/api/v1/shift/off", { method: "POST" });
}

/** Выключить смену при закрытии вкладки или выходе — токен берём сразу. */
export function stopShiftKeepalive() {
  const token = useAuthStore.getState().accessToken;
  if (!token) {
    return;
  }
  void fetch(`${API_URL}/api/v1/shift/off`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    keepalive: true,
  });
}
