import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import userRouter from './routers/user.js'
import stratmapRouter from './routers/stratmap.js'

const app = new Hono()
  
app.route('/api/v1/users', userRouter)
app.route('/api/v1/stratmaps', stratmapRouter)

app.get('/', c => c.text('Hono User API Running 🚀'))

export default app

serve({
  fetch: app.fetch,
  port: 80
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
