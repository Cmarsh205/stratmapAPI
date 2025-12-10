import 'dotenv/config'
import { Pool } from 'pg'

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
})

pool.on('connect', () => {
  console.log('Connected to PostgreSQL')
})