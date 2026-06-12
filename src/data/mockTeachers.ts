import type { Teacher } from '@/types';

export const mockTeachers: Teacher[] = [
  { id: 'tea-1', name: '王建国', subject: '数学' },
  { id: 'tea-2', name: '李秀英', subject: '物理' },
  { id: 'tea-3', name: '张明德', subject: '化学' },
];

export const currentTeacherId = 'tea-1';
