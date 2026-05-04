export type Site = {
  id: string;
  name: string;
  domain: string;
  api_key: string;
  created_at: string;
};

export type Page = {
  id: string;
  site_id: string;
  name: string;
  page_url: string;
  page_key: string;
  created_at: string;
};

export type Session = {
  id: string;
  site_id: string;
  page_id: string;
  page_url: string;
  viewport_width: number;
  viewport_height: number;
  user_agent: string | null;
  created_at: string;
};

export type EventType = "mouse_move" | "click" | "eye_gaze" | "scroll" | "long_press" | "pinch" | "double_tap";

export type TrackerEvent = {
  id: string;
  session_id: string;
  site_id: string;
  page_id: string;
  event_type: EventType;
  x: number;
  y: number;
  created_at: string;
};

export type Screenshot = {
  id: string;
  page_id: string;
  storage_path: string | null;
  captured_at: string;
};

export type DeviceType = "mobile" | "tablet" | "desktop";

export type DateRange =
  | "today"
  | "7d"
  | "workweek"
  | "30d"
  | "custom";

export type HeatmapPoint = { x: number; y: number; value: number };
