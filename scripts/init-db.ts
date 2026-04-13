import fs from 'fs'
import sql from 'mssql'

const config = {
  server: process.env.DB_SERVER || 'iac-dev.database.windows.net',
  database: process.env.DB_NAME || 'iac',
  user: process.env.DB_USER || 'iac',
  password: process.env.DB_PASSWORD || 'Lahoreone@12',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

async function executeSchema() {
  const pool = await sql.connect(config)
  console.log('Connected to Azure SQL Database')

  const schemaPath = './database/schema.sql'
  const schema = fs.readFileSync(schemaPath, 'utf-8')

  const batches = schema.split(/^\s*GO\s*$/gim).filter(batch => batch.trim())
  console.log(`Executing ${batches.length} batches...`)

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i].trim()
    if (!batch || batch.startsWith('--')) continue
    
    try {
      await pool.request().query(batch)
      console.log(`Batch ${i + 1}/${batches.length} executed`)
    } catch (err: any) {
      if (!batch.includes('CREATE TABLE') || !err.message?.includes('already exists')) {
        console.error(`Batch ${i + 1} error:`, err.message)
      }
    }
  }

  await pool.close()
  console.log('Database initialized successfully!')
}

executeSchema().catch(console.error)