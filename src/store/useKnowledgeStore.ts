import { create } from 'zustand';
import type { KnowledgePoint, Subject, Class, Student } from '@/types';
import { mockSubjects } from '@/data/mockSubjects';
import { mockKnowledgePoints } from '@/data/mockKnowledgePoints';
import { mockClasses } from '@/data/mockClasses';
import { mockStudents } from '@/data/mockStudents';

interface KnowledgeTreeNode extends KnowledgePoint {
  children: KnowledgeTreeNode[];
}

interface KnowledgeState {
  subjects: Subject[];
  classes: Class[];
  students: Student[];
  knowledgePoints: KnowledgePoint[];
  selectedSubjectId: string;
  selectedClassId: string;
  setSelectedSubjectId: (id: string) => void;
  setSelectedClassId: (id: string) => void;
  buildKnowledgeTree: (subjectId: string) => KnowledgeTreeNode[];
  getKnowledgeTree: (subjectId: string) => KnowledgePoint[];
  getPrerequisites: (kpId: string) => KnowledgePoint[];
  getSuccessors: (kpId: string) => KnowledgePoint[];
  getChildren: (kpId: string) => KnowledgePoint[];
  getRootNodes: (subjectId: string) => KnowledgePoint[];
  updateKnowledgePoint: (id: string, updates: Partial<KnowledgePoint>) => void;
  addKnowledgePoint: (kp: Omit<KnowledgePoint, 'id'>) => void;
  deleteKnowledgePoint: (id: string) => void;
  getKnowledgePointById: (id: string) => KnowledgePoint | undefined;
  getSubjectById: (id: string) => Subject | undefined;
  getClassById: (id: string) => Class | undefined;
  getStudentById: (id: string) => Student | undefined;
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  subjects: mockSubjects,
  classes: mockClasses,
  students: mockStudents,
  knowledgePoints: mockKnowledgePoints,
  selectedSubjectId: 'sub-1',
  selectedClassId: 'cls-1',
  setSelectedSubjectId: (id) => set({ selectedSubjectId: id }),
  setSelectedClassId: (id) => set({ selectedClassId: id }),

  buildKnowledgeTree: (subjectId) => {
    const kps = get().knowledgePoints.filter(kp => kp.subjectId === subjectId);
    const nodeMap = new Map<string, KnowledgeTreeNode>();

    kps.forEach(kp => {
      nodeMap.set(kp.id, { ...kp, children: [] });
    });

    const roots: KnowledgeTreeNode[] = [];
    nodeMap.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortTree = (nodes: KnowledgeTreeNode[]): KnowledgeTreeNode[] => {
      return nodes
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
        .map(node => ({ ...node, children: sortTree(node.children) }));
    };

    return sortTree(roots);
  },

  getKnowledgeTree: (subjectId) => {
    return get().knowledgePoints.filter(kp => kp.subjectId === subjectId);
  },

  getPrerequisites: (kpId) => {
    const kp = get().knowledgePoints.find(k => k.id === kpId);
    if (!kp) return [];
    return kp.prerequisites
      .map(id => get().knowledgePoints.find(k => k.id === id))
      .filter(Boolean) as KnowledgePoint[];
  },

  getSuccessors: (kpId) => {
    const kp = get().knowledgePoints.find(k => k.id === kpId);
    if (!kp) return [];
    return kp.successors
      .map(id => get().knowledgePoints.find(k => k.id === id))
      .filter(Boolean) as KnowledgePoint[];
  },

  getChildren: (kpId) => {
    return get().knowledgePoints.filter(kp => kp.parentId === kpId);
  },

  getRootNodes: (subjectId) => {
    return get().knowledgePoints.filter(kp => kp.subjectId === subjectId && !kp.parentId);
  },

  updateKnowledgePoint: (id, updates) => {
    set(state => ({
      knowledgePoints: state.knowledgePoints.map(kp =>
        kp.id === id ? { ...kp, ...updates, updatedAt: new Date().toISOString() } : kp
      ),
    }));
  },

  addKnowledgePoint: (kp) => {
    const newKp: KnowledgePoint = {
      ...kp,
      id: `kp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set(state => ({ knowledgePoints: [...state.knowledgePoints, newKp] }));
  },

  deleteKnowledgePoint: (id) => {
    set(state => ({
      knowledgePoints: state.knowledgePoints.filter(kp => kp.id !== id),
    }));
  },

  getKnowledgePointById: (id) => get().knowledgePoints.find(kp => kp.id === id),
  getSubjectById: (id) => get().subjects.find(s => s.id === id),
  getClassById: (id) => get().classes.find(c => c.id === id),
  getStudentById: (id) => get().students.find(s => s.id === id),
}));
