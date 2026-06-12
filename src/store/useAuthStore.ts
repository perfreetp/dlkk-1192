import { create } from 'zustand';
import type { Student, Teacher } from '@/types';
import { mockStudents, currentStudentId } from '@/data/mockStudents';
import { mockTeachers, currentTeacherId } from '@/data/mockTeachers';

interface AuthState {
  currentUser: Student | Teacher | null;
  role: 'student' | 'teacher' | null;
  students: Student[];
  teachers: Teacher[];
  login: (userId: string, role: 'student' | 'teacher') => void;
  logout: () => void;
  switchRole: (role: 'student' | 'teacher') => void;
  getStudentById: (id: string) => Student | undefined;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: mockStudents.find(s => s.id === currentStudentId) || null,
  role: 'student',
  students: mockStudents,
  teachers: mockTeachers,
  login: (userId, role) => {
    const users = role === 'student' ? get().students : get().teachers;
    const user = users.find(u => u.id === userId) || null;
    set({ currentUser: user, role });
  },
  logout: () => set({ currentUser: null, role: null }),
  switchRole: (role) => {
    if (role === 'student') {
      const student = get().students.find(s => s.id === currentStudentId);
      set({ currentUser: student || null, role: 'student' });
    } else {
      const teacher = get().teachers.find(t => t.id === currentTeacherId);
      set({ currentUser: teacher || null, role: 'teacher' });
    }
  },
  getStudentById: (id) => get().students.find(s => s.id === id),
}));
