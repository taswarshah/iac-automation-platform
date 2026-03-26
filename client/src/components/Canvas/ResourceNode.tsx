import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Server, HardDrive, Network, Shield, Database, Zap, Key, GitBranch, Package, FileJson, Lock, Globe, Folder, Trash2 } from 'lucide-react'
import { getResourceByType } from '@/utils/resources'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Server,
  HardDrive,
  Network,
  Shield,
  Database,
  Zap,
  Key,
  GitBranch,
  Package,
  FileJson,
  Lock,
  Globe,
  Folder,
}

function ResourceNode({ data, selected }: NodeProps) {
  const resource = getResourceByType(data.type as string)
  const Icon = iconMap[resource?.icon || 'Server']
  const isResourceGroup = data.type === 'azurerm_resource_group'
  const isSubscription = data.type === 'azurerm_subscription'

  const providerConfig: Record<string, { border: string; bg: string; icon: string; gradient: string }> = {
    aws: { 
      border: 'border-l-amber-500', 
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50', 
      icon: 'text-amber-600',
      gradient: 'from-amber-500 to-orange-500'
    },
    azure: { 
      border: 'border-l-blue-500', 
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50', 
      icon: 'text-blue-600',
      gradient: 'from-blue-500 to-indigo-600'
    },
    kubernetes: { 
      border: 'border-l-cyan-500', 
      bg: 'bg-gradient-to-br from-cyan-50 to-sky-50', 
      icon: 'text-cyan-600',
      gradient: 'from-cyan-500 to-sky-500'
    },
  }

  const provider = resource?.provider || 'aws'
  const config = providerConfig[provider] || providerConfig.aws
  const inputCount = Object.keys(data.inputs as Record<string, unknown> || {}).length

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { nodeId: data.id } }))
  }

  return (
    <div
      className={`
        px-4 py-3 rounded-xl bg-white border-2 shadow-lg min-w-[200px]
        transition-all duration-300 group
        ${selected 
          ? 'border-primary shadow-glow ring-4 ring-primary/20 transform scale-105' 
          : isResourceGroup
            ? 'border-blue-300 shadow-blue-100 hover:shadow-blue-200 hover:border-blue-400 cursor-pointer'
            : 'border-slate-200/50 hover:shadow-xl hover:border-slate-300'
        }
        ${config.border} border-l-4
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={`!w-3.5 !h-3.5 !bg-gradient-to-r !from-primary !to-accent-purple !border-2 !border-white shadow-lg ${isResourceGroup ? '!bg-blue-500' : ''}`}
      />
      
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${isResourceGroup ? 'bg-gradient-to-br from-blue-100 to-indigo-100' : config.bg} flex items-center justify-center shadow-inner`}>
          <Icon className={`w-5 h-5 ${isResourceGroup ? 'text-blue-600' : config.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 truncate flex items-center gap-2">
            {data.label as string}
            {(isResourceGroup || isSubscription) && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                Double-click to enter
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 truncate flex items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded-md bg-gradient-to-r ${isResourceGroup ? 'from-blue-500 to-indigo-500' : config.gradient} text-white text-[10px] font-medium`}>
              {isResourceGroup ? 'RG' : isSubscription ? 'SUB' : provider.toUpperCase()}
            </span>
          </div>
        </div>
        
        {/* Delete Button */}
        {(selected || isResourceGroup) && (
          <button
            onClick={handleDelete}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
            title="Delete resource"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      {inputCount > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            {inputCount} configured
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className={`!w-3.5 !h-3.5 !bg-gradient-to-r !from-primary !to-accent-purple !border-2 !border-white shadow-lg ${isResourceGroup ? '!bg-blue-500' : ''}`}
      />
    </div>
  )
}

export default memo(ResourceNode)
