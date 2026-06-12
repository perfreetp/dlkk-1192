import { useState } from 'react';
import { ChevronRight, ChevronDown, BookOpen, ArrowRight, ArrowLeft } from 'lucide-react';
import type { KnowledgePoint } from '@/types';
import { getMasteryColor } from '@/utils/calculation';
import { useQuestionStore } from '@/store/useQuestionStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useKnowledgeStore } from '@/store/useKnowledgeStore';

interface KnowledgeTreeProps {
  subjectId: string;
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
}

interface TreeNodeProps {
  node: KnowledgePoint;
  level: number;
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  studentId?: string;
}

const TreeNode = ({
  node,
  level,
  selectedNodeId,
  onNodeSelect,
  expandedNodes,
  toggleNode,
  studentId,
}: TreeNodeProps) => {
  const { getChildren, getPrerequisites, getSuccessors } = useKnowledgeStore();
  const getMasteryRate = useQuestionStore(s => s.getMasteryRate);
  const children = getChildren(node.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const mastery = studentId ? getMasteryRate(node.id, studentId) : 70;
  const color = getMasteryColor(mastery);
  const prerequisites = getPrerequisites(node.id);
  const successors = getSuccessors(node.id);

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'bg-accent-50 border-l-4 border-accent-500'
            : 'hover:bg-gray-50 border-l-4 border-transparent'
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onNodeSelect(isSelected ? null : node.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(node.id);
            }}
            className="p-0.5 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
        ) : (
          <BookOpen className="w-4 h-4 text-gray-300 ml-0.5" />
        )}
        <span className={`flex-1 text-sm ${isSelected ? 'font-semibold text-accent-700' : 'text-gray-700'}`}>
          {node.name}
        </span>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${mastery}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-xs font-medium w-8 text-right" style={{ color }}>
            {mastery}%
          </span>
        </div>
      </div>

      {isSelected && (prerequisites.length > 0 || successors.length > 0) && (
        <div className="ml-8 mt-2 mb-3 space-y-2 animate-fade-in">
          {prerequisites.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                前置知识 ({prerequisites.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {prerequisites.map(pre => (
                  <span
                    key={pre.id}
                    className="text-xs px-2 py-1 bg-white rounded text-blue-600 cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => onNodeSelect(pre.id)}
                  >
                    {pre.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {successors.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" />
                后续知识 ({successors.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {successors.map(suc => (
                  <span
                    key={suc.id}
                    className="text-xs px-2 py-1 bg-white rounded text-green-600 cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => onNodeSelect(suc.id)}
                  >
                    {suc.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasChildren && isExpanded && (
        <div className="animate-fade-in">
          {children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedNodeId={selectedNodeId}
              onNodeSelect={onNodeSelect}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              studentId={studentId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const KnowledgeTree = ({ subjectId, selectedNodeId, onNodeSelect }: KnowledgeTreeProps) => {
  const { getRootNodes, getKnowledgeTree } = useKnowledgeStore();
  const { currentUser, role } = useAuthStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const studentId = role === 'student' ? currentUser?.id : undefined;
  const rootNodes = getRootNodes(subjectId);
  const allNodes = getKnowledgeTree(subjectId);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        const expandChildren = (nodeId: string, depth = 2) => {
          if (depth <= 0) return;
          const node = allNodes.find(n => n.id === nodeId);
          if (node) {
            const children = allNodes.filter(n => n.parentId === nodeId);
            children.forEach(child => {
              next.add(child.id);
              expandChildren(child.id, depth - 1);
            });
          }
        };
        expandChildren(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedNodes(new Set(allNodes.map(n => n.id)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">知识点目录</h3>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-primary-600 hover:text-primary-700 px-2 py-1 hover:bg-primary-50 rounded transition-colors"
          >
            全部展开
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-50 rounded transition-colors"
          >
            全部收起
          </button>
        </div>
      </div>

      <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
        {rootNodes.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            selectedNodeId={selectedNodeId}
            onNodeSelect={onNodeSelect}
            expandedNodes={expandedNodes}
            toggleNode={toggleNode}
            studentId={studentId}
          />
        ))}
      </div>
    </div>
  );
};
