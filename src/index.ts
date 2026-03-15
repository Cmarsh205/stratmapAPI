import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import userRouter from './routers/user.js'
import stratmapRouter from './routers/stratmap.js'
import teamRouter from './routers/team.js'
import { requireAuth } from './middleware/auth.js'
import * as UserController from './controllers/user.js'

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

app.use('/api/v1/users/*', requireAuth)
app.route('/api/v1/users', userRouter)

app.use('/api/v1/me', requireAuth)
app.get('/api/v1/me', UserController.getCurrentUser)
app.put('/api/v1/me', UserController.updateCurrentUser)

app.use('/api/v1/stratmaps', requireAuth)
app.use('/api/v1/stratmaps/*', requireAuth)
app.route('/api/v1/stratmaps', stratmapRouter)

app.use('/api/v1/teams', requireAuth)
app.use('/api/v1/teams/*', requireAuth)
app.route('/api/v1/teams', teamRouter)

serve(
  {
    fetch: app.fetch,
    port: 80,
  },
  info => {
    console.log(`Server is running on http://localhost:${info.port}`)
  }
)