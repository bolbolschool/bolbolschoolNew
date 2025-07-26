import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Group, GroupSchedule, GroupContextType, User } from '../types';
import { supabase } from '../lib/supabase';

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useSession must be used within a GroupProvider');
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
      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('sessions')
        .select('*')
        .order('day', { ascending: true });

      if (groupsError) {
        console.error('Error loading groups:', groupsError);
        return;
      }

      // Load schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('sessions')
        .select('*')
        .order('day', { ascending: true });

      if (schedulesError) {
        console.error('Error loading schedules:', schedulesError);
        return;
      }

      // Get enrollment counts for each group
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('group_id');

      if (enrollmentsError) {
        console.error('Error loading enrollments:', enrollmentsError);
        return;
      }

      // Count enrollments per group
      const enrollmentCounts = enrollmentsData.reduce((acc, enrollment) => {
        acc[enrollment.group_id] = (acc[enrollment.group_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const groupsWithCounts: Group[] = groupsData.map(group => ({
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

  const addGroup = async (name: string, description: string): Promise<boolean> => {
    try {
      // Parse name to extract day and time (format: "Lundi - 08h00")
      const parts = name.split(' - ');
      if (parts.length !== 2) {
        console.error('Invalid format. Use: "Day - Time"');
        return false;
      }
      
      const [day, time] = parts;
      const groupId = `${day.toLowerCase()}-${time.replace('h', 'h')}`;
      
      // Check if group already exists
      const { data: existingGroup } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', groupId)
        .single();

      if (existingGroup) {
        console.error('Group already exists');
        return false;
      }
      
      const { error } = await supabase
        .from('sessions')
        .insert({
          id: groupId,
          day: day,
          time: time,
          max_capacity: 12,
          is_active: true,
        });

      if (error) {
        console.error('Error adding group:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error adding group:', error);
      return false;
    }
  };

  const deleteGroup = async (groupId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', groupId);

      if (error) {
        console.error('Error deleting group:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error deleting group:', error);
      return false;
    }
  };

  const toggleGroupStatus = async (groupId: string): Promise<boolean> => {
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return false;

      const { error } = await supabase
        .from('sessions')
        .update({ is_active: !group.isActive })
        .eq('id', groupId);

      if (error) {
        console.error('Error toggling group status:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error toggling group status:', error);
      return false;
    }
  };

  const addSchedule = async (groupId: string, date: string, time: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sessions')
        .insert({
          id: `${date}-${time}`,
          day: date,
          time,
          max_capacity: 12,
          is_active: true
        });

      if (error) {
        console.error('Error adding schedule:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error adding schedule:', error);
      return false;
    }
  };

  const deleteSchedule = async (scheduleId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', scheduleId);

      if (error) {
        console.error('Error deleting schedule:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error deleting schedule:', error);
      return false;
    }
  };

  const enrollInGroup = async (groupId: string, userId: string): Promise<boolean> => {
    try {
      // Get fresh group data
      const { data: groupData, error: groupError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError || !groupData || !groupData.is_active) {
        console.error('Group not found or inactive:', groupError);
        return false;
      }

      // Check current enrollment count
      const { data: enrollments, error: countError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('session_id', groupId);

      if (countError) {
        console.error('Error checking enrollment count:', countError);
        return false;
      }

      if (enrollments && enrollments.length >= groupData.max_capacity) {
        console.error('Group is full');
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
          session_id: groupId,
        });

      if (error) {
        console.error('Error enrolling in group:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error enrolling in group:', error);
      return false;
    }
  };

  const removeFromGroup = async (groupId: string, userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', userId)
        .eq('session_id', groupId);

      if (error) {
        console.error('Error removing from group:', error);
        return false;
      }

      await refreshGroups();
      return true;
    } catch (error) {
      console.error('Error removing from group:', error);
      return false;
    }
  };

  const moveStudentToGroup = async (studentId: string, fromGroupId: string, toGroupId: string): Promise<boolean> => {
    try {
      const toGroup = groups.find(g => g.id === toGroupId);
      if (!toGroup || (toGroup.enrollmentCount || 0) >= toGroup.maxCapacity) {
        return false;
      }

      // Remove from current group
      await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', studentId)
        .eq('session_id', fromGroupId);

      // Add to new group
      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: studentId,
          session_id: toGroupId,
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

  const getUserGroup = async (userId: string): Promise<Group | null> => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('session_id, sessions(*)')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      const groupData = data.sessions as any;
      return {
        id: groupData.id,
        name: `${groupData.day} - ${groupData.time}`,
        description: `Séance du ${groupData.day} à ${groupData.time}`,
        maxCapacity: groupData.max_capacity,
        isActive: groupData.is_active,
        createdAt: groupData.created_at,
      };
    } catch (error) {
      return null;
    }
  };

  const getGroupById = (groupId: string): Group | null => {
    return groups.find(group => group.id === groupId) || null;
  };

  const getGroupSchedules = (groupId: string): GroupSchedule[] => {
    return schedules.filter(schedule => schedule.groupId === groupId && schedule.isActive);
  };

  const getAllUsers = (): User[] => {
    return [];
  };

  const getGroupStudents = async (groupId: string): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('users(*)')
        .eq('session_id', groupId);

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
      console.error('Error getting group students:', error);
      return [];
    }
  };

  return (
    <GroupContext.Provider value={{
      groups,
      schedules,
      loading,
      addGroup,
      deleteGroup,
      toggleGroupStatus,
      addSchedule,
      deleteSchedule,
      enrollInGroup,
      removeFromGroup,
      moveStudentToGroup,
      getUserGroup,
      getGroupById,
      getGroupSchedules,
      getAllUsers,
      getGroupStudents,
      refreshGroups,
      // Legacy aliases for compatibility
      sessions: groups,
      addSession: async (name: string, description: string) => addGroup(name, description),
      deleteSession: deleteGroup,
      toggleSessionStatus: toggleGroupStatus,
      enrollInSession: enrollInGroup,
      removeFromSession: removeFromGroup,
      moveStudentToSession: moveStudentToGroup,
      getUserSession: getUserGroup,
      getSessionById: getGroupById,
      getSessionStudents: getGroupStudents,
      refreshSessions: refreshGroups,
    }}>
      {children}
    </GroupContext.Provider>
  );
};