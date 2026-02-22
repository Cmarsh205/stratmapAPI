import type { Context } from 'hono'
import type { Stratmap, StratmapCreate, StratmapUpdate } from '../types.js'
import { pool } from '../database/database.js'

// GET all stratmaps for the user's private team
export const getStratmaps = async (c: Context) => {
    const privateTeamId = c.get('privateTeamId') as string
    const result = await pool.query(
        'SELECT id, team_id, created_by, title, description, data, created_at, updated_at FROM stratmaps WHERE team_id = $1 ORDER BY updated_at DESC',
        [privateTeamId]
    )
    return c.json({ status: 'success', data: result.rows }, 200)
}

// GET by ID (uuid) - verify user has access via team membership
export const getStratmap = async (c: Context) => {
    const id = c.req.param('id')
    const privateTeamId = c.get('privateTeamId') as string
    const result = await pool.query(
        'SELECT id, team_id, created_by, title, description, data, created_at, updated_at FROM stratmaps WHERE id = $1 AND team_id = $2',
        [id, privateTeamId]
    )
    if (!result.rows.length) return c.json({ status: 'error', message: 'Stratmap not found' }, 404)
    return c.json({ status: 'success', data: result.rows[0] }, 200)
}

// POST create stratmap
export const createStratmap = async (c: Context) => {
    const body = await c.req.json<StratmapCreate>()
    if (!body.title?.trim()) {
        return c.json({ status: 'error', message: 'Title is required' }, 400)
    }
    const dbUserId = c.get('dbUserId') as string
    const privateTeamId = c.get('privateTeamId') as string
    const data = body.data ?? { snapshot: null, mapName: body.description ?? null, floorImage: null }
    const result = await pool.query(
        `INSERT INTO stratmaps (team_id, created_by, title, description, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, team_id, created_by, title, description, data, created_at, updated_at`,
        [
            privateTeamId,
            dbUserId,
            body.title.trim(),
            body.description ?? '',
            JSON.stringify(data),
        ]
    )
    return c.json({ status: 'success', data: result.rows[0] }, 201)
}

// PUT update stratmap
export const updateStratmap = async (c: Context) => {
    const id = c.req.param('id')
    const body = await c.req.json<StratmapUpdate>()
    const privateTeamId = c.get('privateTeamId') as string

    const updates: string[] = []
    const values: unknown[] = []
    let paramIdx = 1

    if (body.title !== undefined) {
        updates.push(`title = $${paramIdx++}`)
        values.push(body.title.trim())
    }
    if (body.description !== undefined) {
        updates.push(`description = $${paramIdx++}`)
        values.push(body.description)
    }
    if (body.data !== undefined) {
        updates.push(`data = $${paramIdx++}`)
        values.push(JSON.stringify(body.data))
    }

    if (updates.length === 0) {
        const existing = await pool.query(
            'SELECT id, team_id, created_by, title, description, data, created_at, updated_at FROM stratmaps WHERE id = $1 AND team_id = $2',
            [id, privateTeamId]
        )
        if (!existing.rows.length) return c.json({ status: 'error', message: 'Stratmap not found' }, 404)
        return c.json({ status: 'success', data: existing.rows[0] }, 200)
    }

    updates.push(`updated_at = NOW()`)
    values.push(id, privateTeamId)
    const result = await pool.query(
        `UPDATE stratmaps SET ${updates.join(', ')} WHERE id = $${paramIdx} AND team_id = $${paramIdx + 1} RETURNING id, team_id, created_by, title, description, data, created_at, updated_at`,
        values
    )
    if (!result.rows.length) return c.json({ status: 'error', message: 'Stratmap not found' }, 404)
    return c.json({ status: 'success', data: result.rows[0] }, 200)
}

// DELETE stratmap
export const deleteStratmap = async (c: Context) => {
    const id = c.req.param('id')
    const privateTeamId = c.get('privateTeamId') as string
    const result = await pool.query(
        'DELETE FROM stratmaps WHERE id = $1 AND team_id = $2 RETURNING id',
        [id, privateTeamId]
    )
    if (!result.rows.length) return c.json({ status: 'error', message: 'Stratmap not found' }, 404)
    return c.json({ status: 'success', message: 'Stratmap deleted' }, 200)
}
