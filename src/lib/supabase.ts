import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          password: string;
          role: 'student' | 'admin';
          created_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email: string;
          password: string;
          role?: 'student' | 'admin';
          created_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          password?: string;
          role?: 'student' | 'admin';
          created_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          day: string;
          time: string;
          max_capacity: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          day: string;
          time: string;
          max_capacity?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          day?: string;
          time?: string;
          max_capacity?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          created_at?: string;
        };
      };
    };
  };
};