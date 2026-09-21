import type { Review } from "../types";
import { apiFetch } from "./client";

/* оценки по заявке: список и одна оценка от каждой стороны */

export function listReviews(requestId: string) {
  return apiFetch<Review[]>(`/api/v1/requests/${requestId}/reviews`);
}

export function sendReview(requestId: string, score: number, comment?: string) {
  return apiFetch<Review>(`/api/v1/requests/${requestId}/reviews`, {
    method: "POST",
    body: JSON.stringify({ score, comment: comment || null }),
  });
}

export function listUserReviews(userId: string) {
  return apiFetch<Review[]>(`/api/v1/users/${userId}/reviews`);
}
