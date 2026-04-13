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
    max: 20,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool: sql.ConnectionPool | null = null

async function getPool() {
  if (!pool || pool.connected === false) {
    pool = await sql.connect(config)
    console.log('Connected to Azure SQL Database')
  }
  return pool
}

function convertQueryParams(text: string, params: any[]): { text: string; request: sql.Request } {
  const p = pool!
  const request = p.request()
  
  if (params && params.length > 0) {
    params.forEach((param, index) => {
      request.input(`p${index + 1}`, param)
    })
    
    let convertedText = text
    params.forEach((_, index) => {
      convertedText = convertedText.replace(`$${index + 1}`, `@p${index + 1}`)
    })
    
    return { text: convertedText, request }
  }
  
  return { text, request }
}

export const query = async (text: string, params?: any[]) => {
  const p = await getPool()
  const { text: convertedText, request } = convertQueryParams(text, params)
  return request.query(convertedText)
}

export const queryWithParams = async (text: string, params: Record<string, any>) => {
  const p = await getPool()
  const request = p.request()
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value)
  }
  return request.query(text)
}

export const getClient = async () => {
  const p = await getPool()
  return p.connect()
}

export default { query, queryWithParams, getPool }
