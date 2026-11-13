import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ROLES } from './lib/constants';
import PublicLayout from './components/layout/PublicLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import GuestRoute from './routes/GuestRoute';
import LandingPage from './pages/public/LandingPage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import PrivacyPolicyPage from './pages/public/PrivacyPolicyPage';
import TermsPage from './pages/public/TermsPage';
import CitizenSignUpPage from './pages/auth/CitizenSignUpPage';
import CitizenSignInPage from './pages/auth/CitizenSignInPage';
import RepresentativeSignInPage from './pages/auth/RepresentativeSignInPage';
import DepartmentSignInPage from './pages/auth/DepartmentSignInPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import CitizenProfilePage from './pages/citizen/CitizenProfilePage';
import RepresentativeDashboard from './pages/representative/RepresentativeDashboard';
import RepresentativeProfilePage from './pages/representative/RepresentativeProfilePage';
import DepartmentDashboard from './pages/department/DepartmentDashboard';
import DepartmentProfilePage from './pages/department/DepartmentProfilePage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            <Route element={<GuestRoute />}>
              <Route path="/citizen/sign-up" element={<CitizenSignUpPage />} />
              <Route path="/citizen/sign-in" element={<CitizenSignInPage />} />
              <Route path="/representative/sign-in" element={<RepresentativeSignInPage />} />
              <Route path="/department/sign-in" element={<DepartmentSignInPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Citizen Protected Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.CITIZEN]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
            <Route path="/citizen/profile" element={<CitizenProfilePage />} />
            <Route path="/citizen/settings" element={<Navigate to="/citizen/profile" replace />} />
          </Route>

          {/* Representative Protected Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.REPRESENTATIVE]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/representative/dashboard" element={<RepresentativeDashboard />} />
            <Route path="/representative/profile" element={<RepresentativeProfilePage />} />
            <Route path="/representative/settings" element={<Navigate to="/representative/profile" replace />} />
          </Route>

          {/* Department Official Protected Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.DEPARTMENT]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/department/dashboard" element={<DepartmentDashboard />} />
            <Route path="/department/profile" element={<DepartmentProfilePage />} />
            <Route path="/department/settings" element={<Navigate to="/department/profile" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
