import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { KnowledgePoint } from '@/types';
import { getMasteryColor, getMasteryLabel } from '@/utils/calculation';
import { useQuestionStore } from '@/store/useQuestionStore';
import { useAuthStore } from '@/store/useAuthStore';

interface KnowledgeGraphProps {
  nodes: KnowledgePoint[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  studentId?: string;
}

interface NodePosition {
  x: number;
  y: number;
}

export const KnowledgeGraph = ({ nodes, selectedNodeId, onNodeSelect, studentId }: KnowledgeGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(0.8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const { currentUser, role } = useAuthStore();
  const getMasteryRate = useQuestionStore(s => s.getMasteryRate);
  const effectiveStudentId = studentId || (role === 'student' ? currentUser?.id : undefined);

  const calculatePositions = useCallback(() => {
    const width = 800;
    const height = 500;
    const newPositions: Record<string, NodePosition> = {};
    const levelNodes: KnowledgePoint[][] = [[], [], []];
    nodes.forEach(node => {
      if (node.level >= 1 && node.level <= 3) {
        levelNodes[node.level - 1].push(node);
      }
    });
    levelNodes.forEach((level, levelIndex) => {
      const ySpacing = height / (level.length + 1);
      level.forEach((node, nodeIndex) => {
        const x = 100 + levelIndex * 250;
        const y = ySpacing * (nodeIndex + 1);
        newPositions[node.id] = { x, y };
      });
    });
    setPositions(newPositions);
  }, [nodes]);

  useEffect(() => {
    calculatePositions();
  }, [calculatePositions]);

  const getRelatedNodes = (nodeId: string): Set<string> => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return new Set();
    return new Set([
      nodeId,
      ...node.prerequisites,
      ...node.successors,
    ]);
  };

  const relatedNodes = selectedNodeId ? getRelatedNodes(selectedNodeId) : new Set();

  const renderEdges = () => {
    return nodes.flatMap(node =>
      node.prerequisites.map(preId => {
        const from = positions[preId];
        const to = positions[node.id];
        if (!from || !to) return null;
        const isHighlighted = selectedNodeId && (preId === selectedNodeId || node.id === selectedNodeId);
        return (
          <line
            key={`${preId}-${node.id}`}
            x1={from.x + offset.x}
            y1={from.y + offset.y}
            x2={to.x + offset.x}
            y2={to.y + offset.y}
            stroke={isHighlighted ? '#00d4aa' : '#cbd5e1'}
            strokeWidth={isHighlighted ? 2 : 1}
            strokeDasharray={isHighlighted ? '' : '4,4'}
            opacity={selectedNodeId && !isHighlighted ? 0.2 : 1}
            className="transition-all duration-300"
            markerEnd="url(#arrowhead)"
          />
        );
      })
    );
  };

  const renderNodes = () => {
    return nodes.map(node => {
      const pos = positions[node.id];
      if (!pos) return null;
      const mastery = effectiveStudentId ? getMasteryRate(node.id, effectiveStudentId) : 70;
      const color = getMasteryColor(mastery);
      const isSelected = selectedNodeId === node.id;
      const isRelated = relatedNodes.has(node.id);
      const isHovered = hoveredNodeId === node.id;
      const nodeSize = node.level === 1 ? 60 : node.level === 2 ? 50 : 40;
      const fontSize = node.level === 1 ? 13 : node.level === 2 ? 12 : 11;

      return (
        <g
          key={node.id}
          transform={`translate(${pos.x + offset.x}, ${pos.y + offset.y})`}
          className="cursor-pointer transition-all duration-300"
          onClick={() => onNodeSelect(isSelected ? null : node.id)}
          onMouseEnter={() => setHoveredNodeId(node.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
          opacity={selectedNodeId && !isRelated ? 0.3 : 1}
        >
          <circle
            r={nodeSize / 2 + (isSelected || isHovered ? 4 : 0)}
            fill={`${color}20`}
            stroke={color}
            strokeWidth={isSelected ? 3 : 2}
            className="transition-all duration-300"
          />
          <circle
            r={nodeSize / 2 - 4}
            fill="white"
            stroke={color}
            strokeWidth={1.5}
          />
          <text
            textAnchor="middle"
            dy="0.3em"
            fontSize={fontSize}
            fontWeight={isSelected ? 600 : 500}
            fill="#334155"
          >
            {node.name.length > 6 ? `${node.name.slice(0, 6)}...` : node.name}
          </text>
          <text
            textAnchor="middle"
            y={nodeSize / 2 + 16}
            fontSize={10}
            fill={color}
            fontWeight={600}
          >
            {mastery}%
          </text>
        </g>
      );
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(0.5, Math.min(2, s * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setDragging(false);

  const resetView = () => {
    setScale(0.8);
    setOffset({ x: 0, y: 0 });
  };

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
  const selectedMastery = selectedNode && effectiveStudentId
    ? getMasteryRate(selectedNode.id, effectiveStudentId)
    : null;

  return (
    <div className="relative bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl overflow-hidden">
      <svg
        ref={svgRef}
        width="100%"
        height="500"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={dragging ? 'cursor-grabbing' : 'cursor-grab'}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
          </marker>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
          </filter>
        </defs>
        <g transform={`scale(${scale}) translate(${offset.x / scale}, ${offset.y / scale})`}>
          {renderEdges()}
          {renderNodes()}
        </g>
      </svg>

      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setScale(s => Math.min(2, s * 1.2))}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        >
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => setScale(s => Math.max(0.5, s * 0.8))}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        >
          <ZoomOut className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={resetView}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        >
          <Maximize2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {selectedNode && (
        <div className="absolute top-4 left-4 bg-white rounded-xl shadow-lg p-4 max-w-xs animate-fade-in">
          <h4 className="font-bold text-gray-800 mb-2">{selectedNode.name}</h4>
          {selectedMastery !== null && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">掌握度</span>
                <span className="text-sm font-bold" style={{ color: getMasteryColor(selectedMastery) }}>
                  {selectedMastery}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${selectedMastery}%`, backgroundColor: getMasteryColor(selectedMastery) }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{getMasteryLabel(selectedMastery)}</p>
            </div>
          )}
          {selectedNode.description && (
            <p className="text-sm text-gray-600 mb-3">{selectedNode.description}</p>
          )}
          <button
            onClick={() => onNodeSelect(null)}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            点击空白处取消选择
          </button>
        </div>
      )}

      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-md">
        <p className="text-xs font-medium text-gray-700 mb-2">掌握度图例</p>
        <div className="space-y-1.5">
          {[
            { label: '熟练掌握', color: '#00d4aa', range: '≥80%' },
            { label: '基本掌握', color: '#3b82f6', range: '60-79%' },
            { label: '部分掌握', color: '#f59e0b', range: '40-59%' },
            { label: '有待加强', color: '#f97316', range: '20-39%' },
            { label: '需要关注', color: '#ef4444', range: '<20%' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-gray-600">{item.label}</span>
              <span className="text-xs text-gray-400 ml-auto">{item.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
