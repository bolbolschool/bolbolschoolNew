/*
  # Create enrollments table

  1. New Tables
    - `enrollments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `session_id` (text, foreign key to sessions)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `enrollments` table
    - Add policy for users to read their own enrollments
    - Add policy for admins to manage all enrollments
    - Add unique constraint to prevent duplicate enrollments
*/

CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, session_id)
);

-- Add unique constraint to ensure one enrollment per user
CREATE UNIQUE INDEX IF NOT EXISTS one_enrollment_per_user ON enrollments(user_id);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Users can read their own enrollments
CREATE POLICY "Users can read own enrollments"
  ON enrollments
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Users can manage their own enrollments
CREATE POLICY "Users can manage own enrollments"
  ON enrollments
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Admins can read all enrollments
CREATE POLICY "Admins can read all enrollments"
  ON enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Admins can manage all enrollments
CREATE POLICY "Admins can manage all enrollments"
  ON enrollments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );