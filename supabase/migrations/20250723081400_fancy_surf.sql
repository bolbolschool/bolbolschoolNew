/*
  # Ajout des tables pour absences, cours et questions

  1. Nouvelles Tables
    - `attendances` - Suivi des présences des étudiants
    - `courses` - Cours envoyés par les administrateurs
    - `questions` - Questions posées par les étudiants
    - `question_interactions` - Interactions avec les questions (like, helpful)

  2. Sécurité
    - Enable RLS sur toutes les nouvelles tables
    - Politiques appropriées pour chaque rôle

  3. Relations
    - Clés étrangères vers users et sessions
    - Contraintes d'intégrité
*/

-- Table des présences
CREATE TABLE IF NOT EXISTS attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  is_present boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, session_id, date)
);

ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- Politiques pour les présences
CREATE POLICY "Admins can manage all attendances"
  ON attendances
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Students can read own attendances"
  ON attendances
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Table des cours
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Politiques pour les cours
CREATE POLICY "Admins can manage courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Students can read courses for their session"
  ON courses
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT enrollments.session_id 
      FROM enrollments 
      WHERE enrollments.user_id::text = auth.uid()::text
    )
  );

-- Table des questions
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  asked_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asked_by_name text NOT NULL,
  answered_by uuid REFERENCES users(id) ON DELETE SET NULL,
  answered_by_name text,
  answer text,
  created_at timestamptz DEFAULT now(),
  answered_at timestamptz
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Politiques pour les questions
CREATE POLICY "Session members can read questions"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT enrollments.session_id 
      FROM enrollments 
      WHERE enrollments.user_id::text = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Students can create questions for their session"
  ON questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT enrollments.session_id 
      FROM enrollments 
      WHERE enrollments.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Admins can answer questions"
  ON questions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Table des interactions avec les questions
CREATE TABLE IF NOT EXISTS question_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('like', 'helpful')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(question_id, user_id, type)
);

ALTER TABLE question_interactions ENABLE ROW LEVEL SECURITY;

-- Politiques pour les interactions
CREATE POLICY "Session members can interact with questions"
  ON question_interactions
  FOR ALL
  TO authenticated
  USING (
    question_id IN (
      SELECT q.id FROM questions q
      WHERE q.session_id IN (
        SELECT enrollments.session_id 
        FROM enrollments 
        WHERE enrollments.user_id::text = auth.uid()::text
      )
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_attendances_user_date ON attendances(user_id, date);
CREATE INDEX IF NOT EXISTS idx_courses_session ON courses(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_session ON questions(session_id);
CREATE INDEX IF NOT EXISTS idx_question_interactions_question ON question_interactions(question_id);