export type HelpRequestStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type HoldStatus = "held" | "released" | "refunded";

export type PaymentStatus = "free" | "unpaid" | "held" | "released" | "refunded";

export type OfferStatus = "pending" | "accepted" | "rejected" | "withdrawn";

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
  price: string | null;
  created_at: string;
  distance_m: number | null;
  executor_id: string | null;
  hold_status: HoldStatus | null;
  payment_status?: PaymentStatus | null;
  qr_payload?: string | null;
  code?: string | null;
  eta_at?: string | null;
  has_proof?: boolean;
  contact_phone?: string | null;
  contact_phone_verified?: boolean | null;
};

export type HelpRequestPayload = {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  address_text?: string;
  price?: number | null;
};

export type HelpRequestUpdate = {
  title?: string;
  description?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  address_text?: string;
  price?: number | null;
};

export type Offer = {
  id: string;
  help_request_id: string;
  executor_id: string;
  executor_display_name: string;
  message: string | null;
  status: OfferStatus;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  author_id: string;
  author_display_name: string;
  body: string;
  created_at: string;
  has_image: boolean;
};

export type Review = {
  id: string;
  help_request_id: string;
  author_id: string;
  author_display_name: string;
  subject_id: string;
  score: number;
  comment: string | null;
  created_at: string;
};

export type RequestMatch = {
  user_id: string;
  display_name: string;
  meters: number;
  skill_match: boolean;
  karma_points: number;
  score: number;
  recommended: boolean;
  variant: "ranked" | "random";
};

export type RequestLocation = {
  help_request_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
  eta_at?: string | null;
};

export type Dispute = {
  id: string;
  help_request_id: string;
  author_id: string;
  author_display_name: string;
  reason: string;
  status: "open" | "resolved";
  resolution: string | null;
  created_at: string;
};
