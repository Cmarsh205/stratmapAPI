import { jest } from '@jest/globals'
import type { Context, Next } from 'hono'

// Ensure env vars exist before importing the middleware
process.env.AUTH0_DOMAIN = 'test-domain.auth0.com'
process.env.AUTH0_AUDIENCE = 'test-audience'

type QueryResult = { rows: any[] }
const mockQuery = jest.fn<(...args: any[]) => Promise<QueryResult>>()
const mockJwtVerify = jest.fn<(...args: any[]) => Promise<{ payload: any }>>()
const mockCreateRemoteJWKSet = jest.fn().mockReturnValue({} as any)

await jest.unstable_mockModule('../../database/database.js', () => ({
  pool: {
    query: mockQuery,
    on: jest.fn(),
  },
}))

await jest.unstable_mockModule('jose', () => ({
  createRemoteJWKSet: mockCreateRemoteJWKSet,
  jwtVerify: mockJwtVerify,
}))

const { requireAuth } = await import('../../middleware/auth.js')

const createContext = (authHeader?: string) =>
  ({
    req: {
      header: jest.fn(() => authHeader),
    },
    json: jest.fn((data, status) => ({ data, status })),
    set: jest.fn(),
  }) as unknown as Context

const createNext = () => jest.fn<Next>()

describe('requireAuth middleware', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockJwtVerify.mockReset()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const c = createContext(undefined)
    const next = createNext()

    const res = await requireAuth(c, next)

    expect(c.req.header).toHaveBeenCalledWith('Authorization')
    expect(res).toEqual({
      data: { error: 'Missing Authorization header' },
      status: 401,
    })
    expect(next).not.toHaveBeenCalled()
    expect(mockJwtVerify).not.toHaveBeenCalled()
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('returns 401 when Authorization header is not Bearer', async () => {
    const c = createContext('Basic abc123')
    const next = createNext()

    const res = await requireAuth(c, next)

    expect(res).toEqual({
      data: { error: 'Missing Authorization header' },
      status: 401,
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token verification fails', async () => {
    const c = createContext('Bearer invalid-token')
    const next = createNext()

    mockJwtVerify.mockRejectedValueOnce(new Error('invalid token'))

    const res = await requireAuth(c, next)

    expect(mockJwtVerify).toHaveBeenCalled()
    expect(res).toEqual({
      data: { error: 'Invalid or expired token' },
      status: 401,
    })
    expect(next).not.toHaveBeenCalled()
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('returns 401 when token payload has no sub', async () => {
    const c = createContext('Bearer no-sub-token')
    const next = createNext()

    mockJwtVerify.mockResolvedValueOnce({ payload: {} })

    const res = await requireAuth(c, next)

    expect(mockJwtVerify).toHaveBeenCalled()
    expect(res).toEqual({
      data: { error: 'Invalid token payload' },
      status: 401,
    })
    expect(next).not.toHaveBeenCalled()
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('upserts user and calls next on valid token', async () => {
    const c = createContext('Bearer valid-token')
    const next = createNext()

    const payload = {
      sub: 'auth0|123',
      email: 'user@example.com',
      username: 'user123',
    }

    const dbUser = {
      id: 42,
      auth0_sub: payload.sub,
      email: payload.email,
      username: payload.username,
    }

    mockJwtVerify.mockResolvedValueOnce({ payload })

    mockQuery.mockResolvedValueOnce({ rows: [dbUser] })

    const res = await requireAuth(c, next)

    // Middleware should not send a response on success
    expect(res).toBeUndefined()
    expect(c.json).not.toHaveBeenCalled()

    expect(mockJwtVerify).toHaveBeenCalledWith(
      'valid-token',
      expect.anything(),
      expect.objectContaining({
        issuer: `https://${process.env.AUTH0_DOMAIN!}/`,
        audience: process.env.AUTH0_AUDIENCE!,
      })
    )

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users (auth0_sub, email, username, created_at)'),
      [payload.sub, payload.email, payload.username]
    )

    expect(c.set).toHaveBeenCalledWith('auth0User', payload)
    expect(c.set).toHaveBeenCalledWith('dbUser', dbUser)
    expect(c.set).toHaveBeenCalledWith('dbUserId', dbUser.id)
    expect(next).toHaveBeenCalledTimes(1)
  })
})

