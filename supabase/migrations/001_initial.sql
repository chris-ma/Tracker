-- Registered sites
CREATE TABLE IF NOT EXISTS sites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  domain     TEXT NOT NULL,
  api_key    TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specific pages registered for tracking within a site
CREATE TABLE IF NOT EXISTS pages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id    UUID REFERENCES sites(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  page_url   TEXT NOT NULL,
  page_key   TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, page_url)
);

-- One row per page load on a tracked site
CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         UUID REFERENCES sites(id) ON DELETE CASCADE,
  page_id         UUID REFERENCES pages(id) ON DELETE CASCADE,
  page_url        TEXT NOT NULL,
  viewport_width  INTEGER NOT NULL,
  viewport_height INTEGER NOT NULL,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Individual tracking events
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  site_id     UUID REFERENCES sites(id) ON DELETE CASCADE,
  page_id     UUID REFERENCES pages(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('mouse_move', 'click', 'eye_gaze')),
  x           FLOAT NOT NULL,
  y           FLOAT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Page screenshots (one per page)
CREATE TABLE IF NOT EXISTS screenshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id      UUID REFERENCES pages(id) ON DELETE CASCADE UNIQUE,
  storage_path TEXT,
  captured_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS events_page_time ON events (page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS events_site_time ON events (site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS events_type      ON events (event_type);
CREATE INDEX IF NOT EXISTS sessions_page    ON sessions (page_id, created_at DESC);

-- RLS
ALTER TABLE sites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

-- No public access; all reads/writes go through service role in API routes
