import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import ErrorQuestions from '@/pages/ErrorQuestions';
import KnowledgeMap from '@/pages/KnowledgeMap';
import Practice from '@/pages/Practice';
import TeacherWorkbench from '@/pages/TeacherWorkbench';
import Reports from '@/pages/Reports';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/error-questions" element={<ErrorQuestions />} />
          <Route path="/knowledge-map" element={<KnowledgeMap />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/teacher" element={<TeacherWorkbench />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}
