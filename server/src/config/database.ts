import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://iacplatform:iacplatform123@localhost:5432/iac_platform',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

export const query = (text: string, params?: any[]) => pool.query(text, params)

export const getClient = () => pool.connect()

export default pool
