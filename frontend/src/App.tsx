import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { Placeholder } from './components/Placeholder';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import ChildList from './pages/ChildList';
import AddChild from './pages/AddChild';
import GrowthTracking from './pages/GrowthTracking';
import PubertyQuestionnaire from './pages/PubertyQuestionnaire';
import BoneAgeUpload from './pages/BoneAgeUpload';
import KnowledgeCenter from './pages/KnowledgeCenter';
import ArticleDetail from './pages/ArticleDetail';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/children/new" element={<AddChild />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/children" element={<ChildList />} />
          <Route path="/children/:id/edit" element={<AddChild />} />
          <Route path="/growth" element={<GrowthTracking />} />
          <Route path="/growth/add" element={<GrowthTracking />} />
          <Route path="/puberty" element={<PubertyQuestionnaire />} />
          <Route path="/bone-age" element={<BoneAgeUpload />} />
          <Route path="/learn" element={<KnowledgeCenter />} />
          <Route path="/learn/:id" element={<ArticleDetail />} />
          <Route path="/milestones" element={<Placeholder title="Milestones" />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
          <Route path="/help" element={<Placeholder title="Help" />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
