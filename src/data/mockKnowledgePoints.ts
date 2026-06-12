import type { KnowledgePoint } from '@/types';

export const mockKnowledgePoints: KnowledgePoint[] = [
  { id: 'kp-1', name: '函数与导数', subjectId: 'sub-1', level: 1, prerequisites: [], successors: ['kp-2', 'kp-3'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-2', name: '导数的几何意义', subjectId: 'sub-1', parentId: 'kp-1', level: 2, prerequisites: ['kp-1'], successors: ['kp-4'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-3', name: '导数的应用', subjectId: 'sub-1', parentId: 'kp-1', level: 2, prerequisites: ['kp-1'], successors: ['kp-5', 'kp-6'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-4', name: '切线方程', subjectId: 'sub-1', parentId: 'kp-2', level: 3, prerequisites: ['kp-2'], successors: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-5', name: '单调性判断', subjectId: 'sub-1', parentId: 'kp-3', level: 3, prerequisites: ['kp-3'], successors: ['kp-7'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-6', name: '极值与最值', subjectId: 'sub-1', parentId: 'kp-3', level: 3, prerequisites: ['kp-3'], successors: ['kp-7'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-7', name: '导数综合应用', subjectId: 'sub-1', parentId: 'kp-1', level: 2, prerequisites: ['kp-5', 'kp-6'], successors: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-8', name: '三角函数', subjectId: 'sub-1', level: 1, prerequisites: [], successors: ['kp-9', 'kp-10'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-9', name: '三角恒等变换', subjectId: 'sub-1', parentId: 'kp-8', level: 2, prerequisites: ['kp-8'], successors: ['kp-11'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-10', name: '三角函数图像', subjectId: 'sub-1', parentId: 'kp-8', level: 2, prerequisites: ['kp-8'], successors: ['kp-11'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-11', name: '三角函数综合', subjectId: 'sub-1', parentId: 'kp-8', level: 2, prerequisites: ['kp-9', 'kp-10'], successors: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-12', name: '数列', subjectId: 'sub-1', level: 1, prerequisites: [], successors: ['kp-13', 'kp-14'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-13', name: '等差数列', subjectId: 'sub-1', parentId: 'kp-12', level: 2, prerequisites: ['kp-12'], successors: ['kp-15'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-14', name: '等比数列', subjectId: 'sub-1', parentId: 'kp-12', level: 2, prerequisites: ['kp-12'], successors: ['kp-15'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-15', name: '数列求和', subjectId: 'sub-1', parentId: 'kp-12', level: 2, prerequisites: ['kp-13', 'kp-14'], successors: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-16', name: '力学', subjectId: 'sub-2', level: 1, prerequisites: [], successors: ['kp-17', 'kp-18'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-17', name: '牛顿运动定律', subjectId: 'sub-2', parentId: 'kp-16', level: 2, prerequisites: ['kp-16'], successors: ['kp-19'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-18', name: '曲线运动', subjectId: 'sub-2', parentId: 'kp-16', level: 2, prerequisites: ['kp-16'], successors: ['kp-20'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-19', name: '受力分析', subjectId: 'sub-2', parentId: 'kp-17', level: 3, prerequisites: ['kp-17'], successors: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'kp-20', name: '圆周运动', subjectId: 'sub-2', parentId: 'kp-18', level: 3, prerequisites: ['kp-18'], successors: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];
