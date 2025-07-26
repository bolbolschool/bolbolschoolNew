export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'admin';
  createdAt?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  maxCapacity: number;
  createdAt?: string;
  isActive: boolean;
  enrollmentCount?: number;
}

export interface GroupSchedule {
  id: string;
  groupId: string;
  date: string;
  time: string;
  isActive: boolean;
  createdAt?: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  groupId: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  groupId: string;
  scheduleId: string;
  date: string;
  isPresent: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  content: string;
  groupId: string;
  createdBy: string;
  createdAt: string;
}

export interface Question {
  id: string;
  title: string;
  content: string;
  groupId: string;
  askedBy: string;
  askedByName: string;
  answeredBy?: string;
  answeredByName?: string;
  answer?: string;
  createdAt: string;
  answeredAt?: string;
}

export interface QuestionInteraction {
  id: string;
  questionId: string;
  userId: string;
  userName: string;
  type: 'like' | 'helpful';
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export interface GroupContextType {
  groups: Group[];
  schedules: GroupSchedule[];
  loading: boolean;
  addGroup: (name: string, description: string) => Promise<boolean>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  toggleGroupStatus: (groupId: string) => Promise<boolean>;
  addSchedule: (groupId: string, date: string, time: string) => Promise<boolean>;
  deleteSchedule: (scheduleId: string) => Promise<boolean>;
  enrollInGroup: (groupId: string, userId: string) => Promise<boolean>;
  removeFromGroup: (groupId: string, userId: string) => Promise<boolean>;
  moveStudentToGroup: (studentId: string, fromGroupId: string, toGroupId: string) => Promise<boolean>;
  getUserGroup: (userId: string) => Promise<Group | null>;
  getGroupById: (groupId: string) => Group | null;
  getGroupSchedules: (groupId: string) => GroupSchedule[];
  getAllUsers: () => User[];
  getGroupStudents: (groupId: string) => Promise<User[]>;
  refreshGroups: () => Promise<void>;
  addSession: (name: string, description: string) => Promise<boolean>;
  deleteSession: (groupId: string) => Promise<boolean>;
  toggleSessionStatus: (groupId: string) => Promise<boolean>;
  enrollInSession: (groupId: string, userId: string) => Promise<boolean>;
  removeFromSession: (groupId: string, userId: string) => Promise<boolean>;
  moveStudentToSession: (studentId: string, fromGroupId: string, toGroupId: string) => Promise<boolean>;
  getUserSession: (userId: string) => Promise<Group | null>;
  getSessionById: (groupId: string) => Group | null;
  getSessionStudents: (groupId: string) => Promise<User[]>;
  refreshSessions: () => Promise<void>;
  sessions: Group[];
}