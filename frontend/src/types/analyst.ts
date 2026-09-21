export type AnalystDay = {
  date: string;
  created: number;
  completed: number;
};

export type AnalystCategory = {
  category: string;
  count: number;
};

export type AnalystMatchCtr = {
  ranked_impressions: number;
  ranked_clicks: number;
  ranked_pct: number;
  random_impressions: number;
  random_clicks: number;
  random_pct: number;
};

export type AnalystFunnel = {
  created: number;
  taken: number;
  completed: number;
  cancelled: number;
};

export type AnalystCell = {
  lat: number;
  lng: number;
  count: number;
};

export type AnalystPoint = {
  id: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
  price: number | string | null;
};

export type AnalystOverview = {
  days: number;
  users: number;
  open_requests: number;
  on_shift: number;
  open_disputes: number;
  held_amount: number;
  created: number;
  completed: number;
  cancelled: number;
  disputes_opened: number;
  spent: number;
  series: AnalystDay[];
  categories: AnalystCategory[];
  cells: AnalystCell[];
  points: AnalystPoint[];
  funnel: AnalystFunnel;
  complete_pct: number;
  cancel_pct: number;
  median_complete_hours: number | null;
  match_ctr: AnalystMatchCtr;
};

export type BusinessStats = {
  requests: number;
  completed: number;
  spent: number;
  held: number;
};
