/*
  # Fix enrollments and sessions tables with proper RLS policies

  1. Tables
    - Recreate enrollments table with proper constraints
    - Recreate sessions table with proper structure
    
  2. Security
    - Enable RLS on both tables
    - Add policies using correct auth.uid() function
    
  3. Sample Data
    - Insert sample sessions for the week
*/

-- Drop existing problematic constraints
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS one_enrollment_per_user;

-- Recreate enrollments table with proper constraints
DROP TABLE IF EXISTS enrollments CASCADE;
CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, session_id)
);

-- Create index for better performance
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_session ON enrollments(session_id);

-- Enable RLS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enrollments
CREATE POLICY "Admins can manage all enrollments"
  ON enrollments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can manage own enrollments"
  ON enrollments
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Fix sessions table - ensure it exists with proper structure
DROP TABLE IF EXISTS sessions CASCADE;
CREATE TABLE sessions (
  id text PRIMARY KEY,
  day text NOT NULL,
  time text NOT NULL,
  max_capacity integer DEFAULT 12,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions
CREATE POLICY "Anyone can read sessions"
  ON sessions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage sessions"
  ON sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert sample sessions
INSERT INTO sessions (id, day, time, max_capacity, is_active) VALUES
('lun-0800', 'Lundi', '08h00', 12, true),
('lun-1000', 'Lundi', '10h00', 12, true),
('lun-1400', 'Lundi', '14h00', 12, true),
('lun-1600', 'Lundi', '16h00', 12, true),
('mar-0800', 'Mardi', '08h00', 12, true),
('mar-1000', 'Mardi', '10h00', 12, true),
('mar-1400', 'Mardi', '14h00', 12, true),
('mar-1600', 'Mardi', '16h00', 12, true),
('mer-0800', 'Mercredi', '08h00', 12, true),
('mer-1000', 'Mercredi', '10h00', 12, true),
('mer-1400', 'Mercredi', '14h00', 12, true),
('mer-1600', 'Mercredi', '16h00', 12, true),
('jeu-0800', 'Jeudi', '08h00', 12, true),
('jeu-1000', 'Jeudi', '10h00', 12, true),
('jeu-1400', 'Jeudi', '14h00', 12, true),
('jeu-1600', 'Jeudi', '16h00', 12, true),
('ven-0800', 'Vendredi', '08h00', 12, true),
('ven-1000', 'Vendredi', '10h00', 12, true),
('ven-1400', 'Vendredi', '14h00', 12, true),
('ven-1600', 'Vendredi', '16h00', 12, true),
('sam-0800', 'Samedi', '08h00', 12, true),
('sam-1000', 'Samedi', '10h00', 12, true),
('sam-1400', 'Samedi', '14h00', 12, true),
('sam-1600', 'Samedi', '16h00', 12, true)
ON CONFLICT (id) DO NOTHING;