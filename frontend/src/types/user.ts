export type UserRole =
  | "client"
  | "executor"
  | "volunteer"
  | "business"
  | "moderator"
  | "analyst"
  | "admin";

export type ClientLevel = "novice" | "regular" | "vip";

export type IdentityStatus = "none" | "pending" | "verified" | "rejected";

export type User = {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
  bio: string | null;
  skills: string | null;
  is_active: boolean;
  roles: UserRole[];
  karma_points: number;
  rating_avg: number | null;
  rating_count: number;
  client_level: ClientLevel;
  completed_as_client: number;
  identity_status: IdentityStatus;
  phone_verified: boolean;
};

export type UserCard = {
  id: string;
  display_name: string;
  bio: string | null;
  skills: string | null;
  roles: UserRole[];
  created_at: string;
  karma_points: number;
  rating_avg: number | null;
  rating_count: number;
  client_level: ClientLevel;
  completed_as_client: number;
  identity_status: IdentityStatus;
};

export type Hero = {
  id: string;
  display_name: string;
  bio: string | null;
  karma_points: number;
  rating_avg: number | null;
  rating_count: number;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};
