import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, Server, Trash2, GitBranch, Layers, Zap, Clock, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/stores'
import type { IaCType } from '@/types'
import api from '@/utils/api'

const iacTypeConfig = {
  terraform: { icon: Server, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-100', textColor: 'text-purple-600', label: 'Terraform' },
  azure: { icon: Zap, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-100', textColor: 'text-blue-600', label: 'Azure' },
  kubernetes: { icon: GitBranch, color: 'from-cyan-500 to-cyan-600', bgColor: 'bg-cyan-100', textColor: 'text-cyan-600', label: 'Kubernetes' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, projects, addProject, deleteProject } = useAppStore()
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectType, setNewProjectType] = useState<IaCType>('terraform')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    setIsCreating(true)
    try {
      const organizationId = user?.organizationId || '2a822169-b6d9-4f09-a691-31a87728dca0'
      const createdBy = user?.id || '1e419184-74ed-46ff-a656-3b3c7226e6cc'
      
      const newProject = await api.createProject({
        name: newProjectName,
        organization_id: organizationId,
        ia_type: newProjectType,
        created_by: createdBy
      })

      if (newProject.id) {
        addProject(newProject)
        setShowNewProject(false)
        setNewProjectName('')
        navigate(`/designer/${newProject.id}`)
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('Failed to create project. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await api.deleteProject(id)
        deleteProject(id)
      } catch (error) {
        console.error('Failed to delete project:', error)
        alert('Failed to delete project. Please try again.')
      }
    }
  }

  const stats = [
    { label: 'Total Projects', value: projects.length, icon: Layers, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Terraform', value: projects.filter(p => p.iaType === 'terraform').length, icon: Server, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Kubernetes', value: projects.filter(p => p.iaType === 'kubernetes').length, icon: GitBranch, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  ]

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
            <p className="text-slate-500 mt-1">Manage your infrastructure designs</p>
          </div>
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-accent-purple text-white rounded-xl font-medium hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="card-elevated p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* New Project Modal */}
        {showNewProject && (
          <div className="modal-backdrop" onClick={() => setShowNewProject(false)}>
            <div className="modal-content w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="glass rounded-2xl p-6 border border-slate-200/50">
                <h3 className="text-xl font-semibold text-slate-900 mb-6">Create New Project</h3>
                <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Project Name
                      </label>
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                        placeholder="My Infrastructure"
                        className="input-field"
                        autoFocus
                      />
                    </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      IaC Type
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['terraform', 'azure', 'kubernetes'] as IaCType[]).map((type) => {
                        const config = iacTypeConfig[type]
                        const Icon = config.icon
                        return (
                          <button
                            key={type}
                            onClick={() => setNewProjectType(type)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                              newProjectType === type
                                ? 'border-primary bg-primary/5 shadow-glow'
                                : 'border-slate-200 hover:border-slate-300 hover:shadow-card'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">{config.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCreateProject}
                      disabled={isCreating || !newProjectName.trim()}
                      className="btn-primary flex-1 disabled:opacity-50"
                    >
                      {isCreating ? 'Creating...' : 'Create Project'}
                    </button>
                    <button
                      onClick={() => setShowNewProject(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <FolderOpen className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No projects yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">Create your first infrastructure project and start building your cloud architecture visually.</p>
            <button
              onClick={() => setShowNewProject(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-accent-purple text-white rounded-xl font-medium hover:shadow-glow transition-all"
            >
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const config = iacTypeConfig[project.iaType as IaCType] || iacTypeConfig.terraform
              const Icon = config.icon
              return (
                <Link
                  key={project.id}
                  to={`/designer/${project.id}`}
                  className="card-elevated p-5 group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-slate-500">{config.label}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Layers className="w-4 h-4" />
                        {project.nodes.length} resources
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
