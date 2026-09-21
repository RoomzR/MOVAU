export type UserRole = "client" | "executor" | "volunteer" | "business" | "moderator" | "analyst" | "admin";

export type HelpRequestStatus = "open" | "assigned" | "in_progress" | "completed" | "cancelled";

export type User = {
  id: string;
  email: string;
  display_name: string;
  roles: UserRole[];
  karma_points: number;
  rating_avg: number | null;
  rating_count: number;
  identity_status?: string;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
};

export type HelpRequest = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category: string;
  status: HelpRequestStatus;
  latitude: number;
  longitude: number;
  address_text: string | null;
  price: string | number | null;
  hold_status: "held" | "released" | "refunded" | null;
  executor_id: string | null;
  distance_m: number | null;
  eta_at?: string | null;
};

export type ChatMessage = {
  id: string;
  author_id: string;
  author_display_name: string;
  body: string;
  created_at: string;
  has_image: boolean;
};

export type RequestLocation = {
  help_request_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
  eta_at?: string | null;
};

export type WalletMe = {
  balance: number;
};

export type ShiftPublic = {
  on_shift: boolean;
};
