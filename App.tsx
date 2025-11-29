import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ProjectProvider } from './contexts/ProjectContext';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { ProjectSetup } from './pages/ProjectSetup';
import { Dashboard } from './pages/Dashboard';
import { DrawingUpload } from './pages/DrawingUpload';

const App: React.FC = () => {
  return (
    <ProjectProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<LandingPage />} />
            <Route path="setup" element={<ProjectSetup />} />
            <Route path="dashboard/:projectId" element={<Dashboard />} />
            <Route path="drawings/:projectId" element={<DrawingUpload />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ProjectProvider>
  );
};

export default App;