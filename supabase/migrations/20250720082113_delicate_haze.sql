/*
  # Create sessions table

  1. New Tables
    - `sessions`
      - `id` (text, primary key)
      - `day` (text)
      - `time` (text)
      - `max_capacity` (integer, default 12)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `sessions` table
    - Add policy for authenticated users to read sessions
    - Add policy for admins to manage sessions
*/

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  day text NOT NULL,
  time text NOT NULL,
  max_capacity integer DEFAULT 12,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can read sessions
CREATE POLICY "Anyone can read sessions"
  ON sessions
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can manage sessions
CREATE POLICY "Admins can manage sessions"
  ON sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );