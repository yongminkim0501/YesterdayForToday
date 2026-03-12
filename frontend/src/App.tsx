import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import PublicLayout from './components/common/PublicLayout';
import Loading from './components/common/Loading';
import LandingPage from './pages/landing/LandingPage';
import UnsubscribePage from './pages/unsubscribe/UnsubscribePage';
import VerifyEmailPage from './pages/verify/VerifyEmailPage';
import PrivacyPage from './pages/privacy/PrivacyPage';
import NotFoundPage from './pages/NotFoundPage';
import './styles/global.css';

// Lazy-loaded admin pages
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminPostsPage = lazy(() => import('./pages/admin/AdminPostsPage'));
const AdminNewslettersPage = lazy(() => import('./pages/admin/AdminNewslettersPage'));
const AdminNewsletterEditorPage = lazy(() => import('./pages/admin/AdminNewsletterEditorPage'));
const AdminSubscribersPage = lazy(() => import('./pages/admin/AdminSubscribersPage'));
const ProtectedRoute = lazy(() => import('./components/admin/ProtectedRoute'));

const App: React.FC = () => {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/verify" element={<VerifyEmailPage />} />
              <Route path="/unsubscribe" element={<UnsubscribePage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
            </Route>

            {/* Admin Login (no layout) */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="posts" element={<AdminPostsPage />} />
              <Route path="newsletters" element={<AdminNewslettersPage />} />
              <Route path="newsletters/new" element={<AdminNewsletterEditorPage />} />
              <Route path="newsletters/:id/edit" element={<AdminNewsletterEditorPage />} />
              <Route path="subscribers" element={<AdminSubscribersPage />} />
            </Route>

            {/* 404 Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
