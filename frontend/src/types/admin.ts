import type { IdentityStatus, UserRole } from "./user";
import type { HelpRequestStatus, HoldStatus } from "./request";

export type AdminPage<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminOverview = {
  pending_identity: number;
  open_disputes: number;
  open_requests: number;
  in_progress_requests: number;
  users_total: number;
  users_inactive: number;
};

export type AdminRequest = {
  id: string;
  client_id: string;
  client_email: string;
  client_display_name: string;
  title: string;
  category: string;
  status: HelpRequestStatus;
  price: string | null;
  created_at: string;
  hold_status: HoldStatus | null;
};

export type AdminUserRef = {
  id: string;
  title: string;
  status: HelpRequestStatus;
};

export type AdminUserDetail = {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
  phone_verified: boolean;
  is_active: boolean;
  roles: UserRole[];
  created_at: string;
  identity_status: IdentityStatus;
  requests_total: number;
  requests_open: number;
  requests_completed: number;
  requests: AdminUserRef[];
};

export type AdminEvent = {
  id: string;
  actor_id: string;
  actor_display_name: string;
  actor_email: string;
  kind: string;
  entity_type: string;
  entity_id: string;
  detail: string;
  created_at: string;
};

export type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  roles: UserRole[];
  created_at: string;
};
