import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useParams } from 'react-router-dom'
import { useAppStore, useDesignerStore } from '@/stores'
import { getResourceByType } from '@/utils/resources'
import ResourceNode from '@/components/Canvas/ResourceNode'
import ResourcePalette from '@/components/Palette/ResourcePalette'
import PropertiesPanel from '@/components/Properties/PropertiesPanel'
import CodePreview from '@/components/Canvas/CodePreview'
import { generateTerraform, generateKubernetes } from '@/utils/codeGenerator'
import api from '@/utils/api'
import { Save, Code, PanelLeftClose, PanelRightClose, Layers, Zap, GitBranch, Check, AlertTriangle, Rocket, Loader2, ChevronRight, Folder, ArrowLeft, Trash2 } from 'lucide-react'

const nodeTypes: NodeTypes = {
  resource: ResourceNode,
}

const iacTypeIcons = {
  terraform: Zap,
  azure: Zap,
  kubernetes: GitBranch,
}

export default function Designer() {
  const { projectId } = useParams()
  const { projects, updateProject, currentProject, setCurrentProject, addProject } = useAppStore()
  const designerStore = useDesignerStore()
  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [showCodePreview, setShowCodePreview] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [validationResults, setValidationResults] = useState<{ errors: string[]; warnings: string[] }>({
    errors: [],
    warnings: [],
  })

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [credentials, setCredentials] = useState<any[]>([])
  const [selectedCredential, setSelectedCredential] = useState('')
  const [provisioning, setProvisioning] = useState(false)
  const [showProvisionModal, setShowProvisionModal] = useState(false)

  const { currentScope, scopePath, enterResourceGroup, exitResourceGroup, goToScope, resetScope } = designerStore

  // ReactFlow change handlers
  const onNodesChangeHandler = useCallback((changes: any) => {
    // Handle position changes, selection changes, etc.
    setNodes((nds) => {
      return nds.map(node => {
        const positionChange = changes.find((c: any) => c.type === 'position' && c.id === node.id)
        if (positionChange?.position) {
          return { ...node, position: positionChange.position }
        }
        const selectChange = changes.find((c: any) => c.type === 'select' && c.id === node.id)
        if (selectChange !== undefined) {
          return { ...node, selected: selectChange.selected }
        }
        return node
      })
    })
  }, [setNodes])

  // Placeholder handlers for ReactFlow
  const onEdgesChangeHandler = useCallback(() => {}, [])
  const onConnectHandler = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', animated: true }, eds))
  }, [setEdges])

  // Show nodes based on current scope
  const visibleNodes = currentScope.type === 'subscription' 
    ? nodes.filter(n => n.data?.type === 'azurerm_resource_group' || n.data?.type === 'azurerm_subscription')
    : nodes.filter(n => n.data?.resourceGroupId === currentScope.id)
  
  // Filter edges based on visible nodes
  const visibleEdges = edges.filter(e => 
    visibleNodes.some(n => n.id === e.source) && 
    visibleNodes.some(n => n.id === e.target)
  )

  // Debug: log nodes count
  console.log('nodes:', nodes.length, 'visibleNodes:', visibleNodes.length, 'scope:', currentScope.type, currentScope.name)

  useEffect(() => {
    loadCredentials()
    resetScope() // Reset scope when entering designer
  }, [])

  // Handle node deletion from ResourceNode component
  useEffect(() => {
    const handleDeleteNode = (e: CustomEvent) => {
      const nodeId = e.detail.nodeId
      if (nodeId) {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId))
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
      }
    }
    window.addEventListener('deleteNode', handleDeleteNode as EventListener)
    return () => window.removeEventListener('deleteNode', handleDeleteNode as EventListener)
  }, [setNodes, setEdges])

  const loadCredentials = async () => {
    try {
      const creds = await api.getCredentials()
      setCredentials(creds || [])
      if (creds && creds.length > 0) {
        setSelectedCredential(creds[0].id)
      }
    } catch (error) {
      console.error('Failed to load credentials:', error)
    }
  }

  useEffect(() => {
    if (projectId) {
      const project = projects.find((p) => p.id === projectId)
      if (project) {
        setCurrentProject(project)
        setNodes(project.nodes as Node[])
        setEdges(project.edges as Edge[])
      } else {
        api.getProject(projectId).then((projectData: any) => {
          if (projectData && projectData.id) {
            const mappedProject = {
              id: projectData.id,
              name: projectData.name,
              description: projectData.description,
              iaType: projectData.ia_type,
              nodes: projectData.resources || [],
              edges: projectData.connections || [],
              createdAt: projectData.created_at,
              updatedAt: projectData.updated_at
            }
            setCurrentProject(mappedProject)
            setNodes((mappedProject.nodes as Node[]) || [])
            setEdges((mappedProject.edges as Edge[]) || [])
            addProject(mappedProject)
          }
        }).catch(err => console.error('Failed to load project:', err))
      }
    }
  }, [projectId, projects, setCurrentProject, setNodes, setEdges, addProject])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    useDesignerStore.getState().setSelectedNodeId(node.id)
  }, [])

  const onNodeDragStop = useCallback(() => {
    setSaveStatus('unsaved')
    if (currentProject) {
      updateProject(currentProject.id, { nodes, edges, updatedAt: new Date().toISOString() })
      setSaveStatus('saved')
    }
  }, [currentProject, nodes, edges, updateProject])

  const handleGenerateCode = useCallback(() => {
    if (!currentProject) return

    const code =
      currentProject.iaType === 'terraform'
        ? generateTerraform(nodes, edges)
        : generateKubernetes(nodes, edges)

    setGeneratedCode(code)
    setShowCodePreview(true)

    const errors: string[] = []
    const warnings: string[] = []

    nodes.forEach((node) => {
      if (!node.data.label) {
        warnings.push(`Node ${node.id} has no label`)
      }
    })

    if (visibleNodes.length === 0) {
      warnings.push('No resources in the design')
    }

    setValidationResults({ errors, warnings })
  }, [currentProject, nodes, edges])

  const handleSave = useCallback(async () => {
    if (!currentProject) return
    
    setSaveStatus('saving')
    try {
      await api.saveProject(currentProject.id, {
        resources: nodes,
        connections: edges,
        created_by: 'user'
      })
      updateProject(currentProject.id, { nodes, edges, updatedAt: new Date().toISOString() })
      setSaveStatus('saved')
    } catch (error) {
      console.error('Failed to save:', error)
      setSaveStatus('unsaved')
    }
  }, [currentProject, nodes, edges, updateProject])

  const handleProvision = useCallback(async () => {
    if (!currentProject || !selectedCredential || visibleNodes.length === 0) return
    
    setProvisioning(true)
    try {
      const credential = credentials.find(c => c.id === selectedCredential)
      const result = await api.provision({
        design_id: currentProject.id,
        organization_id: 'default-org',
        credential_id: selectedCredential,
        provider: credential?.provider || 'azure',
        resources: nodes,
        created_by: 'user'
      })
      alert(`Provisioning complete! Created ${result.resources?.length || 0} resources.`)
      setShowProvisionModal(false)
    } catch (error) {
      console.error('Failed to provision:', error)
      alert('Failed to provision resources')
    } finally {
      setProvisioning(false)
    }
  }, [currentProject, selectedCredential, nodes, credentials])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return

      const position = {
        x: event.clientX - 280,
        y: event.clientY - 80,
      }

      // Get default inputs from resource definition
      const resource = getResourceByType(type)
      const defaultInputs: Record<string, unknown> = {}
      if (resource?.inputs) {
        for (const input of resource.inputs) {
          if (input.default !== undefined) {
            defaultInputs[input.name] = input.default
          }
        }
      }

      const nodeData: Record<string, unknown> = { 
        type, 
        label: type.split('_').slice(1).join(' ').replace(/([A-Z])/g, ' $1').trim() || type, 
        inputs: defaultInputs
      }

      // If inside a resource group, associate the node with it
      if (currentScope.type === 'resource_group' && currentScope.id) {
        nodeData.resourceGroupId = currentScope.id
        nodeData.resourceGroupName = currentScope.name
      }

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'resource',
        position,
        data: nodeData,
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes, currentScope]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const IaCIcon = currentProject ? iacTypeIcons[currentProject.iaType as keyof typeof iacTypeIcons] || Zap : Zap

  const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    const nodeType = node.data?.type as string
    // Only enter Resource Group from subscription level, not from another RG
    if (nodeType === 'azurerm_resource_group' && currentScope.type === 'subscription') {
      const nodeName = (node.data?.label as string) || (node.data?.name as string) || 'Resource Group'
      enterResourceGroup(node.id, nodeName)
    }
  }, [enterResourceGroup, currentScope])

  const handleBackClick = useCallback(() => {
    exitResourceGroup()
  }, [exitResourceGroup])

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="h-14 glass border-b border-slate-200/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className={`p-2.5 rounded-xl transition-all duration-200 ${
              showLeftPanel ? 'bg-primary/10 text-primary shadow-sm' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
          
          {/* Scope Navigation Breadcrumb - Only show when inside a resource group */}
          {currentScope.type === 'resource_group' && (
            <>
              <button
                onClick={handleBackClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Exit</span>
              </button>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <Folder className="w-4 h-4 text-blue-600" />
                  <div className="flex items-center gap-1">
                    {scopePath.map((scope, index) => (
                      <span key={index} className="flex items-center">
                        {index > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                        <button
                          onClick={() => goToScope(index)}
                          className={`text-sm font-medium hover:text-primary transition-colors ${
                            index === scopePath.length - 1 ? 'text-blue-700' : 'text-slate-500'
                          }`}
                        >
                          {scope.name}
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent-purple rounded-xl flex items-center justify-center shadow-glow">
              <IaCIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                {currentProject?.name || 'New Project'}
              </h2>
              <p className="text-xs text-slate-500 capitalize flex items-center gap-1">
                {currentScope.type === 'subscription' ? (
                  <span className="flex items-center gap-1">
                    <Folder className="w-3 h-3" />
                    Subscription Level
                  </span>
                ) : (
                  <>
                    {currentProject?.iaType}
                  </>
                )}
                <span className="mx-1">•</span>
                {visibleNodes.length} resources
              </p>
            </div>
          </div>
        </div>
        
        {/* Status & Actions */}
        <div className="flex items-center gap-3">
          {/* Delete selected node */}
          {designerStore.selectedNodeId && (
            <button
              onClick={() => {
                const nodeId = designerStore.selectedNodeId
                if (nodeId) {
                  setNodes((nds) => nds.filter((n) => n.id !== nodeId))
                  setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
                  designerStore.setSelectedNodeId(null)
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            saveStatus === 'saved' ? 'bg-emerald-100 text-emerald-700' :
            saveStatus === 'saving' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {saveStatus === 'saved' && <><Check className="w-3.5 h-3.5" /> Saved</>}
            {saveStatus === 'saving' && <><div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /> Saving</>}
            {saveStatus === 'unsaved' && <><AlertTriangle className="w-3.5 h-3.5" /> Unsaved</>}
          </div>
          
          <button
            onClick={handleGenerateCode}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            <Code className="w-4 h-4" />
            Generate
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-primary to-accent-purple text-white rounded-xl hover:shadow-glow transition-all"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={() => setShowProvisionModal(true)}
            disabled={visibleNodes.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {provisioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            {provisioning ? 'Provisioning...' : 'Provision'}
          </button>
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className={`p-2.5 rounded-xl transition-all duration-200 ${
              showRightPanel ? 'bg-primary/10 text-primary shadow-sm' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {showLeftPanel && (
          <div className="w-72 border-r border-slate-200/50 bg-white/80 backdrop-blur-sm overflow-y-auto">
            <ResourcePalette />
          </div>
        )}

        <div
          className="flex-1 relative"
          style={{ background: '#0F172A' }}
          onDrop={handleDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            onNodesChange={onNodesChangeHandler}
            onEdgesChange={onEdgesChangeHandler}
            onConnect={onConnectHandler}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
          >
            <Background color="#334155" gap={20} />
            <Controls className="!bg-slate-800 !border-slate-700 !rounded-xl !overflow-hidden" />
            <MiniMap
              className="!bg-slate-800 !border-slate-700 !rounded-xl"
              nodeColor={(node) => {
                const type = node.data?.type as string || ''
                if (type.includes('aws')) return '#F59E0B'
                if (type.includes('azurerm') || type.includes('azure')) return '#3B82F6'
                if (type.includes('kubernetes')) return '#06B6D4'
                return '#64748B'
              }}
              maskColor="rgba(15, 23, 42, 0.8)"
            />
          </ReactFlow>
          
          {visibleNodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Layers className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400 text-sm">
                  {currentScope.type === 'resource_group' 
                    ? `No resources in ${currentScope.name}` 
                    : 'Drag resources from the left panel'}
                </p>
              </div>
            </div>
          )}
        </div>

        {showRightPanel && (
          <div className="w-80 border-l border-slate-200/50 bg-white/80 backdrop-blur-sm overflow-y-auto">
            <PropertiesPanel
              selectedNode={nodes.find((n) => n.id === useDesignerStore.getState().selectedNodeId)}
              allNodes={nodes}
              onUpdateNode={(id, data) => {
                setNodes((nds) =>
                  nds.map((node) =>
                    node.id === id ? { ...node, data: { ...node.data, ...data } } : node
                  )
                )
              }}
              onDeleteNode={(id) => {
                setNodes((nds) => nds.filter((node) => node.id !== id))
                setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id))
                useDesignerStore.getState().setSelectedNodeId(null)
              }}
            />
          </div>
        )}
      </div>

      {showCodePreview && (
        <CodePreview
          code={generatedCode}
          errors={validationResults.errors}
          warnings={validationResults.warnings}
          onClose={() => setShowCodePreview(false)}
          iaType={currentProject?.iaType || 'terraform'}
        />
      )}

      {showProvisionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Rocket className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold">Provision Resources</h2>
              </div>
              <button onClick={() => setShowProvisionModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cloud Credential</label>
                {credentials.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-700 text-sm">No cloud credentials configured.</p>
                    <a href="/settings" className="text-amber-600 underline text-sm">Add credentials in Settings</a>
                  </div>
                ) : (
                  <select
                    value={selectedCredential}
                    onChange={(e) => setSelectedCredential(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    {credentials.map((cred) => (
                      <option key={cred.id} value={cred.id}>
                        {cred.name} ({cred.provider})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>{visibleNodes.length}</strong> resource(s) will be provisioned.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowProvisionModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProvision}
                  disabled={provisioning || credentials.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {provisioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  {provisioning ? 'Provisioning...' : 'Provision Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
