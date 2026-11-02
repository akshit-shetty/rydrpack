-- ====================================================================
-- RydrPack: Supabase Fix for Registration, Login, and Live Tracking
-- Run this in your Supabase Dashboard:
-- 1. Go to https://supabase.com/dashboard/project/emcodhbwlxrjrspqkodd
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Paste this entire script and click "Run" (or Ctrl+Enter)
-- ====================================================================

-- 1. Fix riders table: add password column if missing
ALTER TABLE IF EXISTS public.riders ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Configure Row Level Security (RLS) for riders table
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on riders" ON public.riders;
DROP POLICY IF EXISTS "Allow public insert on riders" ON public.riders;
DROP POLICY IF EXISTS "Allow public update on riders" ON public.riders;
DROP POLICY IF EXISTS "Allow public all on riders" ON public.riders;

CREATE POLICY "Allow public all on riders"
  ON public.riders
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 3. Ensure live_riders table exists for GPS tracking
CREATE TABLE IF NOT EXISTS public.live_riders (
  ride_id    TEXT NOT NULL,
  rider_id   TEXT NOT NULL,
  name       TEXT,
  bike       TEXT,
  color      TEXT,
  lat        NUMERIC,
  lng        NUMERIC,
  speed      NUMERIC DEFAULT 0,
  heading    NUMERIC DEFAULT 0,
  online     BOOLEAN DEFAULT TRUE,
  is_host    BOOLEAN DEFAULT FALSE,
  last_seen  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (ride_id, rider_id)
);

ALTER TABLE public.live_riders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on live_riders" ON public.live_riders;
CREATE POLICY "Allow public all on live_riders"
  ON public.live_riders
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 4. Ensure rides table exists and has public RLS
CREATE TABLE IF NOT EXISTS public.rides (
  ride_id          TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  ride_type        TEXT,
  destination_name TEXT,
  destination_lat  NUMERIC,
  destination_lng  NUMERIC,
  ride_date        TEXT,
  ride_time        TEXT,
  pace             TEXT,
  privacy          TEXT DEFAULT 'public',
  size_limit       INT DEFAULT 15,
  safety_notes     TEXT,
  host_id          TEXT,
  host_name        TEXT,
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on rides" ON public.rides;
CREATE POLICY "Allow public all on rides"
  ON public.rides
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 5. Ensure ride_history table exists and has public RLS
CREATE TABLE IF NOT EXISTS public.ride_history (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rider_id     TEXT NOT NULL,
  ride_id      TEXT,
  title        TEXT,
  date         TEXT,
  distance     NUMERIC DEFAULT 0,
  duration     NUMERIC DEFAULT 0,
  avg_speed    NUMERIC DEFAULT 0,
  top_speed    NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ride_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on ride_history" ON public.ride_history;
CREATE POLICY "Allow public all on ride_history"
  ON public.ride_history
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
