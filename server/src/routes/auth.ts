import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../config/database.ts'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

router.post('/register', async (req, res) => {
  try {
    const { email, name, password, organizationName } = req.body

    const existingResult = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const username = email.split('@')[0]

    const userResult = await query(
      `INSERT INTO users (email, username, full_name, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, full_name`,
      [email, username, name, passwordHash]
    )
    const user = userResult.rows[0]

    let organization = null
    let memberRole = null

    if (organizationName) {
      const slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const orgResult = await query(
        `INSERT INTO organizations (name, slug, tier) 
         VALUES ($1, $2, 'free') 
         RETURNING id, name, slug`,
        [organizationName, slug]
      )
      const org = orgResult.rows[0]

      if (org) {
        await query(
          `INSERT INTO organization_members (organization_id, user_id, role) 
           VALUES ($1, $2, 'owner')`,
          [org.id, user.id]
        )
        organization = org
        memberRole = 'owner'
      }
    }

    const token = jwt.sign({ 
      userId: user.id, 
      organizationId: organization?.id || null,
      role: memberRole || 'member'
    }, JWT_SECRET, { expiresIn: '1h' })

    res.json({
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.full_name,
        organizationId: organization?.id || null,
        organizationName: organization?.name || null,
        role: memberRole || 'member'
      },
      token,
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const userResult = await query('SELECT * FROM users WHERE email = $1', [email])
    const user = userResult.rows[0]

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const orgMemberResult = await query(
      `SELECT om.role, o.id, o.name, o.slug, o.tier
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1`,
      [user.id]
    )
    const orgMember = orgMemberResult.rows[0]

    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    )

    const token = jwt.sign({ 
      userId: user.id, 
      organizationId: orgMember?.id || null,
      role: orgMember?.role || 'member'
    }, JWT_SECRET, { expiresIn: '1h' })

    res.json({
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.full_name,
        organizationId: orgMember?.id || null,
        organizationName: orgMember?.name || null,
        organizationSlug: orgMember?.slug || null,
        organizationTier: orgMember?.tier || null,
        role: orgMember?.role || 'member'
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    
    const userResult = await query(
      'SELECT id, email, full_name FROM users WHERE id = $1',
      [decoded.userId]
    )
    const user = userResult.rows[0]

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(user)
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
