/*
  # Transformation du système de séances en système de groupes

  1. Nouvelles Tables
    - `groups` - Remplace les sessions avec gestion des dates
      - `id` (text, primary key) - Identifiant du groupe
      - `name` (text) - Nom du groupe (ex: "Groupe A", "Groupe Économie")
      - `description` (text) - Description du groupe
      - `max_capacity` (integer) - Capacité maximale
      - `is_active` (boolean) - Statut actif/inactif
      - `created_at` (timestamp)
    
    - `group_schedules` - Horaires programmés pour chaque groupe
      - `id` (uuid, primary key)
      - `group_id` (text) - Référence au groupe
      - `date` (date) - Date de la séance
      - `time` (text) - Heure de la séance
      - `is_active` (boolean) - Séance active ou annulée
      - `created_at` (timestamp)

  2. Tables Mises à Jour
    - `enrollments` - Mise à jour pour référencer les groupes
    - `attendances` - Mise à jour pour référencer les horaires de groupe
    - `courses` - Mise à jour pour référencer les groupes
    - `questions` - Mise à jour pour référencer les groupes

  3. Sécurité
    - Enable RLS sur toutes les nouvelles tables
    - Politiques pour admins et étudiants
*/

-- Supprimer les anciennes tables et contraintes
DROP TABLE IF EXISTS attendances CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS question_interactions CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Créer la table des groupes
CREATE TABLE IF NOT EXISTS groups (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  max_capacity integer DEFAULT 12,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Créer la table des horaires de groupes
CREATE TABLE IF NOT EXISTS group_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  date date NOT NULL,
  time text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Créer la table des inscriptions aux groupes
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- Créer la table des présences
CREATE TABLE IF NOT EXISTS attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES group_schedules(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  is_present boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, schedule_id, date)
);

-- Créer la table des cours
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  group_id text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Créer la table des questions
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  group_id text NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  asked_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asked_by_name text NOT NULL,
  answered_by uuid REFERENCES users(id) ON DELETE SET NULL,
  answered_by_name text,
  answer text,
  created_at timestamptz DEFAULT now(),
  answered_at timestamptz
);

-- Créer la table des interactions avec les questions
CREATE TABLE IF NOT EXISTS question_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('like', 'helpful')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(question_id, user_id, type)
);

-- Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_group_schedules_group ON group_schedules(group_id);
CREATE INDEX IF NOT EXISTS idx_group_schedules_date ON group_schedules(date);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_group ON enrollments(group_id);
CREATE INDEX IF NOT EXISTS idx_attendances_user_date ON attendances(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_schedule ON attendances(schedule_id);
CREATE INDEX IF NOT EXISTS idx_courses_group ON courses(group_id);
CREATE INDEX IF NOT EXISTS idx_questions_group ON questions(group_id);
CREATE INDEX IF NOT EXISTS idx_question_interactions_question ON question_interactions(question_id);

-- Activer RLS sur toutes les tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_interactions ENABLE ROW LEVEL SECURITY;

-- Politiques pour la table groups
CREATE POLICY "Anyone can read active groups"
  ON groups
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage groups"
  ON groups
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = uid()::text AND users.role = 'admin'
  ));

-- Politiques pour la table group_schedules
CREATE POLICY "Anyone can read active schedules"
  ON group_schedules
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage schedules"
  ON group_schedules
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = uid()::text AND users.role = 'admin'
  ));

-- Politiques pour la table enrollments
CREATE POLICY "Users can read own enrollments"
  ON enrollments
  FOR SELECT
  TO authenticated
  USING (user_id::text = uid()::text);

CREATE POLICY "Users can manage own enrollments"
  ON enrollments
  FOR ALL
  TO authenticated
  USING (user_id::text = uid()::text);

CREATE POLICY "Admins can manage all enrollments"
  ON enrollments
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = uid()::text AND users.role = 'admin'
  ));

-- Politiques pour la table attendances
CREATE POLICY "Students can read own attendances"
  ON attendances
  FOR SELECT
  TO authenticated
  USING (user_id::text = uid()::text);

CREATE POLICY "Admins can manage all attendances"
  ON attendances
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = uid()::text AND users.role = 'admin'
  ));

-- Politiques pour la table courses
CREATE POLICY "Students can read courses for their group"
  ON courses
  FOR SELECT
  TO authenticated
  USING (group_id IN (
    SELECT enrollments.group_id
    FROM enrollments
    WHERE enrollments.user_id::text = uid()::text
  ));

CREATE POLICY "Admins can manage courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = uid()::text AND users.role = 'admin'
  ));

-- Politiques pour la table questions
CREATE POLICY "Students can create questions for their group"
  ON questions
  FOR INSERT
  TO authenticated
  WITH CHECK (group_id IN (
    SELECT enrollments.group_id
    FROM enrollments
    WHERE enrollments.user_id::text = uid()::text
  ));

CREATE POLICY "Group members can read questions"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT enrollments.group_id
      FROM enrollments
      WHERE enrollments.user_id::text = uid()::text
    ) OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = uid()::text AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can answer questions"
  ON questions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::text = uid()::text AND users.role = 'admin'
  ));

-- Politiques pour la table question_interactions
CREATE POLICY "Group members can interact with questions"
  ON question_interactions
  FOR ALL
  TO authenticated
  USING (
    question_id IN (
      SELECT q.id
      FROM questions q
      WHERE q.group_id IN (
        SELECT enrollments.group_id
        FROM enrollments
        WHERE enrollments.user_id::text = uid()::text
      )
    ) OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = uid()::text AND users.role = 'admin'
    )
  );

-- Insérer des groupes par défaut
INSERT INTO groups (id, name, description, max_capacity, is_active) VALUES
('groupe-a', 'Groupe A', 'Groupe d''étude A - Économie générale', 12, true),
('groupe-b', 'Groupe B', 'Groupe d''étude B - Microéconomie', 12, true),
('groupe-c', 'Groupe C', 'Groupe d''étude C - Macroéconomie', 12, true),
('groupe-d', 'Groupe D', 'Groupe d''étude D - Économie internationale', 12, true);

-- Insérer quelques horaires par défaut pour les groupes
INSERT INTO group_schedules (group_id, date, time, is_active) VALUES
('groupe-a', CURRENT_DATE + INTERVAL '1 day', '08h00', true),
('groupe-a', CURRENT_DATE + INTERVAL '3 days', '10h00', true),
('groupe-a', CURRENT_DATE + INTERVAL '5 days', '14h00', true),
('groupe-b', CURRENT_DATE + INTERVAL '2 days', '08h00', true),
('groupe-b', CURRENT_DATE + INTERVAL '4 days', '10h00', true),
('groupe-b', CURRENT_DATE + INTERVAL '6 days', '14h00', true),
('groupe-c', CURRENT_DATE + INTERVAL '1 day', '16h00', true),
('groupe-c', CURRENT_DATE + INTERVAL '3 days', '16h00', true),
('groupe-d', CURRENT_DATE + INTERVAL '2 days', '16h00', true),
('groupe-d', CURRENT_DATE + INTERVAL '4 days', '16h00', true);