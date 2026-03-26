import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { LayoutDashboard, PenTool, LayoutTemplate, Settings, LogOut, User, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import api from '@/utils/api'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Designer', href: '/designer', icon: PenTool },
  { name: 'Templates', href: '/templates', icon: LayoutTemplate },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function MainLayout() {
  const location = useLocation()
  const { user, logout, setProjects } = useAppStore()

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const orgId = user?.organizationId || '2a822169-b6d9-4f09-a691-31a87728dca0'
        const projects = await api.getProjects(orgId)
        if (projects && Array.isArray(projects)) {
          const mappedProjects = projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            iaType: p.ia_type,
            nodes: p.resources || [],
            edges: p.connections || [],
            createdAt: p.created_at,
            updatedAt: p.updated_at
          }))
          setProjects(mappedProjects)
        }
      } catch (error) {
        console.error('Failed to load projects:', error)
      }
    }
    loadProjects()
  }, [user?.organizationId, setProjects])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="glass sticky top-0 z-50 border-b border-slate-200/50">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-10">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent-purple rounded-xl flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
                <PenTool className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-900">IaC Platform</span>
            </Link>
            <nav className="flex gap-1">
              {navigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-emerald/10 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-accent-emerald" />
              <span className="text-xs font-medium text-accent-emerald">Free Plan</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent-purple rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">{user?.name || 'User'}</span>
            </div>
            <button
              onClick={logout}
              className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="h-[calc(100vh-64px)]">
        <Outlet />
      </main>
    </div>
  )
}
