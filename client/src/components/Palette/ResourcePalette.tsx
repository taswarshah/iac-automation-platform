import { useState } from 'react'
import { Search, HardDrive, Shield, Database, GitBranch, Folder, LucideIcon, Zap, Cloud, Cpu, Router, Box, ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { awsResources, azureResources, k8sResources } from '@/utils/resources'

interface ResourceItemProps {
  name: string
  type: string
  description: string
  provider: string
}

const providerConfig: Record<string, { icon: LucideIcon; gradient: string; color: string; label: string }> = {
  aws: { icon: Cloud, gradient: 'from-amber-500 to-orange-500', color: 'text-amber-600', label: 'AWS' },
  azure: { icon: Zap, gradient: 'from-blue-500 to-indigo-500', color: 'text-blue-600', label: 'Azure' },
  kubernetes: { icon: GitBranch, gradient: 'from-cyan-500 to-sky-500', color: 'text-cyan-600', label: 'K8s' },
}

function ResourceItem({ name, type, description, provider }: ResourceItemProps) {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const config = providerConfig[provider] || providerConfig.aws
  const Icon = config.icon

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      className="p-3 bg-white border border-slate-200/50 rounded-xl cursor-grab hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 active:cursor-grabbing group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{name}</div>
          <div className="text-xs text-slate-500 truncate">{description}</div>
        </div>
      </div>
    </div>
  )
}

interface CategorySectionProps {
  title: string
  icon: LucideIcon
  count: number
  children: React.ReactNode
  defaultOpen?: boolean
}

function CategorySection({ title, icon: Icon, count, children, defaultOpen = true }: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full mb-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex-1 text-left">{title}</span>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
      </button>
      {isOpen && <div className="space-y-2 pl-2">{children}</div>}
    </div>
  )
}

export default function ResourcePalette() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'aws' | 'azure' | 'kubernetes'>('aws')

  const resources = activeTab === 'aws' ? awsResources : activeTab === 'azure' ? azureResources : k8sResources

  const filteredResources = resources.filter(
    (r) =>
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
  )

  const categories = [...new Set(filteredResources.map((r) => r.category))]

  const categoryConfig: Record<string, { icon: LucideIcon; label: string }> = {
    compute: { icon: Cpu, label: 'Compute' },
    storage: { icon: HardDrive, label: 'Storage' },
    network: { icon: Router, label: 'Network' },
    security: { icon: Shield, label: 'Security' },
    database: { icon: Database, label: 'Database' },
    kubernetes: { icon: Box, label: 'Kubernetes' },
  }

  const popularResources = ['aws_ec2_instance', 'aws_s3_bucket', 'aws_vpc', 'azurerm_virtual_machine', 'kubernetes_deployment', 'kubernetes_service']

  const tabs = [
    { id: 'aws' as const, label: 'AWS', icon: Cloud, gradient: 'from-amber-500 to-orange-500' },
    { id: 'azure' as const, label: 'Azure', icon: Zap, gradient: 'from-blue-500 to-indigo-500' },
    { id: 'kubernetes' as const, label: 'K8s', icon: Box, gradient: 'from-cyan-500 to-sky-500' },
  ]

  const getProviderLabel = () => {
    switch(activeTab) {
      case 'aws': return 'Amazon Web Services'
      case 'azure': return 'Microsoft Azure'
      case 'kubernetes': return 'Kubernetes'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/50">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          {getProviderLabel()}
        </div>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              {activeTab === tab.id && (
                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${tab.gradient}`} />
              )}
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Quick Access - Popular */}
        {search === '' && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Popular</span>
            </div>
            <div className="space-y-2">
              {popularResources
                .map((type) => filteredResources.find((r) => r.type === type))
                .filter(Boolean)
                .slice(0, 4)
                .map((resource) => resource && (
                  <ResourceItem
                    key={resource.type}
                    name={resource.label}
                    type={resource.type}
                    description={resource.description}
                    provider={resource.provider}
                  />
                ))}
            </div>
          </div>
        )}

        {/* All Resources by Category */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-2">
            <Folder className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All Resources</span>
            <span className="text-xs text-slate-400">({filteredResources.length})</span>
          </div>

          {search ? (
            // Show all filtered resources in a grid when searching
            <div className="grid grid-cols-1 gap-2">
              {filteredResources.map((resource) => (
                <ResourceItem
                  key={resource.type}
                  name={resource.label}
                  type={resource.type}
                  description={resource.description}
                  provider={resource.provider}
                />
              ))}
            </div>
          ) : (
            // Show by category
            categories.map((category) => {
              const config = categoryConfig[category] || { icon: Folder, label: category }
              const CategoryIcon = config.icon
              const categoryResources = filteredResources.filter((r) => r.category === category)

              if (categoryResources.length === 0) return null

              return (
                <CategorySection
                  key={category}
                  title={config.label}
                  icon={CategoryIcon}
                  count={categoryResources.length}
                >
                  {categoryResources.map((resource) => (
                    <ResourceItem
                      key={resource.type}
                      name={resource.label}
                      type={resource.type}
                      description={resource.description}
                      provider={resource.provider}
                    />
                  ))}
                </CategorySection>
              )
            })
          )}
        </div>

        {filteredResources.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">No resources found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200/50 bg-slate-50">
        <p className="text-xs text-slate-500 text-center">
          Drag resources to the canvas to add them
        </p>
      </div>
    </div>
  )
}
