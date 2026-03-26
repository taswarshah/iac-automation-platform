import { Router } from 'express'
import { query } from '../config/database.ts'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { category, provider, search } = req.query

    let sql = 'SELECT * FROM templates WHERE is_public = true AND deleted_at IS NULL'
    const params: any[] = []

    if (category && category !== 'all') {
      sql += ` AND category = $${params.length + 1}`
      params.push(category)
    }

    if (provider && provider !== 'all') {
      sql += ` AND ia_type = $${params.length + 1}`
      params.push(provider)
    }

    if (search) {
      sql += ` AND (LOWER(name) LIKE $${params.length + 1} OR LOWER(description) LIKE $${params.length + 1})`
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY usage_count DESC'

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching templates:', error)
    res.status(500).json({ error: 'Failed to fetch templates' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM templates WHERE id = $1', [req.params.id])

    const template = result.rows[0]
    if (!template) {
      return res.status(404).json({ error: 'Template not found' })
    }
    res.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    res.status(500).json({ error: 'Failed to fetch template' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, description, category, iaType, nodes, edges } = req.body

    const result = await query(
      `INSERT INTO templates (name, description, category, ia_type, nodes, edges, author_id, is_public, usage_count) 
       VALUES ($1, $2, $3, $4, $5, $6, 'user', false, 0) 
       RETURNING *`,
      [name, description, category, iaType, nodes, edges]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating template:', error)
    res.status(500).json({ error: 'Failed to create template' })
  }
})

router.post('/:id/deploy', async (req, res) => {
  try {
    const result = await query('SELECT * FROM templates WHERE id = $1', [req.params.id])

    const template = result.rows[0]
    if (!template) {
      return res.status(404).json({ error: 'Template not found' })
    }

    await query(
      'UPDATE templates SET usage_count = usage_count + 1 WHERE id = $1',
      [req.params.id]
    )

    res.json({ success: true, project: template })
  } catch (error) {
    console.error('Error deploying template:', error)
    res.status(500).json({ error: 'Failed to deploy template' })
  }
})

export default router
