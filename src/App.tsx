import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminRoute } from './components/layout/AdminRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLayout } from './components/layout/PageLayout';
import { ToastProvider } from './components/ui/Toast';
import { EmptyState } from './components/ui/EmptyState';
import { Skeleton } from './components/ui/Skeleton';
import { isRetryableApiError } from './lib/errors';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Code splitting : chaque page est chargée à la demande (bundle initial réduit)
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const TeamDashboardPage = lazy(() => import('./pages/TeamDashboardPage'));
const TeamCreatePage = lazy(() => import('./pages/TeamCreatePage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const CreateProjectPage = lazy(() => import('./pages/CreateProjectPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const ConvertPage = lazy(() => import('./pages/ConvertPage'));
const PreviewPage = lazy(() => import('./pages/PreviewPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const TestSuitesPage = lazy(() => import('./pages/TestSuitesPage'));
const InvitationPage = lazy(() => import('./pages/InvitationPage'));
const SprintBoardPage = lazy(() => import('./pages/SprintBoardPage'));
const DefectTrackerPage = lazy(() => import('./pages/DefectTrackerPage'));
const WeeklyReportPage = lazy(() => import('./pages/WeeklyReportPage'));
const MemberProgressPage = lazy(() => import('./pages/MemberProgressPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
// Espace Super-Admin (réservé aux superusers)
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminTeamsPage = lazy(() => import('./pages/admin/AdminTeamsPage'));
const AdminProjectsPage = lazy(() => import('./pages/admin/AdminProjectsPage'));
const AdminJobsPage = lazy(() => import('./pages/admin/AdminJobsPage'));
const AdminActivityPage = lazy(() => import('./pages/admin/AdminActivityPage'));
const AdminSystemPage = lazy(() => import('./pages/admin/AdminSystemPage'));
const AdminUseCasesPage = lazy(() => import('./pages/admin/AdminUseCasesPage'));
const AdminSprintsPage = lazy(() => import('./pages/admin/AdminSprintsPage'));
const AdminDefectsPage = lazy(() => import('./pages/admin/AdminDefectsPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
// Showcase du design system : disponible uniquement en développement
const ComponentsPage = import.meta.env.DEV ? lazy(() => import('./pages/ComponentsPage')) : null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Une seule tentative, uniquement pour les erreurs récupérables (réseau / 5xx / 429)
      retry: (failureCount, error) => failureCount < 1 && isRetryableApiError(error),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

function HomeOrDashboard() {
  const { user } = useAuth();
  if (user) return <DashboardPage />;
  return <HomePage />;
}

/** Squelette affiché pendant le chargement d'une route découpée (code splitting). */
function RouteFallback() {
  return (
    <PageLayout>
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Suspense fallback={<RouteFallback />}><RegisterPage /></Suspense>} />
          <Route path="/forgot-password" element={<Suspense fallback={<RouteFallback />}><ForgotPasswordPage /></Suspense>} />
          <Route path="/reset-password/:uidb64/:token/" element={<Suspense fallback={<RouteFallback />}><ResetPasswordPage /></Suspense>} />
          <Route path="/" element={<HomeOrDashboard />} />
          <Route path="/convert" element={<Suspense fallback={<RouteFallback />}><ConvertPage /></Suspense>} />
          <Route path="/preview/:id" element={<Suspense fallback={<RouteFallback />}><PreviewPage /></Suspense>} />
          {ComponentsPage && (
            <Route path="/components" element={<Suspense fallback={null}><ComponentsPage /></Suspense>} />
          )}
          <Route path="/recipes" element={<Suspense fallback={<RouteFallback />}><RecipesPage /></Suspense>} />
          <Route path="/suites" element={<Suspense fallback={<RouteFallback />}><TestSuitesPage /></Suspense>} />
          <Route path="/recherche" element={<Suspense fallback={<RouteFallback />}><SearchPage /></Suspense>} />
          <Route path="/invitation/:token" element={<Suspense fallback={<RouteFallback />}><InvitationPage /></Suspense>} />

          {/* Protected routes (require auth) */}
          <Route path="/teams/:slug" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><TeamDashboardPage /></Suspense></ProtectedRoute>} />
          <Route path="/teams/:slug/activity" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><ActivityPage /></Suspense></ProtectedRoute>} />
          <Route path="/teams/:slug/projects/:projectSlug/activity" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><ActivityPage /></Suspense></ProtectedRoute>} />
          <Route path="/teams/:slug/projects" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><ProjectsPage /></Suspense></ProtectedRoute>} />
          <Route path="/teams/:slug/projects/new" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><CreateProjectPage /></Suspense></ProtectedRoute>} />
          <Route path="/teams/:slug/projects/:projectSlug" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><ProjectDetailPage /></Suspense></ProtectedRoute>} />
          <Route path="/teams/:slug/projects/:projectSlug/sprints/:sprintId" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><SprintBoardPage /></Suspense></ProtectedRoute>} />
          <Route path="/teams/:slug/projects/:projectSlug/sprint-board" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><SprintBoardPage /></Suspense></ProtectedRoute>} />
          <Route path="/teams/:slug/projects/:projectSlug/defects" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><DefectTrackerPage /></Suspense></ProtectedRoute>} />
          <Route path="/teams/:slug/projects/:projectSlug/member-progress" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><MemberProgressPage /></Suspense></ProtectedRoute>} />
          <Route path="/teams/:slug/weekly-reports" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><WeeklyReportPage /></Suspense></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/teams/new" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><TeamCreatePage /></Suspense></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><SettingsPage /></Suspense></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><NotificationsPage /></Suspense></ProtectedRoute>} />

          {/* Super-Admin (réservé aux superusers) */}
          <Route path="/admin" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminDashboardPage /></Suspense></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminUsersPage /></Suspense></AdminRoute>} />
          <Route path="/admin/teams" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminTeamsPage /></Suspense></AdminRoute>} />
          <Route path="/admin/projects" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminProjectsPage /></Suspense></AdminRoute>} />
          <Route path="/admin/jobs" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminJobsPage /></Suspense></AdminRoute>} />
          <Route path="/admin/activity" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminActivityPage /></Suspense></AdminRoute>} />
          <Route path="/admin/system" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminSystemPage /></Suspense></AdminRoute>} />
          <Route path="/admin/use-cases" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminUseCasesPage /></Suspense></AdminRoute>} />
          <Route path="/admin/sprints" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminSprintsPage /></Suspense></AdminRoute>} />
          <Route path="/admin/defects" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminDefectsPage /></Suspense></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminReportsPage /></Suspense></AdminRoute>} />

          <Route path="*" element={
            <PageLayout>
              <EmptyState
                title="404 — Page non trouvée"
                description="La page demandée n'existe pas ou a été déplacée."
                action={
                  <Link
                    to="/"
                    className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-4 py-2.5 text-label-sm font-medium text-on-primary transition-all hover:brightness-110"
                  >
                    Retour au tableau de bord
                  </Link>
                }
              />
            </PageLayout>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <SidebarProvider>
                <AppRoutes />
              </SidebarProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
