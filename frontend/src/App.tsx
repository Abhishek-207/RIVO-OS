import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { LayoutProvider } from '@/contexts/LayoutContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { SetPasswordPage } from '@/pages/SetPasswordPage'
import { UsersPage } from '@/pages/UsersPage'
import { ChannelsPage } from '@/pages/ChannelsPage'
import { LeadsPage } from '@/pages/LeadsPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { CasesPage } from '@/pages/CasesPage'
import { TemplatesSettingsPage } from '@/pages/SettingsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AuditLogPage } from '@/pages/AuditLogPage'
import './index.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Generic placeholder page for modules
function ModulePage() {
  const location = useLocation()
  const pageName = location.pathname.split('/').filter(Boolean).map(
    s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
  ).join(' > ')

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{pageName || 'Module'}</h1>
        <p className="text-gray-500">This module is under construction</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth()

  // Get default route based on role
  const getDefaultRoute = () => {
    if (!user) return '/login'
    return '/dashboard'
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <LoginPage />
        }
      />
      <Route path="/set-password" element={<SetPasswordPage />} />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <LayoutProvider>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

                  {/* Workspace */}
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/leads" element={<LeadsPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/cases" element={<CasesPage />} />

                  {/* Admin workspace routes */}
                  <Route path="/channels" element={<ChannelsPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/audit-log" element={<AuditLogPage />} />

                  {/* Toolbox */}
                  <Route path="/whatsapp" element={<ModulePage />} />
                  <Route path="/bank-products" element={<ModulePage />} />
                  <Route path="/templates" element={<TemplatesSettingsPage />} />
                  <Route path="/settings/*" element={<ModulePage />} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
                </Routes>
              </AppLayout>
            </LayoutProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
