import { NavLink } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Network,
  FileText,
  BarChart3,
  Settings,
  User,
  GraduationCap,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
  { path: '/', icon: Home, label: '学员首页', roles: ['student', 'teacher'] },
  { path: '/error-questions', icon: BookOpen, label: '错题库', roles: ['student', 'teacher'] },
  { path: '/knowledge-map', icon: Network, label: '知识点地图', roles: ['student', 'teacher'] },
  { path: '/practice', icon: FileText, label: '组卷练习', roles: ['student', 'teacher'] },
  { path: '/teacher', icon: Settings, label: '教师工作台', roles: ['teacher'] },
  { path: '/reports', icon: BarChart3, label: '统计报表', roles: ['student', 'teacher'] },
];

export const Sidebar = () => {
  const { role, switchRole, currentUser } = useAuthStore();

  const filteredItems = navItems.filter(item => item.roles.includes(role || 'student'));

  return (
    <aside className="w-64 bg-gradient-to-b from-primary-900 to-primary-800 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-primary-700">
        <h1 className="text-xl font-bold font-serif flex items-center gap-2">
          <GraduationCap className="w-8 h-8 text-accent-400" />
          <span className="bg-gradient-to-r from-accent-300 to-accent-400 bg-clip-text text-transparent">
            错题知识图谱
          </span>
        </h1>
        <p className="text-xs text-primary-300 mt-1">智能备考管理系统</p>
      </div>

      <div className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {filteredItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-accent-500/20 text-accent-300 border-l-4 border-accent-400'
                      : 'text-primary-200 hover:bg-primary-700/50 hover:text-white'
                  }`
                }
              >
                <Icon className={`w-5 h-5 ${index === 0 ? 'animate-stagger-1' : index === 1 ? 'animate-stagger-2' : index === 2 ? 'animate-stagger-3' : index === 3 ? 'animate-stagger-4' : index === 4 ? 'animate-stagger-5' : 'animate-stagger-6'} transition-transform group-hover:scale-110`} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-primary-700">
        <div className="flex items-center gap-3 px-2 py-3 rounded-lg bg-primary-700/50">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-accent-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{currentUser?.name}</p>
            <p className="text-xs text-primary-300">
              {role === 'student' ? '学员' : '教师'}
            </p>
          </div>
        </div>

        <button
          onClick={() => switchRole(role === 'student' ? 'teacher' : 'student')}
          className="mt-3 w-full px-3 py-2 text-xs text-primary-300 hover:text-white hover:bg-primary-700/50 rounded-lg transition-colors"
        >
          切换到{role === 'student' ? '教师' : '学员'}身份
        </button>
      </div>
    </aside>
  );
};
