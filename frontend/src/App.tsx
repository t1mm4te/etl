import { Route, Routes } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { PipelineEditorPage } from './pages/PipelineEditorPage';
import { PipelinesPage } from './pages/PipelinesPage';
import { RegisterPage } from './pages/RegisterPage';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/pipelines" element={<PipelinesPage />} />
          <Route path="/pipelines/:pipelineId/editor" element={<PipelineEditorPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
