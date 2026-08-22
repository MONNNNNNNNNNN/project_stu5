import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RouteTransition } from './components/RouteTransition';
import { ScrollToTop } from './components/ScrollToTop';
import { AppShell } from './components/AppShell';
import { Placeholder } from './components/Placeholder';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard';
import ChildList from './pages/ChildList';
import AddChild from './pages/AddChild';
import GrowthTracking from './pages/GrowthTracking';
import PubertyQuestionnaire from './pages/PubertyQuestionnaire';
import BoneAgeUpload from './pages/BoneAgeUpload';
import KnowledgeCenter from './pages/KnowledgeCenter';
import ArticleDetail from './pages/ArticleDetail';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import PrivacyNotice from './pages/PrivacyNotice';
import TermsOfUse from './pages/TermsOfUse';
import NotFound from './pages/NotFound';

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Home />;
}

export default function App() {
  return (
    <>
    <ScrollToTop />
    <RouteTransition>
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<PrivacyNotice />} />
      <Route path="/terms" element={<TermsOfUse />} />
      {/* Public: the landing page advertises these articles, so sending a signed-out
          visitor who clicks one back to the home page made them look broken. Both pages
          render the app's nav instead of the public one when there is a session. */}
      <Route path="/learn" element={<KnowledgeCenter />} />
      <Route path="/learn/:id" element={<ArticleDetail />} />

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
          <Route path="/milestones" element={<Placeholder title="Milestones" />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Placeholder title="Help" />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </RouteTransition>
    </>
  );
}
