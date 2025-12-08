import type { Context } from 'hono'
import type { Stratmap } from '../types.js'
import { pool } from '../database/database.js'

// GET 
export const getStratmaps = async (c: Context) => {
    const result = await pool.query('SELECT * FROM stratmaps')
    return c.json({ status: 'success', data: result.rows }, 200)
}

// GET by ID
export const getStratmap = async (c: Context) => {
    const id = Number(c.req.param('id'))
    const result = await pool.query('SELECT * FROM stratmaps WHERE id = $1', [id])
    if (!result.rows.length) return c.json({ status: 'error', message: 'Stratmap not found' }, 404)
    return c.json({ status: 'success', data: result.rows[0] }, 200)
}

// POST 
export const createStratmap = async (c: Context) => {
    const body = await c.req.json<Stratmap>()
    if (!body.title || !body.description || !body.map) {
        return c.json({ status: 'error', message: 'Title, description, and map are required' }, 404)
    }
    const result = await pool.query('INSERT INTO stratmaps (title, description, map, "created_at") VALUES ($1, $2, $3, NOW()) RETURNING *', [body.title, body.description, body.map])
    return c.json({ status: 'success', data: result.rows[0] }, 201)
}

// PUT
export const updateStratmap = async (c: Context) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json<Partial<Stratmap>>()
    const result = await pool.query('UPDATE stratmaps SET title = $1, description = $2, map = $3, "updated_at" = NOW() WHERE id = $4 RETURNING *', [body.title, body.description, body.map, id])
    if (!result.rows.length) return c.json({ status: 'error', message: 'Stratmap not found' }, 404)
    return c.json({ status: 'success', data: result.rows[0] }, 200)
}

// DELETE
export const deleteStratmap = async(c: Context) => {
    const id = Number(c.req.param('id'))
    const result = await pool.query('DELETE FROM stratmaps WHERE id = $1 RETURNING *', [id])
    if (!result.rows.length) return c.json({ status: 'error', message: 'Stratmap not found' }, 404)
    return c.json({ status: 'success', message: `Stratmap ${id} deleted` }, 200)
    }