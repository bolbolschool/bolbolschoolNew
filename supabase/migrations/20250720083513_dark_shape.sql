/*
  # Ensure Admin Account Exists

  1. Admin Account
    - Creates admin account if it doesn't exist
    - Email: admin@admin.tn
    - Password: bilelbenzbiba
    - Role: admin

  2. Security
    - Uses proper password (plain text for demo purposes)
    - Ensures admin role is set correctly
*/

-- Insert admin account if it doesn't exist
INSERT INTO users (first_name, last_name, email, password, role)
VALUES ('Admin', 'BOLBOL', 'admin@admin.tn', 'bilelbenzbiba', 'admin')
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  first_name = 'Admin',
  last_name = 'BOLBOL';