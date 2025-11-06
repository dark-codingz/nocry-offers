-- FunilSpy Schema for Supabase
-- Run this in the SQL Editor of your Supabase project

-- Create table for scan results
CREATE TABLE IF NOT EXISTS funilspy_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('path', 'subdomain')),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_funilspy_results_job_id ON funilspy_results(job_id);
CREATE INDEX IF NOT EXISTS idx_funilspy_results_user_id ON funilspy_results(user_id);
CREATE INDEX IF NOT EXISTS idx_funilspy_results_scanned_at ON funilspy_results(scanned_at DESC);

-- Enable Row Level Security
ALTER TABLE funilspy_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own results
CREATE POLICY "Users can view own results"
  ON funilspy_results
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own results
CREATE POLICY "Users can insert own results"
  ON funilspy_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own results
CREATE POLICY "Users can delete own results"
  ON funilspy_results
  FOR DELETE
  USING (auth.uid() = user_id);

-- Optional: View for easy querying
CREATE OR REPLACE VIEW funilspy_results_view AS
SELECT 
  r.*,
  u.email as user_email
FROM funilspy_results r
LEFT JOIN auth.users u ON r.user_id = u.id;

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON funilspy_results TO authenticated;
GRANT SELECT ON funilspy_results_view TO authenticated;


