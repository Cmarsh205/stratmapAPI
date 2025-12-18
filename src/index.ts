import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import userRouter from './routers/user.js'
import stratmapRouter from './routers/stratmap.js'
import { authMiddleware } from './auth.js'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: 'http://localhost:5173',
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
)

app.get('/', c => c.text('Hono User API Running 🚀'))

app.route('/api/v1/users', userRouter)
app.use('/api/v1/stratmaps/*', authMiddleware)
app.route('/api/v1/stratmaps', stratmapRouter)

serve(
  {
    fetch: app.fetch,
    port: 80,
  },
  info => {
    console.log(`Server is running on http://localhost:${info.port}`)
  }
)