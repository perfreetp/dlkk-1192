import { LucideIcon } from 'lucide-react';
import { getMasteryColor } from '@/utils/calculation';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  gradient: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  delay?: number;
}

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  trend,
  onClick,
  delay = 0,
}: StatCardProps) => {
  return (
    <div
      className={`card card-hover relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <div className={`absolute top-0 left-0 w-full h-1 ${gradient}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold font-serif text-gray-800">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}% 较上周</span>
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

interface MasteryCardProps {
  name: string;
  masteryRate: number;
  onClick?: () => void;
}

export const MasteryCard = ({ name, masteryRate, onClick }: MasteryCardProps) => {
  const color = getMasteryColor(masteryRate);
  return (
    <div
      className={`p-4 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-all cursor-pointer ${onClick ? 'hover:-translate-y-0.5' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 truncate flex-1 mr-2">{name}</span>
        <span className="text-sm font-bold" style={{ color }}>{masteryRate}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${masteryRate}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};
