import type { Context } from 'hono'
import { pool } from '../database/database.js'

type TeamRow = {
  id: string
  name: string
  owner_id: number
  created_at: string
  role: string
  member_count: number
}

type TeamMemberRow = {
  user_id: number
  username: string | null
  email: string | null
  role: string
  joined_at: string
}

export const getTeams = async (c: Context) => {
  const dbUserId = c.get('dbUserId') as number
  const privateTeamId = c.get('privateTeamId') as string

  const result = await pool.query<TeamRow>(
    `
      SELECT
        t.id,
        t.name,
        t.owner_id,
        t.created_at,
        tm.role,
        (
          SELECT COUNT(*)::int
          FROM team_members
          WHERE team_id = t.id
        ) AS member_count
      FROM teams t
      INNER JOIN team_members tm
        ON tm.team_id = t.id
       AND tm.user_id = $1
      WHERE t.id <> $2
        AND NOT (
          t.owner_id = $1
          AND t.name ILIKE '%private team'
        )
      ORDER BY t.created_at DESC
    `,
    [dbUserId, privateTeamId]
  )

  return c.json({ status: 'success', data: result.rows }, 200)
}

export const getTeam = async (c: Context) => {
  const dbUserId = c.get('dbUserId') as number
  const privateTeamId = c.get('privateTeamId') as string
  const teamId = c.req.param('id')

  const teamResult = await pool.query<{
    id: string
    name: string
    owner_id: number
    created_at: string
    role: string
  }>(
    `
      SELECT
        t.id,
        t.name,
        t.owner_id,
        t.created_at,
        tm.role
      FROM teams t
      INNER JOIN team_members tm
        ON tm.team_id = t.id
       AND tm.user_id = $1
      WHERE t.id = $2
        AND t.id <> $3
        AND NOT (
          t.owner_id = $1
          AND t.name ILIKE '%private team'
        )
    `,
    [dbUserId, teamId, privateTeamId]
  )

  if (!teamResult.rows.length) {
    return c.json(
      { status: 'error', message: 'Team not found or access denied' },
      404
    )
  }

  const team = teamResult.rows[0]

  const membersResult = await pool.query<TeamMemberRow>(
    `
      SELECT
        tm.user_id,
        u.username,
        u.email,
        tm.role,
        tm.joined_at
      FROM team_members tm
      LEFT JOIN users u
        ON u.id = tm.user_id
      WHERE tm.team_id = $1
      ORDER BY tm.joined_at ASC
    `,
    [teamId]
  )

  return c.json(
    {
      status: 'success',
      data: {
        id: team.id,
        name: team.name,
        owner_id: team.owner_id,
        created_at: team.created_at,
        currentUserRole: team.role,
        currentUserId: dbUserId,
        members: membersResult.rows,
      },
    },
    200
  )
}

export const createTeam = async (c: Context) => {
  const body = await c.req.json<{ name?: string }>()

  if (!body.name || !body.name.trim()) {
    return c.json(
      { status: 'error', message: 'Team name is required' },
      400
    )
  }

  const dbUserId = c.get('dbUserId') as number
  const name = body.name.trim()

  const teamResult = await pool.query<Pick<TeamRow, 'id' | 'name' | 'owner_id' | 'created_at'>>(
    `
      INSERT INTO teams (name, owner_id, created_at)
      VALUES ($1, $2, NOW())
      RETURNING id, name, owner_id, created_at
    `,
    [name, dbUserId]
  )

  const team = teamResult.rows[0]

  await pool.query(
    `
      INSERT INTO team_members (team_id, user_id, role, joined_at)
      VALUES ($1, $2, 'owner', NOW())
    `,
    [team.id, dbUserId]
  )

  const memberCountResult = await pool.query<{ member_count: number }>(
    `
      SELECT COUNT(*)::int AS member_count
      FROM team_members
      WHERE team_id = $1
    `,
    [team.id]
  )

  const response: TeamRow = {
    id: team.id,
    name: team.name,
    owner_id: team.owner_id,
    created_at: team.created_at,
    role: 'owner',
    member_count: memberCountResult.rows[0]?.member_count ?? 1,
  }

  return c.json({ status: 'success', data: response }, 201)
}

export const inviteToTeam = async (c: Context) => {
  const teamId = c.req.param('id')
  const privateTeamId = c.get('privateTeamId') as string
  const dbUserId = c.get('dbUserId') as number

  if (!teamId) {
    return c.json({ status: 'error', message: 'Team id is required' }, 400)
  }

  if (teamId === privateTeamId) {
    return c.json(
      {
        status: 'error',
        message: 'You cannot invite other users to your private team',
      },
      403
    )
  }

  const body = await c.req.json<{ email?: string; username?: string }>()

  if (!body.email && !body.username) {
    return c.json(
      { status: 'error', message: 'Provide an email or username to invite' },
      400
    )
  }

  const membership = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM team_members
      WHERE team_id = $1 AND user_id = $2
    `,
    [teamId, dbUserId]
  )

  if (!membership.rows.length) {
    return c.json(
      { status: 'error', message: 'You do not have access to this team' },
      403
    )
  }

  let targetUserId: number | null = null

  if (body.email) {
    const userByEmail = await pool.query<{ id: number }>(
      'SELECT id FROM users WHERE email = $1',
      [body.email]
    )
    if (userByEmail.rows.length) {
      targetUserId = userByEmail.rows[0].id
    }
  } else if (body.username) {
    const userByUsername = await pool.query<{ id: number }>(
      'SELECT id FROM users WHERE username = $1',
      [body.username]
    )
    if (userByUsername.rows.length) {
      targetUserId = userByUsername.rows[0].id
    }
  }

  if (!targetUserId) {
    return c.json(
      { status: 'error', message: 'User not found for invitation' },
      404
    )
  }

  const existingMember = await pool.query(
    `
      SELECT 1
      FROM team_members
      WHERE team_id = $1 AND user_id = $2
    `,
    [teamId, targetUserId]
  )

  if (!existingMember.rows.length) {
    await pool.query(
      `
        INSERT INTO team_members (team_id, user_id, role, joined_at)
        VALUES ($1, $2, 'member', NOW())
      `,
      [teamId, targetUserId]
    )
  }

  return c.json(
    { status: 'success', message: 'User added to team successfully' },
    200
  )
}

export const updateMemberRole = async (c: Context) => {
  const dbUserId = c.get('dbUserId') as number
  const teamId = c.req.param('id')
  const memberId = Number(c.req.param('userId'))
  const body = await c.req.json<{ role?: string }>()

  if (!body.role || !body.role.trim()) {
    return c.json(
      { status: 'error', message: 'Role is required' },
      400
    )
  }

  const role = body.role.trim()

  const ownerCheck = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM team_members
      WHERE team_id = $1 AND user_id = $2
    `,
    [teamId, dbUserId]
  )

  if (!ownerCheck.rows.length || ownerCheck.rows[0].role !== 'owner') {
    return c.json(
      { status: 'error', message: 'Only the team owner can change roles' },
      403
    )
  }

  if (memberId === dbUserId) {
    return c.json(
      { status: 'error', message: 'Owner cannot change their own role' },
      400
    )
  }

  const result = await pool.query<TeamMemberRow>(
    `
      UPDATE team_members
      SET role = $1
      WHERE team_id = $2 AND user_id = $3
      RETURNING user_id, role
    `,
    [role, teamId, memberId]
  )

  if (!result.rows.length) {
    return c.json(
      { status: 'error', message: 'Team member not found' },
      404
    )
  }

  return c.json(
    { status: 'success', data: { user_id: result.rows[0].user_id, role } },
    200
  )
}

export const removeMember = async (c: Context) => {
  const dbUserId = c.get('dbUserId') as number
  const teamId = c.req.param('id')
  const memberId = Number(c.req.param('userId'))

  const ownerCheck = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM team_members
      WHERE team_id = $1 AND user_id = $2
    `,
    [teamId, dbUserId]
  )

  if (!ownerCheck.rows.length || ownerCheck.rows[0].role !== 'owner') {
    return c.json(
      { status: 'error', message: 'Only the team owner can remove members' },
      403
    )
  }

  if (memberId === dbUserId) {
    return c.json(
      { status: 'error', message: 'Owner cannot remove themselves from the team' },
      400
    )
  }

  const result = await pool.query(
    `
      DELETE FROM team_members
      WHERE team_id = $1 AND user_id = $2
      RETURNING user_id
    `,
    [teamId, memberId]
  )

  if (!result.rows.length) {
    return c.json(
      { status: 'error', message: 'Team member not found' },
      404
    )
  }

  return c.json(
    { status: 'success', message: 'Member removed from team' },
    200
  )
}

export const deleteTeam = async (c: Context) => {
  const dbUserId = c.get('dbUserId') as number
  const privateTeamId = c.get('privateTeamId') as string
  const teamId = c.req.param('id')

  if (teamId === privateTeamId) {
    return c.json(
      { status: 'error', message: 'Private team cannot be deleted' },
      400
    )
  }

  const result = await pool.query(
    `
      DELETE FROM teams
      WHERE id = $1 AND owner_id = $2
        AND id <> $3
      RETURNING id
    `,
    [teamId, dbUserId, privateTeamId]
  )

  if (!result.rows.length) {
    return c.json(
      { status: 'error', message: 'Team not found or access denied' },
      404
    )
  }

  return c.json(
    { status: 'success', message: 'Team deleted' },
    200
  )
}

