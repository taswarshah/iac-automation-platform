import { Router } from 'express'
import { query } from '../config/database.ts'
import { authenticateToken, AuthRequest } from '../middleware/auth.ts'

const router = Router()

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const orgId = (req.query.organization_id as string) || req.user?.organizationId
    
    let sql = 'SELECT * FROM visual_designs WHERE deleted_at IS NULL'
    const params: any[] = []

    if (orgId) {
      sql += ' AND organization_id = $1'
      params.push(orgId)
    }

    sql += ' ORDER BY updated_at DESC'

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching visual_designs:', error)
    res.status(500).json({ error: 'Failed to fetch visual_designs' })
  }
})

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, description, iaType } = req.body
    const organization_id = req.user?.organizationId
    const created_by = req.user?.userId

    if (!organization_id) {
      return res.status(400).json({ error: 'Organization ID is required' })
    }

    const result = await query(
      `INSERT INTO visual_designs (name, description, ia_type, organization_id, created_by, resources, connections, canvas_state, variables) 
       VALUES ($1, $2, $3, $4, $5, '[]', '[]', '{}', '{}') 
       RETURNING *`,
      [name, description, iaType || 'terraform', organization_id, created_by]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM visual_designs WHERE id = $1',
      [req.params.id]
    )

    const project = result.rows[0]
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

router.patch('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, description, nodes, edges } = req.body

    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (name) {
      updates.push(`name = $${paramIndex++}`)
      params.push(name)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      params.push(description)
    }
    if (nodes) {
      updates.push(`resources = $${paramIndex++}`)
      params.push(JSON.stringify(nodes))
    }
    if (edges) {
      updates.push(`connections = $${paramIndex++}`)
      params.push(JSON.stringify(edges))
    }
    updates.push(`updated_at = NOW()`)
    params.push(req.params.id)

    const result = await query(
      `UPDATE visual_designs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await query('DELETE FROM visual_designs WHERE id = $1', [req.params.id])
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting project:', error)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

router.get('/:id/graph', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT resources, connections FROM visual_designs WHERE id = $1',
      [req.params.id]
    )

    const project = result.rows[0]
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json({ nodes: project.resources, edges: project.connections })
  } catch (error) {
    console.error('Error fetching graph:', error)
    res.status(500).json({ error: 'Failed to fetch graph' })
  }
})

router.post('/:id/graph', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { nodes, edges, canvas_state, variables } = req.body

    const result = await query(
      `UPDATE visual_designs 
       SET resources = $1, connections = $2, canvas_state = COALESCE($3, canvas_state), variables = COALESCE($4, variables), updated_at = NOW()
       WHERE id = $5 
       RETURNING *`,
      [JSON.stringify(nodes), JSON.stringify(nodes), canvas_state, variables, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error saving graph:', error)
    res.status(500).json({ error: 'Failed to save graph' })
  }
})

router.post('/:id/save', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { 
      name, 
      description, 
      resources, 
      connections, 
      canvas_state, 
      variables,
      status,
      environment,
      tags,
      ia_type
    } = req.body

    const { id } = req.params
    const created_by = req.user?.userId

    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (name) {
      updates.push(`name = $${paramIndex++}`)
      params.push(name)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      params.push(description)
    }
    if (resources) {
      updates.push(`resources = $${paramIndex++}`)
      params.push(JSON.stringify(resources))
    }
    if (connections) {
      updates.push(`connections = $${paramIndex++}`)
      params.push(JSON.stringify(connections))
    }
    if (canvas_state) {
      updates.push(`canvas_state = $${paramIndex++}`)
      params.push(JSON.stringify(canvas_state))
    }
    if (variables) {
      updates.push(`variables = $${paramIndex++}`)
      params.push(JSON.stringify(variables))
    }
    if (status) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
    }
    if (environment) {
      updates.push(`environment = $${paramIndex++}`)
      params.push(environment)
    }
    if (tags) {
      updates.push(`tags = $${paramIndex++}`)
      params.push(tags)
    }
    if (ia_type) {
      updates.push(`ia_type = $${paramIndex++}`)
      params.push(ia_type)
    }

    updates.push(`updated_at = NOW()`)
    params.push(id)

    const result = await query(
      `UPDATE visual_designs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    const project = result.rows[0]
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    await query(
      `INSERT INTO design_versions (design_id, version, snapshot, change_description, created_by) 
       VALUES ($1, $2, $3, $4, $5)`,
      [id, (project.version || 0) + 1, JSON.stringify({ resources, connections, canvas_state, variables }), 'Design updated', created_by]
    )

    res.json({
      success: true,
      project,
      message: 'Design saved successfully'
    })
  } catch (error) {
    console.error('Error saving design:', error)
    res.status(500).json({ error: 'Failed to save design' })
  }
})

router.get('/:id/full', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const result = await query('SELECT * FROM visual_designs WHERE id = $1', [id])

    const project = result.rows[0]
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      ia_type: project.ia_type,
      environment: project.environment,
      status: project.status,
      tags: project.tags,
      resources: project.resources || [],
      connections: project.connections || [],
      canvas_state: project.canvas_state || {},
      variables: project.variables || {},
      created_by: project.created_by,
      created_at: project.created_at,
      updated_at: project.updated_at
    })
  } catch (error) {
    console.error('Error fetching full project:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

export default router
