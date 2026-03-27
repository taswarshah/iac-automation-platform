import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAppStore } from './stores'
import MainLayout from './components/common/MainLayout'
import Dashboard from './pages/Dashboard'
import Designer from './pages/Designer'
import Templates from './pages/Templates'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Register from './pages/Register'
import api from './utils/api'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function App() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      // Validate session on load
      api.getProjects().catch(() => {
        // Interceptor will handle logout if 401
      })
    }
  }, [isAuthenticated])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="designer/:projectId?" element={<Designer />} />
            <Route path="templates" element={<Templates />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1E293B',
              color: '#fff',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
