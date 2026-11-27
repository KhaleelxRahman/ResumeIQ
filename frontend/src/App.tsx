import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { AboutPage } from './pages/AboutPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { BuilderPage } from './pages/BuilderPage';
import { HistoryPage } from './pages/HistoryPage';
import { LandingPage } from './pages/LandingPage';
import { ResultsPage } from './pages/ResultsPage';

export function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/builder" element={<BuilderPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/results/:analysisId" element={<ResultsPage />} />
        <Route path="/dashboard" element={<Navigate to="/analyze" replace />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
