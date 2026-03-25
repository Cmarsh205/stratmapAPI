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

// POST share stratmap to all members of a selected team (creates copies in each recipient's private team).
// The requester (original owner on their saved strats page) is excluded to avoid duplicates.
export const shareStratmap = async (c: Context) => {
    const id = c.req.param('id')
    const privateTeamId = c.get('privateTeamId') as string
    const dbUserId = c.get('dbUserId') as number

    const body = await c.req.json<{ teamId?: string }>()
    const teamId = body.teamId
    if (!teamId?.trim()) {
        return c.json({ status: 'error', message: 'teamId is required' }, 400)
    }

    // Ensure the strat belongs to the requester (their private team).
    const stratRes = await pool.query<
        Pick<Stratmap, 'title' | 'description' | 'data'>
    >(
        'SELECT title, description, data FROM stratmaps WHERE id = $1 AND team_id = $2',
        [id, privateTeamId]
    )

    if (!stratRes.rows.length) {
        return c.json({ status: 'error', message: 'Stratmap not found' }, 404)
    }

    // Ensure requester is a member of the target team.
    const requesterMemberRes = await pool.query(
        'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
        [teamId, dbUserId]
    )

    if (!requesterMemberRes.rows.length) {
        return c.json({ status: 'error', message: 'You do not have access to this team' }, 403)
    }

    // Recipients are all team members except the requester.
    const recipientsRes = await pool.query<{ user_id: number }>(
        'SELECT user_id FROM team_members WHERE team_id = $1 AND user_id <> $2',
        [teamId, dbUserId]
    )

    if (!recipientsRes.rows.length) {
        return c.json({ status: 'success', data: { createdCount: 0 } }, 200)
    }

    const { title, description, data } = stratRes.rows[0]

    // Insert a copy into each recipient's private team.
    let createdCount = 0

    for (const recipient of recipientsRes.rows) {
        // Private team naming convention: "<displayName>'s private team"
        let recipientPrivateTeam = await pool.query<{ id: string }>(
            "SELECT id FROM teams WHERE owner_id = $1 AND name ILIKE '%private team%' LIMIT 1",
            [recipient.user_id]
        )

        if (!recipientPrivateTeam.rows.length) {
            // Create the recipient's private team if it doesn't exist yet.
            const recipientUser = await pool.query<{
                username: string | null
                email: string | null
            }>('SELECT username, email FROM users WHERE id = $1', [recipient.user_id])

            const displayName =
                recipientUser.rows[0]?.username ??
                recipientUser.rows[0]?.email ??
                'User'

            const privateTeamName = `${displayName}'s private team`

            const createdTeam = await pool.query<{ id: string }>(
                `
                INSERT INTO teams (name, owner_id, created_at)
                VALUES ($1, $2, NOW())
                RETURNING id
                `,
                [privateTeamName, recipient.user_id]
            )

            recipientPrivateTeam = createdTeam

            await pool.query(
                `
                INSERT INTO team_members (team_id, user_id, role, joined_at)
                VALUES ($1, $2, 'owner', NOW())
                `,
                [recipientPrivateTeam.rows[0].id, recipient.user_id]
            )
        }

        await pool.query(
            `
            INSERT INTO stratmaps
              (team_id, created_by, title, description, data, created_at, updated_at)
            VALUES
              ($1, $2, $3, $4, $5, NOW(), NOW())
            `,
            [
                recipientPrivateTeam.rows[0].id,
                recipient.user_id,
                title,
                description,
                JSON.stringify(data ?? {}),
            ]
        )

        createdCount += 1
    }

    return c.json(
        { status: 'success', data: { createdCount } },
        200
    )
}
