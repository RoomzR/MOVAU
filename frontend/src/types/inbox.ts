export type ShiftLivePerson = {
  id: string;
  display_name: string;
  latitude: number;
  longitude: number;
  updated_at: string;
};

export type InboxNotification = {
  id: string;
  kind:
    | "request_taken"
    | "message"
    | "identity_reviewed"
    | "offer"
    | "request_started"
    | "request_completed"
    | "payment_released"
    | "dispute_opened"
    | "dispute_resolved"
    | "request_nearby";
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

export type NotificationList = {
  items: InboxNotification[];
  unread_count: number;
};
