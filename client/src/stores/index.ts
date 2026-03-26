import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Node, Edge } from '@xyflow/react'
import type { Project, Template, User } from '@/types'

const getInitialUser = (): User | null => {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('user')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }
  return null
}

const getInitialAuth = (): boolean => {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('token')
}

interface AppStore {
  user: User | null
  isAuthenticated: boolean
  projects: Project[]
  currentProject: Project | null
  templates: Template[]
  isLoading: boolean
  
  setUser: (user: User | null) => void
  login: (user: User) => void
  logout: () => void
  
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  
  setCurrentProject: (project: Project | null) => void
  updateCurrentProjectNodes: (nodes: Node[]) => void
  updateCurrentProjectEdges: (edges: Edge[]) => void
  
  setTemplates: (templates: Template[]) => void
  addTemplate: (template: Template) => void
  
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppStore>()(
  immer((set) => ({
    user: getInitialUser(),
    isAuthenticated: getInitialAuth(),
    projects: [],
    currentProject: null,
    templates: [],
    isLoading: false,

    setUser: (user) =>
      set((state) => {
        state.user = user
        state.isAuthenticated = !!user
      }),

    login: (user) =>
      set((state) => {
        state.user = user
        state.isAuthenticated = true
      }),

    logout: () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      set((state) => {
        state.user = null
        state.isAuthenticated = false
        state.currentProject = null
      })
    },

    setProjects: (projects) =>
      set((state) => {
        state.projects = projects
      }),

    addProject: (project) =>
      set((state) => {
        state.projects.push(project)
      }),

    updateProject: (id, updates) =>
      set((state) => {
        const index = state.projects.findIndex((p) => p.id === id)
        if (index !== -1) {
          state.projects[index] = { ...state.projects[index], ...updates }
        }
        if (state.currentProject?.id === id) {
          state.currentProject = { ...state.currentProject, ...updates }
        }
      }),

    deleteProject: (id) =>
      set((state) => {
        state.projects = state.projects.filter((p) => p.id !== id)
        if (state.currentProject?.id === id) {
          state.currentProject = null
        }
      }),

    setCurrentProject: (project) =>
      set((state) => {
        state.currentProject = project
      }),

    updateCurrentProjectNodes: (nodes) =>
      set((state) => {
        if (state.currentProject) {
          state.currentProject.nodes = nodes
        }
      }),

    updateCurrentProjectEdges: (edges) =>
      set((state) => {
        if (state.currentProject) {
          state.currentProject.edges = edges
        }
      }),

    setTemplates: (templates) =>
      set((state) => {
        state.templates = templates
      }),

    addTemplate: (template) =>
      set((state) => {
        state.templates.push(template)
      }),

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading
      }),
  }))
)

interface DesignerStore {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  zoom: number
  history: { nodes: Node[]; edges: Edge[] }[]
  historyIndex: number
  currentScope: {
    type: 'subscription' | 'resource_group'
    id?: string
    name: string
  }
  scopePath: { type: 'subscription' | 'resource_group', id?: string, name: string }[]

  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  addNode: (node: Node) => void
  updateNode: (id: string, data: Partial<Node['data']>) => void
  deleteNode: (id: string) => void
  
  setSelectedNodeId: (id: string | null) => void
  
  setZoom: (zoom: number) => void
  
  pushHistory: () => void
  undo: () => void
  redo: () => void
  clearHistory: () => void
  enterResourceGroup: (id: string, name: string) => void
  exitResourceGroup: () => void
  goToScope: (index: number) => void
  resetScope: () => void
}

export const useDesignerStore = create<DesignerStore>()(
  immer((set) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    zoom: 1,
    history: [],
    historyIndex: -1,
    currentScope: {
      type: 'subscription',
      name: 'Subscription'
    },
    scopePath: [{ type: 'subscription', name: 'Subscription' }],

    setNodes: (nodes) =>
      set((state) => {
        state.nodes = nodes
      }),

    setEdges: (edges) =>
      set((state) => {
        state.edges = edges
      }),

    addNode: (node) =>
      set((state) => {
        if (state.currentScope.type === 'resource_group') {
          node.data.resourceGroupId = state.currentScope.id
          node.data.resourceGroupName = state.currentScope.name
        }
        state.nodes.push(node)
      }),

    updateNode: (id, data) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === id)
        if (node) {
          node.data = { ...node.data, ...data }
        }
      }),

    deleteNode: (id) =>
      set((state) => {
        state.nodes = state.nodes.filter((n) => n.id !== id)
        state.edges = state.edges.filter(
          (e) => e.source !== id && e.target !== id
        )
      }),

    setSelectedNodeId: (id) =>
      set((state) => {
        state.selectedNodeId = id
      }),

    setZoom: (zoom) =>
      set((state) => {
        state.zoom = zoom
      }),

    pushHistory: () =>
      set((state) => {
        const { nodes, edges, history, historyIndex } = state
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push({ nodes: [...nodes], edges: [...edges] })
        state.history = newHistory.slice(-50)
        state.historyIndex = newHistory.length - 1
      }),

    undo: () =>
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex -= 1
          const historyState = state.history[state.historyIndex]
          state.nodes = historyState.nodes
          state.edges = historyState.edges
        }
      }),

    redo: () =>
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex += 1
          const historyState = state.history[state.historyIndex]
          state.nodes = historyState.nodes
          state.edges = historyState.edges
        }
      }),

    clearHistory: () =>
      set((state) => {
        state.history = []
        state.historyIndex = -1
      }),

    enterResourceGroup: (id, name) =>
      set((state) => {
        state.currentScope = { type: 'resource_group', id, name }
        state.scopePath = [...state.scopePath, { type: 'resource_group', id, name }]
      }),

    exitResourceGroup: () =>
      set((state) => {
        if (state.scopePath.length > 1) {
          const newPath = state.scopePath.slice(0, -1)
          const lastScope = newPath[newPath.length - 1]
          state.currentScope = { type: lastScope.type, id: lastScope.id, name: lastScope.name }
          state.scopePath = newPath
        }
      }),

    goToScope: (index) =>
      set((state) => {
        if (index >= 0 && index < state.scopePath.length) {
          const scope = state.scopePath[index]
          state.currentScope = { type: scope.type, id: scope.id, name: scope.name }
          state.scopePath = state.scopePath.slice(0, index + 1)
        }
      }),

    resetScope: () =>
      set((state) => {
        state.currentScope = { type: 'subscription', name: 'Subscription' }
        state.scopePath = [{ type: 'subscription', name: 'Subscription' }]
      }),
  }))
)
