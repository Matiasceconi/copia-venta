import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Navigate } from 'react-router-dom';
import { Component } from 'react';
import { base44 } from '@/api/base44Client';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Layout from '@/components/staff/Layout';
import { WorkspaceProvider } from '@/lib/WorkspaceContext';
import { PlayerCard360Provider } from '@/components/player/PlayerCard360Context';
import PlayerCard360 from '@/components/player/PlayerCard360';
import Dashboard from '@/pages/Dashboard';
import Sessions from '@/pages/Sessions';
import Catapult from '@/pages/Catapult';
import Tactical from '@/pages/Tactical';
import PerformanceExternalLoad from '@/pages/PerformanceExternalLoad';
import MicrocycleHistory from '@/pages/MicrocycleHistory';
import PerformanceInternalLoad from '@/pages/PerformanceInternalLoad';
import PerformanceMedical from '@/pages/PerformanceMedical';
import PerformanceNutrition from '@/pages/PerformanceNutrition';
import PerformanceMinutes from '@/pages/PerformanceMinutes';
import Team from '@/pages/Team';
import Schedule from '@/pages/Schedule';
import Matches from '@/pages/Matches';
import MatchDetail from '@/pages/MatchDetail';
import PlayerNameManagement from '@/pages/PlayerNameManagement';
import PlantilDiagnostic from '@/pages/PlantilDiagnostic';
import WeeklyPlanner from '@/pages/WeeklyPlanner';
import AdminHub from '@/pages/AdminHub';
import DailySquad from '@/pages/DailySquad';
import Players from '@/pages/Players';
import SquadManager from '@/pages/SquadManager';
import FieldLibrary from '@/pages/FieldLibrary';
import StrengthLibrary from '@/pages/StrengthLibrary';
import UsersAccess from '@/pages/UsersAccess';

// ── Global Error Boundary ─────────────────────────────────────────────────
class GlobalErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(err, info) { console.error("GlobalErrorBoundary:", err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
          <div className="w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
              <span className="text-red-400 text-2xl">✕</span>
            </div>
            <h2 className="text-white font-bold text-lg">Ocurrió un error inesperado</h2>
            <p className="text-zinc-400 text-sm">{this.state.error?.message}</p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors">
                Reintentar
              </button>
              <button
                onClick={() => base44.auth.logout(window.location.origin)}
                className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-colors">
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/catapult" element={<Catapult />} />
          <Route path="/tactical" element={<Tactical />} />
          <Route path="/performance/external-load" element={<PerformanceExternalLoad />} />
          <Route path="/gps" element={<PerformanceExternalLoad />} />
          <Route path="/performance/microcycle-history" element={<MicrocycleHistory />} />
          <Route path="/performance/internal-load" element={<PerformanceInternalLoad />} />
          <Route path="/performance/medical" element={<PerformanceMedical />} />
          <Route path="/performance/nutrition" element={<PerformanceNutrition />} />
          <Route path="/performance/minutes" element={<PerformanceMinutes />} />
          <Route path="/team" element={<Team />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route path="/player-names" element={<PlayerNameManagement />} />
          <Route path="/plantil-diagnostic" element={<PlantilDiagnostic />} />
          <Route path="/weekly-planner" element={<WeeklyPlanner />} />
          <Route path="/admin" element={<AdminHub />} />
          <Route path="/daily-squad" element={<DailySquad />} />
          <Route path="/players" element={<Players />} />
          <Route path="/squad-manager" element={<SquadManager />} />
          <Route path="/field-library" element={<FieldLibrary />} />
          <Route path="/strength-library" element={<StrengthLibrary />} />
          <Route path="/users-access" element={<UsersAccess />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <WorkspaceProvider>
              <PlayerCard360Provider>
                <AuthenticatedApp />
                <PlayerCard360 />
              </PlayerCard360Provider>
            </WorkspaceProvider>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}

export default App