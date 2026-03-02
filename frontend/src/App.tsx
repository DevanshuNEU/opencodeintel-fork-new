import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './components/providers/ThemeProvider';
import { TooltipProvider } from './components/ui/tooltip';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './components/Dashboard';
import { DocsHomePage } from './pages/DocsHomePage';
import { MCPSetupPage } from './pages/MCPSetupPage';
import { MCPToolsPage } from './pages/MCPToolsPage';
import { MCPExamplesPage } from './pages/MCPExamplesPage';
import { QuickStartPage } from './pages/QuickStartPage';
import { SemanticSearchPage, DependencyAnalysisPage, ImpactPredictionPage, CodeStyleAnalysisPage } from './pages/features';
import { DockerSetupPage, SelfHostingPage } from './pages/deployment';
import { APIOverviewPage, APIRepositoriesPage, APISearchPage, APIAnalysisPage } from './pages/api';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { ContributingPage } from './pages/ContributingPage';
import { GitHubCallbackPage } from './pages/GitHubCallbackPage';
import { AdminPage } from './pages/AdminPage';
import { ScrollToTop } from './components/ScrollToTop';
import { ErrorBoundary } from './components/ErrorBoundary';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function LandingWrapper() {
  const { user } = useAuth();

  // If user is logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* New Landing Page */}
      <Route path="/" element={<LandingWrapper />} />
      
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
      />
      <Route 
        path="/signup" 
        element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />} 
      />
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Documentation Routes - Public, no auth required */}
      <Route path="/docs" element={<DocsHomePage />} />
      <Route path="/docs/quickstart" element={<QuickStartPage />} />
      <Route path="/docs/mcp-setup" element={<MCPSetupPage />} />
      <Route path="/docs/mcp-tools" element={<MCPToolsPage />} />
      <Route path="/docs/mcp-examples" element={<MCPExamplesPage />} />
      
      {/* Feature pages */}
      <Route path="/docs/features/search" element={<SemanticSearchPage />} />
      <Route path="/docs/features/dependencies" element={<DependencyAnalysisPage />} />
      <Route path="/docs/features/impact" element={<ImpactPredictionPage />} />
      <Route path="/docs/features/style" element={<CodeStyleAnalysisPage />} />
      
      {/* Deployment pages */}
      <Route path="/docs/deployment/docker" element={<DockerSetupPage />} />
      <Route path="/docs/deployment/self-host" element={<SelfHostingPage />} />
      
      {/* API Reference pages */}
      <Route path="/docs/api" element={<APIOverviewPage />} />
      <Route path="/docs/api/repositories" element={<APIRepositoriesPage />} />
      <Route path="/docs/api/search" element={<APISearchPage />} />
      <Route path="/docs/api/analysis" element={<APIAnalysisPage />} />
      
      {/* Contributing pages */}
      <Route path="/docs/architecture" element={<ArchitecturePage />} />
      <Route path="/docs/contributing" element={<ContributingPage />} />
      <Route
        path="/github/callback"
        element={
          <ProtectedRoute>
            <GitHubCallbackPage />
          </ProtectedRoute>
        }
      />
      
      
      {/* Admin -- standalone route, no dashboard layout */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-background p-8 max-w-6xl mx-auto">
              <AdminPage />
            </div>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <TooltipProvider>
        <BrowserRouter>
          <ScrollToTop />
          <ErrorBoundary>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
}
