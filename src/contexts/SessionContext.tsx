import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Group, GroupSchedule, GroupContextType, User } from '../types';
import { supabase } from '../lib/supabase';

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [schedules, setSchedules] = useState<GroupSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroups = async () => {
    try {
      // Load groups (sessions)
      const { data: groupsData, error: groupsError } = await supabase
        .from('sessions')
        .select('*')
        .order('day', { ascending: true });

      if (groupsError) {
        console.error('Error loading groups:', groupsError);
        return;
      }

      // We don't seem to have separate schedules, so use groupsData for schedules as well
      const schedulesData = groupsData || [];

      // Get enrollment counts for each group/session
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('session_id');

      if (enrollmentsError) {
        console.error('Error loading enrollments:', enrollmentsError);
        return;
      }

      // Count enrollments per group
      const enrollmentCounts = (enrollmentsData || []).reduce((acc, enrollment) => {
        acc[enrollment.session_id] = (acc[enrollment.session_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const groupsWithCounts: Group[] = (groupsData || []).map(group => ({
        id: group.id,
        name: `${group.day} - ${group.time}`,
        description: `Séance du ${group.day} à ${group.time}`,
        maxCapacity: group.max_capacity,
        isActive: group.is_active,
        createdAt: group.created_at,
        enrollmentCount: enrollmentCounts[group.id] || 0,
      }));

      const schedulesFormatted: GroupSchedule[] = schedulesData.map(schedule => ({
        id: schedule.id,
        groupId: schedule.id,
        date: schedule.day,
        time: schedule.time,
        isActive: schedule.is_active,
        createdAt: schedule.created_at,
      }));

      setGroups(groupsWithCounts);
      setSchedules(schedulesFormatted);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const refreshGroups = async () => {
    await loadGroups();
  };

  // Rename addGroup to addSession and adjust to accept day and time directly
  const addSession = async (day: string, time: string): Promise<boolean> => {
    try {
      const sessionId = `${day.toLowerCase()}-${time.replace(/:/g, 'h').replace(/\s/g, '')}`;

      // Check if session already exists
      const { data: existingSession, error: existingError } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        // PGRST116 = Not found (which is fine)
        console.error('Error checking session existence:', existingError);
        return false;
      }

      if (existingSession) {
        console.error('Session already exists');
        return false;
      }

      const { error } = await supabase
        .from('sessions')
        .insert({
          id: sessionId,
          day,
          time,
          max_capacity: 12,
          enrollment_count: 0,
          is_active: true,
        });

      if (error) {
        console.error('Error adding session:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error adding session:', error);
      return false;
    }
  };

  const deleteSession = async (sessionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Error deleting session:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  };

  const toggleSessionStatus = async (sessionId: string): Promise<boolean> => {
    try {
      const session = groups.find(g => g.id === sessionId);
      if (!session) return false;

      const { error } = await supabase
        .from('sessions')
        .update({ is_active: !session.isActive })
        .eq('id', sessionId);

      if (error) {
        console.error('Error toggling session status:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error toggling session status:', error);
      return false;
    }
  };

  const enrollInSession = async (sessionId: string, userId: string): Promise<boolean> => {
    try {
      // Get fresh session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData || !sessionData.is_active) {
        console.error('Session not found or inactive:', sessionError);
        return false;
      }

      // Check current enrollment count
      const { data: enrollments, error: countError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('session_id', sessionId);

      if (countError) {
        console.error('Error checking enrollment count:', countError);
        return false;
      }

      if (enrollments && enrollments.length >= sessionData.max_capacity) {
        console.error('Session is full');
        return false;
      }

      // Remove any existing enrollment for this user
      await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', userId);

      // Add new enrollment
      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: userId,
          session_id: sessionId,
        });

      if (error) {
        console.error('Error enrolling in session:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error enrolling in session:', error);
      return false;
    }
  };

  const removeFromSession = async (sessionId: string, userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', userId)
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error removing from session:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error removing from session:', error);
      return false;
    }
  };

  const moveStudentToSession = async (studentId: string, fromSessionId: string, toSessionId: string): Promise<boolean> => {
    try {
      const toSession = groups.find(g => g.id === toSessionId);
      if (!toSession || (toSession.enrollmentCount || 0) >= toSession.maxCapacity) {
        return false;
      }

      // Remove from current session
      await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', studentId)
        .eq('session_id', fromSessionId);

      // Add to new session
      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: studentId,
          session_id: toSessionId,
        });

      if (error) {
        console.error('Error moving student:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error moving student:', error);
      return false;
    }
  };

  const getUserSession = async (userId: string): Promise<Group | null> => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('session_id, sessions(*)')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      const sessionData = data.sessions as any;
      return {
        id: sessionData.id,
        name: `${sessionData.day} - ${sessionData.time}`,
        description: `Séance du ${sessionData.day} à ${sessionData.time}`,
        maxCapacity: sessionData.max_capacity,
        isActive: sessionData.is_active,
        createdAt: sessionData.created_at,
      };
    } catch (error) {
      return null;
    }
  };

  const getSessionById = (sessionId: string): Group | null => {
    return groups.find(group => group.id === sessionId) || null;
  };

  const getSessionSchedules = (sessionId: string): GroupSchedule[] => {
    return schedules.filter(schedule => schedule.groupId === sessionId && schedule.isActive);
  };

  const getAllUsers = (): User[] => {
    return [];
  };

  const getSessionStudents = async (sessionId: string): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('users(*)')
        .eq('session_id', sessionId);

      if (error || !data) {
        return [];
      }

      return data.map((enrollment: any) => ({
        id: enrollment.users.id,
        firstName: enrollment.users.first_name,
        lastName: enrollment.users.last_name,
        email: enrollment.users.email,
        role: enrollment.users.role,
        createdAt: enrollment.users.created_at,
      }));
    } catch (error) {
      console.error('Error getting session students:', error);
     
