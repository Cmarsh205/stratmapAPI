import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import userRouter from './routers/user.js';
const app = new Hono();
app.route('/users', userRouter);
app.get('/', c => c.text('Hono User API Running 🚀'));
export default app;
serve({
    fetch: app.fetch,
    port: 80
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
