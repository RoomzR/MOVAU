import type { HelpRequest, HelpRequestPayload, HelpRequestUpdate, RequestMatch } from "../types";
import { apiFetch } from "./client";

export type ListRequestsQuery = {
  lat?: number;
  lng?: number;
  radius_m?: number;
  mine?: boolean;
  category?: string;
};

export function listRequests(query: ListRequestsQuery = {}) {
  const params = new URLSearchParams();
  if (query.lat != null && query.lng != null) {
    params.set("lat", String(query.lat));
    params.set("lng", String(query.lng));
    params.set("radius_m", String(query.radius_m ?? 5000));
  }
  if (query.mine) {
    params.set("mine", "true");
  }
  if (query.category) {
    params.set("category", query.category);
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return apiFetch<HelpRequest[]>(`/api/v1/requests${suffix}`);
}

export function getRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}`);
}

export function createRequest(payload: HelpRequestPayload) {
  return apiFetch<HelpRequest>("/api/v1/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRequest(id: string, payload: HelpRequestUpdate) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function cancelRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}`, { method: "DELETE" });
}

export function startRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}/start`, { method: "POST" });
}

export function completeRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}/complete`, { method: "POST" });
}

export function setEta(id: string, minutes: number) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}/eta`, {
    method: "POST",
    body: JSON.stringify({ minutes }),
  });
}

export function takeRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}/take`, {
    method: "POST",
    body: "{}",
  });
}

export function refuseRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}/refuse`, {
    method: "POST",
    body: "{}",
  });
}

export function pingRequestLocation(id: string, latitude: number, longitude: number) {
  return apiFetch<import("../types").RequestLocation>(`/api/v1/requests/${id}/location`, {
    method: "POST",
    body: JSON.stringify({ latitude, longitude }),
  });
}

export function getRequestLocation(id: string) {
  return apiFetch<import("../types").RequestLocation>(`/api/v1/requests/${id}/location`);
}

export function listMatches(id: string) {
  return apiFetch<RequestMatch[]>(`/api/v1/requests/${id}/matches`);
}

export function clickMatch(requestId: string, userId: string) {
  return apiFetch<void>(`/api/v1/requests/${requestId}/matches/${userId}/click`, {
    method: "POST",
    body: "{}",
  });
}

export function repeatRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/requests/${id}/repeat`, {
    method: "POST",
    body: "{}",
  });
}
