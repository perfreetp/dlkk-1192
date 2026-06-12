import type { Student } from '@/types';

export const mockStudents: Student[] = [
  { id: 'stu-1', name: '张明远', classId: 'cls-1', joinDate: '2025-09-01' },
  { id: 'stu-2', name: '李思琪', classId: 'cls-1', joinDate: '2025-09-01' },
  { id: 'stu-3', name: '王浩然', classId: 'cls-1', joinDate: '2025-09-01' },
  { id: 'stu-4', name: '刘佳怡', classId: 'cls-2', joinDate: '2025-09-01' },
  { id: 'stu-5', name: '陈宇航', classId: 'cls-2', joinDate: '2025-09-01' },
  { id: 'stu-6', name: '杨紫萱', classId: 'cls-3', joinDate: '2025-09-15' },
  { id: 'stu-7', name: '黄子轩', classId: 'cls-3', joinDate: '2025-09-15' },
  { id: 'stu-8', name: '周雨彤', classId: 'cls-4', joinDate: '2025-10-01' },
];

export const currentStudentId = 'stu-1';
