import type { Context } from 'hono'
import type { User } from '../types.js'
import { pool } from '../database/database.js'

// GET 
export const getUsers = async (c: Context) => {
  const result = await pool.query('SELECT * FROM users')
  return c.json({ status: 'success', data: result.rows }, 200)
}

// GET by ID
export const getUserById = async (c: Context) => {
  const id = Number(c.req.param('id'))
  const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [id])
  if (!result.rows.length) return c.json({ status: 'error', message: 'User not found' }, 404)
  return c.json({ status: 'success', data: result.rows[0] }, 200)
}

// POST 
export const createUser = async (c: Context) => {
  const body = await c.req.json<User>()
  if (!body.username || !body.email) {
    return c.json({ status: 'error', message: 'Username and email are required' }, 400)
  }
  const result = await pool.query('INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *', [body.username, body.email])
  return c.json({ status: 'success', data: result.rows[0] }, 201)
}

// PUT 
export const updateUser = async (c: Context) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<User>>()
  
  const currentUser = await pool.query('SELECT * FROM users WHERE user_id = $1', [id])
  if (!currentUser.rows.length) return c.json({ status: 'error', message: 'User not found' }, 404)
  
  const username = body.username ?? currentUser.rows[0].username
  const email = body.email ?? currentUser.rows[0].email
  
  const result = await pool.query('UPDATE users SET username = $1, email = $2 WHERE user_id = $3 RETURNING *', [username, email, id])
  return c.json({ status: 'success', data: result.rows[0] }, 200)
}

// DELETE 
export const deleteUser = async (c: Context) => {
  const id = Number(c.req.param('id'));
  const result = await pool.query('DELETE FROM users WHERE user_id = $1 RETURNING *', [id])
  if (!result.rows.length) return c.json({ status: 'error', message: 'User not found' }, 404)

  return c.json(
    { status: 'success', message: `User ${id} deleted` },
    200
  );
};