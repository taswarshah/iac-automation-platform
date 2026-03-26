import { Router } from 'express'
import { query } from '../config/database.ts'
import crypto from 'crypto'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { organization_id } = req.query
    
    let sql = 'SELECT id, name, provider, regions, last_used_at, created_at FROM cloud_credentials WHERE is_active = true AND deleted_at IS NULL'
    const params: any[] = []

    if (organization_id) {
      sql += ` AND organization_id = $${params.length + 1}`
      params.push(organization_id)
    }

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching credentials:', error)
    res.status(500).json({ error: 'Failed to fetch credentials' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      provider, 
      organization_id, 
      subscription_id, 
      tenant_id, 
      client_id, 
      client_secret,
      access_key,
      secret_key,
      regions = [],
      created_by 
    } = req.body

    if (!name || !provider || !organization_id) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    let credentials_data = {}

    if (provider === 'azure') {
      credentials_data = {
        subscription_id,
        tenant_id,
        client_id,
        client_secret: client_secret ? crypto.createHash('sha256').update(client_secret).digest('hex') : null
      }
    } else if (provider === 'aws') {
      credentials_data = {
        access_key,
        secret_key: secret_key ? crypto.createHash('sha256').update(secret_key).digest('hex') : null
      }
    }

    const result = await query(
      `INSERT INTO cloud_credentials (organization_id, name, provider, credentials_encrypted, credentials_hash, regions, is_active, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, true, $7) 
       RETURNING id, name, provider, regions, created_at`,
      [organization_id, name, provider, JSON.stringify(credentials_data), crypto.createHash('sha256').update(JSON.stringify(credentials_data)).digest('hex'), regions, created_by]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating credential:', error)
    res.status(500).json({ error: 'Failed to create credential' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, provider, regions, last_used_at, created_at FROM cloud_credentials WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    )

    const credential = result.rows[0]
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' })
    }

    res.json(credential)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch credential' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await query(
      'UPDATE cloud_credentials SET deleted_at = NOW(), is_active = false WHERE id = $1',
      [req.params.id]
    )
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete credential' })
  }
})

router.post('/:id/test', async (req, res) => {
  try {
    const result = await query('SELECT * FROM cloud_credentials WHERE id = $1', [req.params.id])

    const credential = result.rows[0]
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' })
    }

    await query(
      'UPDATE cloud_credentials SET last_used_at = NOW() WHERE id = $1',
      [req.params.id]
    )

    res.json({ 
      success: true, 
      message: `Connection to ${credential.provider} successful (simulation)` 
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to test credential' })
  }
})

export default router
