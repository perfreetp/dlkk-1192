import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { ClassMasteryData, ErrorDistributionItem } from '@/types';

const CLASS_COLORS = ['#3b82f6', '#00d4aa', '#f59e0b', '#ef4444', '#8b5cf6'];
const DEFAULT_COLORS = ['#3b82f6', '#00d4aa', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

interface ComparisonChartProps {
  data: (ClassMasteryData | ErrorDistributionItem)[];
  type?: 'bar' | 'pie';
  classNames?: string[];
  height?: number;
  horizontal?: boolean;
}

export const ComparisonChart = ({
  data,
  type = 'bar',
  classNames = [],
  height = 350,
  horizontal = false,
}: ComparisonChartProps) => {
  if (type === 'pie') {
    const pieData = data as ErrorDistributionItem[];
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={true}
            animationDuration={800}
          >
            {pieData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={(entry as ErrorDistributionItem).color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (classNames.length > 0) {
    const barData = data as (ClassMasteryData & Record<string, any>)[];
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="knowledgePoint" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend />
          {classNames.map((name, index) => (
            <Bar
              key={name}
              dataKey={name}
              fill={CLASS_COLORS[index % CLASS_COLORS.length]}
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const barData = data as (ClassMasteryData | ErrorDistributionItem)[];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={barData} layout={horizontal ? 'vertical' : undefined} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        {horizontal ? (
          <>
            <XAxis type="number" stroke="#94a3b8" fontSize={12} />
            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={80} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis type="number" stroke="#94a3b8" fontSize={12} />
          </>
        )}
        <Tooltip />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={800}>
          {barData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={(entry as ErrorDistributionItem).color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

interface DistributionPieChartProps {
  data: ErrorDistributionItem[];
  height?: number;
}

export const DistributionPieChart = ({ data, height = 300 }: DistributionPieChartProps) => {
  return (
    <ComparisonChart data={data} type="pie" height={height} />
  );
};

interface DistributionBarChartProps {
  data: ErrorDistributionItem[];
  height?: number;
  horizontal?: boolean;
}

export const DistributionBarChart = ({ data, height = 300, horizontal = false }: DistributionBarChartProps) => {
  return (
    <ComparisonChart data={data} type="bar" height={height} horizontal={horizontal} />
  );
};
