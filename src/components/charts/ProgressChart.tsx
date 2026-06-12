import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from 'recharts';
import type { ProgressDataPoint } from '@/types';

interface ProgressChartProps {
  data: ProgressDataPoint[];
  height?: number;
}

export const ProgressChart = ({ data, height = 300 }: ProgressChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCorrect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorMastery" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
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
        <Area
          type="monotone"
          dataKey="correctRate"
          stroke="#00d4aa"
          strokeWidth={2}
          fill="url(#colorCorrect)"
          name="正确率"
          animationDuration={800}
        />
        <Area
          type="monotone"
          dataKey="masteryRate"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#colorMastery)"
          name="掌握度"
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

interface SimpleLineChartProps {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
}

export const SimpleLineChart = ({ data, color = '#00d4aa', height = 200 }: SimpleLineChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
        <YAxis stroke="#94a3b8" fontSize={11} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
          animationDuration={800}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
