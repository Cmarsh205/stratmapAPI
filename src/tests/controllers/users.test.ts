import { jest } from '@jest/globals'
import type { Context } from 'hono'
import type { User } from '../../types.js'

type QueryResult = { rows: any[] }
const mockQuery = jest.fn<(...args: any[]) => Promise<QueryResult>>()

// IMPORTANT: controllers import `pool` from `../database/database.js` (ESM),
// so we mock that module before importing the controller under test.
await jest.unstable_mockModule('../../database/database.js', () => ({
  pool: {
    query: mockQuery,
    on: jest.fn(),
  },
}))

const { createUser, deleteUser, getUsers, getUserById, updateUser } = await import(
  '../../controllers/user.js'
)

const mockJsonContext = () =>
  ({
    json: jest.fn((data, status) => ({ data, status })),
  }) as unknown as Context

// Create User
const mockCreateContext = (jsonBody: Partial<User>) =>
  ({
    req: {
      json: jest.fn<() => Promise<Partial<User>>>().mockResolvedValue(jsonBody),
    },
    json: jest.fn((data, status) => ({ data, status })),
  }) as unknown as Context

describe('createUser', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should create a new user and return 201 response', async () => {
    const body = { username: 'Tom', email: 'tom@mail.com' }
    const inserted = { user_id: 1, username: 'Tom', email: 'tom@mail.com' }

    mockQuery.mockResolvedValueOnce({ rows: [inserted] })

    const c = mockCreateContext(body)

    const res = await createUser(c)

    expect(c.req.json).toHaveBeenCalled()
    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
      [body.username, body.email]
    )
    expect(res).toEqual({
      data: { status: 'success', data: inserted },
      status: 201,
    })
  })

  it('should not create user and should return 400 if no email', async () => {
    const body = { username: 'Tom' } as any

    const c = mockCreateContext(body)

    const res = await createUser(c)

    expect(c.req.json).toHaveBeenCalled()
    expect(mockQuery).not.toHaveBeenCalled()
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'Username and email are required',
      },
      status: 400,
    })
  })
})

// Delete User
const mockDeleteContext = (id: number) =>
  ({
    req: {
      param: jest.fn().mockReturnValue(String(id)),
    },
    json: jest.fn((data, status) => ({ data, status })),
  }) as unknown as Context
 
describe('deleteUser', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should delete a user and return 200', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 1 }] })

    const c = mockDeleteContext(1)

    const res = await deleteUser(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(mockQuery).toHaveBeenCalledWith('DELETE FROM users WHERE user_id = $1 RETURNING *', [1])
    expect(res).toEqual({
      data: {
        status: 'success',
        message: 'User 1 deleted',
      },
      status: 200,
    })
  })

  it('should return 404 if user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const c = mockDeleteContext(99)

    const res = await deleteUser(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(mockQuery).toHaveBeenCalledWith('DELETE FROM users WHERE user_id = $1 RETURNING *', [99])
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'User not found',
      },
      status: 404,
    })
  })
})

describe('getUsers', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should return all users (empty array is OK)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const c = mockJsonContext()
    const res = await getUsers(c)

    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users')
    expect(res).toEqual({
      data: { status: 'success', data: [] },
      status: 200,
    })
  })

  it('should return all users', async () => {
    const rows = [
      { user_id: 1, username: 'Tom', email: 'tom@mail.com' },
      { user_id: 2, username: 'Jane', email: 'jane@mail.com' },
    ]
    mockQuery.mockResolvedValueOnce({ rows })

    const c = mockJsonContext()
    const res = await getUsers(c)

    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users')
    expect(res).toEqual({
      data: { status: 'success', data: rows },
      status: 200,
    })
  })
})

// Get by ID
const mockGetByIdContext = (id: number) =>
  ({
    req: {
      param: jest.fn().mockReturnValue(String(id)),
    },
    json: jest.fn((data, status) => ({ data, status })),
  }) as unknown as Context

describe('getUserById', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should return a user by ID', async () => {
    const row = { user_id: 1, username: 'Tom', email: 'tom@mail.com' }
    mockQuery.mockResolvedValueOnce({ rows: [row] })

    const c = mockGetByIdContext(1)
    const res = await getUserById(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE user_id = $1', [1])
    expect(res).toEqual({
      data: {
        status: 'success',
        data: row,
      },
      status: 200,
    })
  })

  it('should return 404 if user not found', async () => {
    const c = mockGetByIdContext(99)
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await getUserById(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE user_id = $1', [99])
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'User not found',
      },
      status: 404,
    })
  })
})

// Update user
const mockUpdateContext = (id: number, body: Partial<User>) =>
  ({
    req: {
      param: jest.fn().mockReturnValue(String(id)),
      json: jest.fn<() => Promise<Partial<User>>>().mockResolvedValue(body),
    },
    json: jest.fn((data, status = 200) => ({ data, status })),
  }) as unknown as Context

describe('updateUser', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should update a user and return 200', async () => {
    const existing = { user_id: 1, username: 'Tom', email: 'tom@mail.com' }
    const updated = { user_id: 1, username: 'Tommy', email: 'tom@mail.com' }

    mockQuery
      .mockResolvedValueOnce({ rows: [existing] }) // SELECT current
      .mockResolvedValueOnce({ rows: [updated] }) // UPDATE

    const body = { username: 'Tommy' }
    const c = mockUpdateContext(1, body)

    const res = await updateUser(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(c.req.json).toHaveBeenCalled()
    expect(mockQuery).toHaveBeenNthCalledWith(1, 'SELECT * FROM users WHERE user_id = $1', [1])
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      'UPDATE users SET username = $1, email = $2 WHERE user_id = $3 RETURNING *',
      ['Tommy', 'tom@mail.com', 1]
    )
    expect(res).toEqual({
      data: {
        status: 'success',
        data: {
          user_id: 1,
          username: 'Tommy',
          email: 'tom@mail.com',
        },
      },
      status: 200,
    })
  })

  it('should return 404 if user not found', async () => {
    const c = mockUpdateContext(99, { name: 'Ghost' })
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await updateUser(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE user_id = $1', [99])
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'User not found',
      },
      status: 404,
    })
  })
})