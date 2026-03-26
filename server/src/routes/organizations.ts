import { Router } from 'express'
import { query } from '../config/database.ts'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM organizations WHERE deleted_at IS NULL ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching organizations:', error)
    res.status(500).json({ error: 'Failed to fetch organizations' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, slug, tier = 'free', created_by } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Organization name is required' })
    }

    const orgSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-')

    try {
      const result = await query(
        `INSERT INTO organizations (name, slug, tier, settings) 
         VALUES ($1, $2, $3, '{}') 
         RETURNING *`,
        [name, orgSlug, tier]
      )
      res.status(201).json(result.rows[0])
    } catch (err: any) {
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Organization slug already exists' })
      }
      throw err
    }
  } catch (error) {
    console.error('Error creating organization:', error)
    res.status(500).json({ error: 'Failed to create organization' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM organizations WHERE id = $1', [req.params.id])

    const organization = result.rows[0]
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' })
    }

    res.json(organization)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, slug, tier, settings } = req.body

    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (name) {
      updates.push(`name = $${paramIndex++}`)
      params.push(name)
    }
    if (slug) {
      updates.push(`slug = $${paramIndex++}`)
      params.push(slug)
    }
    if (tier) {
      updates.push(`tier = $${paramIndex++}`)
      params.push(tier)
    }
    if (settings) {
      updates.push(`settings = $${paramIndex++}`)
      params.push(JSON.stringify(settings))
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    params.push(id)
    const result = await query(
      `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Failed to update organization' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await query('UPDATE organizations SET deleted_at = NOW() WHERE id = $1', [req.params.id])
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete organization' })
  }
})

router.get('/:id/members', async (req, res) => {
  try {
    const { id } = req.params

    const result = await query(
      `SELECT om.*, u.id as user_id, u.email, u.full_name, u.avatar_url, u.created_at as user_created_at
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1
       ORDER BY om.joined_at ASC`,
      [id]
    )
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' })
  }
})

router.post('/:id/members', async (req, res) => {
  try {
    const { id } = req.params
    const { email, role = 'member', invited_by } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const userResult = await query('SELECT id FROM users WHERE email = $1', [email])
    const user = userResult.rows[0]

    if (!user) {
      return res.status(404).json({ error: 'User not found. They need to register first.' })
    }

    const existingMember = await query(
      'SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [id, user.id]
    )

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member' })
    }

    const result = await query(
      `INSERT INTO organization_members (organization_id, user_id, role, invited_by, joined_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING *`,
      [id, user.id, role, invited_by]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error adding member:', error)
    res.status(500).json({ error: 'Failed to add member' })
  }
})

router.patch('/:id/members/:memberId', async (req, res) => {
  try {
    const { id, memberId } = req.params
    const { role } = req.body

    if (!role) {
      return res.status(400).json({ error: 'Role is required' })
    }

    const result = await query(
      'UPDATE organization_members SET role = $1 WHERE id = $2 AND organization_id = $3 RETURNING *',
      [role, memberId, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Failed to update member' })
  }
})

router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    const { id, memberId } = req.params

    await query('DELETE FROM organization_members WHERE id = $1 AND organization_id = $2', [memberId, id])
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' })
  }
})

export default router
