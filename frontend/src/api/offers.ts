import type { Offer } from "../types";
import { apiFetch } from "./client";

export function listOffers(requestId: string) {
  return apiFetch<Offer[]>(`/api/v1/requests/${requestId}/offers`);
}

export function createOffer(requestId: string, message?: string) {
  return apiFetch<Offer>(`/api/v1/requests/${requestId}/offers`, {
    method: "POST",
    body: JSON.stringify(message ? { message } : {}),
  });
}

export function acceptOffer(offerId: string) {
  return apiFetch<Offer>(`/api/v1/offers/${offerId}/accept`, { method: "POST" });
}

export function withdrawOffer(offerId: string) {
  return apiFetch<Offer>(`/api/v1/offers/${offerId}/withdraw`, { method: "POST" });
}
