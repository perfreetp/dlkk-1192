import { create } from 'zustand';
import type { KnowledgePoint, Subject, Class, Student } from '@/types';
import { mockSubjects } from '@/data/mockSubjects';
import { mockKnowledgePoints } from '@/data/mockKnowledgePoints';
import { mockClasses } from '@/data/mockClasses';
import { mockStudents } from '@/data/mockStudents';
import { saveToStorage, loadFromStorage } from '@/utils/persist';

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
  addKnowledgePoint: (kp: Omit<KnowledgePoint, 'id'>) => KnowledgePoint;
  deleteKnowledgePoint: (id: string) => void;
  getKnowledgePointById: (id: string) => KnowledgePoint | undefined;
  getSubjectById: (id: string) => Subject | undefined;
  getClassById: (id: string) => Class | undefined;
  getStudentById: (id: string) => Student | undefined;
  lastKnowledgeChange: {
    type: 'update' | 'add' | 'delete';
    changedAt: string;
    kpId: string;
    kpName?: string;
    beforeSnapshot: KnowledgePoint[];
    afterSnapshot: KnowledgePoint[];
  } | null;
  undoLastKnowledgeChange: () => KnowledgePoint[] | null;
}

const persistKnowledgePoints = (data: KnowledgePoint[]) => saveToStorage('knowledgePoints', data);

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  subjects: mockSubjects,
  classes: mockClasses,
  students: mockStudents,
  knowledgePoints: loadFromStorage('knowledgePoints', mockKnowledgePoints),
  selectedSubjectId: 'sub-1',
  selectedClassId: 'cls-1',
  lastKnowledgeChange: null,
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
    set(state => {
      const beforeSnapshot = state.knowledgePoints.map(kp => ({ ...kp, prerequisites: [...kp.prerequisites], successors: [...kp.successors] }));
      const targetKp = state.knowledgePoints.find(kp => kp.id === id);

      const newPrereqs = updates.prerequisites !== undefined ? updates.prerequisites : targetKp?.prerequisites || [];
      const newSuccessors = updates.successors !== undefined ? updates.successors : targetKp?.successors || [];
      const oldPrereqs = targetKp?.prerequisites || [];
      const oldSuccessors = targetKp?.successors || [];

      let updated = state.knowledgePoints.map(kp =>
        kp.id === id ? { ...kp, ...updates, updatedAt: new Date().toISOString() } : { ...kp }
      );

      updated = updated.map(kp => {
        const changed: string[] = [];

        const isPrereqOfTarget_old = oldPrereqs.includes(kp.id);
        const isPrereqOfTarget_new = newPrereqs.includes(kp.id);
        if (isPrereqOfTarget_old && !isPrereqOfTarget_new) {
          kp.successors = kp.successors.filter(sid => sid !== id);
          changed.push('successors');
        } else if (!isPrereqOfTarget_old && isPrereqOfTarget_new) {
          if (!kp.successors.includes(id)) {
            kp.successors = [...kp.successors, id];
            changed.push('successors');
          }
        }

        const isSuccessorOfTarget_old = oldSuccessors.includes(kp.id);
        const isSuccessorOfTarget_new = newSuccessors.includes(kp.id);
        if (isSuccessorOfTarget_old && !isSuccessorOfTarget_new) {
          kp.prerequisites = kp.prerequisites.filter(pid => pid !== id);
          changed.push('prerequisites');
        } else if (!isSuccessorOfTarget_old && isSuccessorOfTarget_new) {
          if (!kp.prerequisites.includes(id)) {
            kp.prerequisites = [...kp.prerequisites, id];
            changed.push('prerequisites');
          }
        }

        if (changed.length > 0 && kp.id !== id) {
          kp.updatedAt = new Date().toISOString();
        }
        return kp;
      });

      persistKnowledgePoints(updated);
      return {
        knowledgePoints: updated,
        lastKnowledgeChange: {
          type: 'update',
          changedAt: new Date().toISOString(),
          kpId: id,
          kpName: targetKp?.name,
          beforeSnapshot,
          afterSnapshot: updated.map(kp => ({ ...kp, prerequisites: [...kp.prerequisites], successors: [...kp.successors] })),
        },
      };
    });
  },

  addKnowledgePoint: (kp) => {
    const newKp: KnowledgePoint = {
      ...kp,
      id: `kp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set(state => {
      const beforeSnapshot = state.knowledgePoints.map(k => ({ ...k, prerequisites: [...k.prerequisites], successors: [...k.successors] }));
      let updated = [...state.knowledgePoints, newKp];
      updated = updated.map(item => {
        if (newKp.prerequisites.includes(item.id)) {
          return { ...item, successors: [...item.successors, newKp.id], updatedAt: new Date().toISOString() };
        }
        return item;
      });
      persistKnowledgePoints(updated);
      return {
        knowledgePoints: updated,
        lastKnowledgeChange: {
          type: 'add',
          changedAt: new Date().toISOString(),
          kpId: newKp.id,
          kpName: newKp.name,
          beforeSnapshot,
          afterSnapshot: updated.map(k => ({ ...k, prerequisites: [...k.prerequisites], successors: [...k.successors] })),
        },
      };
    });
    return newKp;
  },

  deleteKnowledgePoint: (id) => {
    set(state => {
      const beforeSnapshot = state.knowledgePoints.map(kp => ({ ...kp, prerequisites: [...kp.prerequisites], successors: [...kp.successors] }));
      const targetKp = state.knowledgePoints.find(kp => kp.id === id);
      let updated = state.knowledgePoints.filter(kp => kp.id !== id);
      updated = updated.map(kp => ({
        ...kp,
        prerequisites: kp.prerequisites.filter(pid => pid !== id),
        successors: kp.successors.filter(sid => sid !== id),
        parentId: kp.parentId === id ? undefined : kp.parentId,
        updatedAt: new Date().toISOString(),
      }));
      persistKnowledgePoints(updated);
      return {
        knowledgePoints: updated,
        lastKnowledgeChange: {
          type: 'delete',
          changedAt: new Date().toISOString(),
          kpId: id,
          kpName: targetKp?.name,
          beforeSnapshot,
          afterSnapshot: updated.map(kp => ({ ...kp, prerequisites: [...kp.prerequisites], successors: [...kp.successors] })),
        },
      };
    });
  },

  undoLastKnowledgeChange: () => {
    const { lastKnowledgeChange } = get();
    if (!lastKnowledgeChange) return null;
    const restored = lastKnowledgeChange.beforeSnapshot;
    set(state => ({
      knowledgePoints: restored,
      lastKnowledgeChange: null,
    }));
    persistKnowledgePoints(restored);
    return restored;
  },

  getKnowledgePointById: (id) => get().knowledgePoints.find(kp => kp.id === id),
  getSubjectById: (id) => get().subjects.find(s => s.id === id),
  getClassById: (id) => get().classes.find(c => c.id === id),
  getStudentById: (id) => get().students.find(s => s.id === id),
}));
