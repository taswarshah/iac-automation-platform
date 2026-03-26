const API_BASE = '/api'

export const api = {
  // Credentials
  async getCredentials(organizationId?: string) {
    const url = organizationId 
      ? `${API_BASE}/credentials?organization_id=${organizationId}`
      : `${API_BASE}/credentials`
    const res = await fetch(url)
    return res.json()
  },

  async createCredential(data: {
    name: string
    provider: string
    organization_id: string
    subscription_id?: string
    tenant_id?: string
    client_id?: string
    client_secret?: string
    access_key?: string
    secret_key?: string
    regions?: string[]
    created_by?: string
  }) {
    const res = await fetch(`${API_BASE}/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  async deleteCredential(id: string) {
    const res = await fetch(`${API_BASE}/credentials/${id}`, {
      method: 'DELETE'
    })
    return res.ok
  },

  async testCredential(id: string) {
    const res = await fetch(`${API_BASE}/credentials/${id}/test`, {
      method: 'POST'
    })
    return res.json()
  },

  // Projects/Designs
  async getProjects(organizationId?: string) {
    const url = organizationId
      ? `${API_BASE}/projects?organization_id=${organizationId}`
      : `${API_BASE}/projects`
    const res = await fetch(url)
    return res.json()
  },

  async createProject(data: {
    name: string
    description?: string
    organization_id: string
    ia_type: string
    created_by: string
  }) {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  async getProject(id: string) {
    const res = await fetch(`${API_BASE}/projects/${id}/full`)
    return res.json()
  },

  async saveProject(id: string, data: {
    name?: string
    description?: string
    resources?: any[]
    connections?: any[]
    canvas_state?: any
    variables?: any
    status?: string
    environment?: string
    tags?: string[]
    ia_type?: string
    created_by?: string
  }) {
    const res = await fetch(`${API_BASE}/projects/${id}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  async deleteProject(id: string) {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE'
    })
    return res.ok
  },

  // Provision
  async provision(data: {
    design_id: string
    organization_id: string
    credential_id: string
    provider: string
    resources: any[]
    created_by: string
  }) {
    const res = await fetch(`${API_BASE}/provision/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  async destroy(data: {
    design_id: string
    organization_id: string
    credential_id: string
    resources: any[]
    created_by: string
  }) {
    const res = await fetch(`${API_BASE}/provision/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  // Templates
  async getTemplates() {
    const res = await fetch(`${API_BASE}/templates`)
    return res.json()
  },

  // Policy
  async checkPolicies(nodes: any[]) {
    const res = await fetch(`${API_BASE}/policy/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes })
    })
    return res.json()
  },

  // Generate code
  async generateTerraform(nodes: any[], edges: any[]) {
    const res = await fetch(`${API_BASE}/generate/terraform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges })
    })
    return res.json()
  },

  async generateKubernetes(nodes: any[], edges: any[]) {
    const res = await fetch(`${API_BASE}/generate/kubernetes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges })
    })
    return res.json()
  },

  // Deployments
  async getDeployments(organizationId?: string) {
    const url = organizationId
      ? `${API_BASE}/deployments?organization_id=${organizationId}`
      : `${API_BASE}/deployments`
    const res = await fetch(url)
    return res.json()
  },

  // Organizations
  async getOrganizations() {
    const res = await fetch(`${API_BASE}/organizations`)
    return res.json()
  },

  async getOrganization(id: string) {
    const res = await fetch(`${API_BASE}/organizations/${id}`)
    return res.json()
  },

  async createOrganization(data: { name: string; slug?: string; tier?: string }) {
    const res = await fetch(`${API_BASE}/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  async getOrganizationMembers(orgId: string) {
    const res = await fetch(`${API_BASE}/organizations/${orgId}/members`)
    return res.json()
  },

  async addOrganizationMember(orgId: string, data: { email: string; role: string }) {
    const res = await fetch(`${API_BASE}/organizations/${orgId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  async removeOrganizationMember(orgId: string, memberId: string) {
    const res = await fetch(`${API_BASE}/organizations/${orgId}/members/${memberId}`, {
      method: 'DELETE'
    })
    return res.ok
  },

  async updateOrganizationMemberRole(orgId: string, memberId: string, role: string) {
    const res = await fetch(`${API_BASE}/organizations/${orgId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    })
    return res.json()
  }
}

export default api
