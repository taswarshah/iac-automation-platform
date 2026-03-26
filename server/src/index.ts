import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.ts'
import projectRoutes from './routes/projects.ts'
import templateRoutes from './routes/templates.ts'
import generateRoutes from './routes/generate.ts'
import policyRoutes from './routes/policy.ts'
import credentialRoutes from './routes/credentials.ts'
import provisionRoutes from './routes/provision.ts'
import organizationRoutes from './routes/organizations.ts'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/generate', generateRoutes)
app.use('/api/policy', policyRoutes)
app.use('/api/credentials', credentialRoutes)
app.use('/api/provision', provisionRoutes)
app.use('/api/organizations', organizationRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
