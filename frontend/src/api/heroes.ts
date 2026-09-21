import type { Hero } from "../types";
import { apiFetch } from "./client";

export function listHeroes() {
  return apiFetch<Hero[]>("/api/v1/heroes");
}
