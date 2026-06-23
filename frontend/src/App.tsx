import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreateLeaguePage } from './pages/CreateLeaguePage';
import { LeagueDetailPage } from './pages/LeagueDetailPage';
import { EditScoringRulesPage } from './pages/EditScoringRulesPage';
import { GameweekPredictionsPage } from './pages/GameweekPredictionsPage';
import { JoinLeagueByCodePage } from './pages/JoinLeagueByCodePage';
import { BrowseLeaguesPage } from './pages/BrowseLeaguesPage';
import { OverallPredictionPage } from './pages/OverallPredictionPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminCompetitionsPage } from './pages/admin/AdminCompetitionsPage';
import { AdminFixturesPage } from './pages/admin/AdminFixturesPage';
import { AdminBudgetPage } from './pages/admin/AdminBudgetPage';
import { AdminLeaguesPage } from './pages/admin/AdminLeaguesPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/new"
              element={
                <ProtectedRoute>
                  <CreateLeaguePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/browse"
              element={
                <ProtectedRoute>
                  <BrowseLeaguesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/join/:code"
              element={
                <ProtectedRoute>
                  <JoinLeagueByCodePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/:id"
              element={
                <ProtectedRoute>
                  <LeagueDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/:id/predictions"
              element={
                <ProtectedRoute>
                  <GameweekPredictionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/:id/scoring-rules/edit"
              element={
                <ProtectedRoute>
                  <EditScoringRulesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/:id/overall-prediction"
              element={
                <ProtectedRoute>
                  <OverallPredictionPage />
                </ProtectedRoute>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin/competitions" element={<AdminCompetitionsPage />} />
              <Route path="/admin/fixtures" element={<AdminFixturesPage />} />
              <Route path="/admin/budget" element={<AdminBudgetPage />} />
              <Route path="/admin/leagues" element={<AdminLeaguesPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
