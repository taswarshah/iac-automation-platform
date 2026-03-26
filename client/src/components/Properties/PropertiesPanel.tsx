import { useEffect, useState } from 'react'
import { Trash2, Folder } from 'lucide-react'
import type { Node } from '@xyflow/react'
import { getResourceByType } from '@/utils/resources'
import { useDesignerStore } from '@/stores'

interface PropertiesPanelProps {
  selectedNode: Node | undefined
  allNodes: Node[]
  onUpdateNode: (id: string, data: Record<string, unknown>) => void
  onDeleteNode?: (id: string) => void
}

export default function PropertiesPanel({ selectedNode, allNodes, onUpdateNode, onDeleteNode }: PropertiesPanelProps) {
  const { setSelectedNodeId, deleteNode } = useDesignerStore()
  const [localInputs, setLocalInputs] = useState<Record<string, unknown>>({})

  const resource = selectedNode ? getResourceByType(selectedNode.data.type as string) : null

  const parentResourceGroup = selectedNode?.data?.resourceGroupId 
    ? allNodes.find(n => n.id === selectedNode.data.resourceGroupId && n.data?.type === 'azurerm_resource_group')
    : null

  useEffect(() => {
    if (selectedNode?.data?.inputs) {
      setLocalInputs(selectedNode.data.inputs as Record<string, unknown>)
    } else {
      setLocalInputs({})
    }
  }, [selectedNode])

  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
        </div>
        <h3 className="font-medium text-gray-900 mb-1">No resource selected</h3>
        <p className="text-sm text-gray-500">
          Click on a resource in the canvas to view and edit its properties
        </p>
      </div>
    )
  }

  const handleInputChange = (name: string, value: unknown) => {
    const newInputs = { ...localInputs, [name]: value }
    setLocalInputs(newInputs)
    onUpdateNode(selectedNode.id, { inputs: newInputs })
  }

  const handleLabelChange = (label: string) => {
    onUpdateNode(selectedNode.id, { label })
  }

  const handleDelete = () => {
    if (onDeleteNode && selectedNode) {
      onDeleteNode(selectedNode.id)
    } else if (selectedNode) {
      deleteNode(selectedNode.id)
      setSelectedNodeId(null)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div>
          <h3 className="font-medium text-gray-900"> Properties</h3>
          <p className="text-xs text-gray-500">{resource?.type}</p>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {parentResourceGroup && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Folder className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Resource Group</span>
            </div>
            <div className="space-y-1 text-xs text-blue-700">
              <div className="flex justify-between">
                <span>Name:</span>
                <span className="font-medium">{String(parentResourceGroup.data?.label || 'Unknown')}</span>
              </div>
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="font-medium">{String((parentResourceGroup.data?.inputs as Record<string, unknown>)?.location || 'eastus')}</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resource Name
          </label>
          <input
            type="text"
            value={(selectedNode.data.label as string) || ''}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        {resource?.inputs.map((input) => (
          <div key={input.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {input.label}
              {input.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {input.type === 'string' && (
              (input.name === 'resource_group' || input.name === 'resource_group_name') ? (
                <select
                  value={(localInputs[input.name] as string) || ''}
                  onChange={(e) => handleInputChange(input.name, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">Select Resource Group</option>
                  {allNodes
                    .filter(n => n.data?.type === 'azurerm_resource_group')
                    .map(rg => {
                      const rgName = String((rg.data?.inputs as Record<string, unknown>)?.name || rg.data?.label || '')
                      return (
                        <option key={rg.id} value={rgName}>
                          {rgName || 'Unknown'}
                        </option>
                      )
                    })}
                </select>
              ) : (
                <input
                  type="text"
                  value={(localInputs[input.name] as string) || ''}
                  onChange={(e) => handleInputChange(input.name, e.target.value)}
                  placeholder={input.default as string}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              )
            )}

            {input.type === 'number' && (
              <input
                type="number"
                value={(localInputs[input.name] as number) ?? input.default ?? 0}
                onChange={(e) => handleInputChange(input.name, Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            )}

            {input.type === 'boolean' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(localInputs[input.name] as boolean) ?? input.default ?? false}
                  onChange={(e) => handleInputChange(input.name, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-gray-600">
                  {input.default ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            )}

            {input.type === 'select' && (
              <select
                value={(localInputs[input.name] as string) || (input.default as string) || ''}
                onChange={(e) => handleInputChange(input.name, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {input.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {input.type === 'array' && (
              <textarea
                value={
                  Array.isArray(localInputs[input.name])
                    ? JSON.stringify(localInputs[input.name], null, 2)
                    : JSON.stringify(input.default || [], null, 2)
                }
                onChange={(e) => {
                  try {
                    handleInputChange(input.name, JSON.parse(e.target.value))
                  } catch {
                    // Allow invalid JSON while typing
                  }
                }}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono text-sm"
              />
            )}

            {input.description && (
              <p className="mt-1 text-xs text-gray-500">{input.description}</p>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500">
          Provider: <span className="font-medium capitalize">{resource?.provider}</span>
        </div>
        <div className="text-xs text-gray-500">
          Category: <span className="font-medium capitalize">{resource?.category}</span>
        </div>
      </div>
    </div>
  )
}
