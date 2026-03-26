import { Node, Edge } from '@xyflow/react'

export type IaCType = 'terraform' | 'kubernetes' | 'azure'

export type ResourceCategory = 'compute' | 'storage' | 'network' | 'database' | 'security' | 'kubernetes' | 'hierarchy' | 'integration' | 'monitoring' | 'analytics'

export interface ResourceDefinition {
  type: string
  label: string
  category: ResourceCategory
  icon: string
  provider: 'aws' | 'gcp' | 'azure' | 'kubernetes'
  inputs: ResourceInput[]
  outputs: string[]
  description: string
}

export interface ResourceInput {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'array' | 'object'
  required: boolean
  default?: unknown
  options?: { value: string; label: string }[]
  description?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  iaType: IaCType
  nodes: Node[]
  edges: Edge[]
  createdAt: string
  updatedAt: string
}

export interface Template {
  id: string
  name: string
  description: string
  category: string
  iaType: IaCType
  nodes: Node[]
  edges: Edge[]
  downloads: number
  author: string
  createdAt: string
}

export interface PolicyViolation {
  id: string
  severity: 'error' | 'warning' | 'info'
  rule: string
  message: string
  resourceId: string
  resourceType: string
}

export interface PolicyRule {
  id: string
  name: string
  description: string
  severity: 'error' | 'warning' | 'info'
  enabled: boolean
}

export interface User {
  id: string
  email: string
  name: string
  organizationId?: string
  organizationName?: string
  organizationSlug?: string
  organizationTier?: string
  role?: 'owner' | 'admin' | 'member' | 'viewer'
}

export interface Organization {
  id: string
  name: string
  slug: string
  tier: 'free' | 'team' | 'pro' | 'enterprise'
  settings?: Record<string, any>
  created_at?: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joined_at: string
  user: {
    id: string
    email: string
    full_name: string
    avatar_url?: string
    created_at: string
  }
}

export interface ChangeRequest {
  id: string
  projectId: string
  title: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  requestedBy: User
  approvedBy?: User
  createdAt: string
  decidedAt?: string
}

export interface ValidationResult {
  valid: boolean
  errors: PolicyViolation[]
  warnings: PolicyViolation[]
}

export interface GeneratedCode {
  terraform?: string
  kubernetes?: string
}

export interface GraphState {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
}

export interface AppState {
  currentProject: Project | null
  projects: Project[]
  templates: Template[]
  isAuthenticated: boolean
  user: User | null
}
