import { jest } from '@jest/globals'
import type { Context } from 'hono'
import type { Stratmap } from '../../types.js'

type QueryResult = { rows: any[] }
const mockQuery = jest.fn<(...args: any[]) => Promise<QueryResult>>()

await jest.unstable_mockModule('../../database/database.js', () => ({
  pool: {
    query: mockQuery,
    on: jest.fn(),
  },
}))

const { createStratmap, deleteStratmap, getStratmaps, getStratmap, updateStratmap } =
  await import('../../controllers/stratmap.js')

const mockJsonContext = () =>
  ({
    json: jest.fn((data, status = 200) => ({ data, status })),
  }) as unknown as Context

// Create Stratmap
const mockCreateContext = (jsonBody: Partial<Stratmap>) =>
  ({
    req: {
      json: jest.fn<() => Promise<Partial<Stratmap>>>().mockResolvedValue(jsonBody),
    },
    json: jest.fn((data, status) => ({ data, status })),
  }) as unknown as Context

describe('createStratmap', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should create a new stratmap and return 201 response', async () => {
    const body = { title: 'Test Stratmap', description: 'Test Description', map: 'Test Map' }
    const inserted = {
      id: 1,
      title: body.title,
      description: body.description,
      map: body.map,
      created_at: new Date().toISOString(),
    }

    mockQuery.mockResolvedValueOnce({ rows: [inserted] })

    const c = mockCreateContext(body)

    const res = await createStratmap(c)

    expect(c.req.json).toHaveBeenCalled()
    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO stratmaps (title, description, map, "created_at") VALUES ($1, $2, $3, NOW()) RETURNING *',
      [body.title, body.description, body.map]
    )
    expect(res).toEqual({
      data: { status: 'success', data: inserted },
      status: 201,
    })
  })

  it('should not create stratmap and should return 404 if required fields are missing', async () => {
    const body = { title: '' } as any
    const c = mockCreateContext(body)

    const res = await createStratmap(c)

    expect(c.req.json).toHaveBeenCalled()
    expect(mockQuery).not.toHaveBeenCalled()
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'Title, description, and map are required',
      },
      status: 404,
    })
  })
})

// Delete Stratmap
const mockDeleteContext = (id: number) =>
  ({
    req: {
      param: jest.fn().mockReturnValue(String(id)),
    },
    json: jest.fn((data, status = 200) => ({ data, status })),
  }) as unknown as Context

describe('deleteStratmap', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should delete a stratmap and return 200', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] })

    const c = mockDeleteContext(1)

    const res = await deleteStratmap(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(mockQuery).toHaveBeenCalledWith('DELETE FROM stratmaps WHERE id = $1 RETURNING *', [1])
    expect(res).toEqual({
      data: {
        status: 'success',
        message: 'Stratmap 1 deleted',
      },
      status: 200,
    })
  })

  it('should return error if stratmap not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const c = mockDeleteContext(99)

    const res = await deleteStratmap(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(mockQuery).toHaveBeenCalledWith('DELETE FROM stratmaps WHERE id = $1 RETURNING *', [99])
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'Stratmap not found',
      },
      status: 404,
    })
  })
})

describe('getStratmaps', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should return all stratmaps (empty array is OK)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const c = mockJsonContext()
    const res = await getStratmaps(c)

    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM stratmaps')
    expect(res).toEqual({
      data: { status: 'success', data: [] },
      status: 200,
    })
  })

  it('should return all stratmaps', async () => {
    const rows = [
      { id: 1, title: 'Stratmap 1', description: 'Description 1', map: 'Map 1' },
      { id: 2, title: 'Stratmap 2', description: 'Description 2', map: 'Map 2' },
    ]

    mockQuery.mockResolvedValueOnce({ rows })

    const c = mockJsonContext()
    const res = await getStratmaps(c)

    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM stratmaps')
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
    json: jest.fn((data, status = 200) => ({ data, status })),
  }) as unknown as Context

describe('getStratmap', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should return a stratmap by ID', async () => {
    const row = { id: 1, title: 'Test', description: 'Desc', map: 'Map' }
    mockQuery.mockResolvedValueOnce({ rows: [row] })

    const c = mockGetByIdContext(1)

    const res = await getStratmap(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM stratmaps WHERE id = $1', [1])
    expect(res).toEqual({
      data: {
        status: 'success',
        data: row,
      },
      status: 200,
    })
  })

  it('should return 404 if stratmap not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const c = mockGetByIdContext(99)

    const res = await getStratmap(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM stratmaps WHERE id = $1', [99])
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'Stratmap not found',
      },
      status: 404,
    })
  })
})

// Update stratmap
const mockUpdateContext = (id: number, body: Partial<Stratmap>) =>
  ({
    req: {
      param: jest.fn().mockReturnValue(String(id)),
      json: jest.fn<() => Promise<Partial<Stratmap>>>().mockResolvedValue(body),
    },
    json: jest.fn((data, status = 200) => ({ data, status })),
  }) as unknown as Context

describe('updateStratmap', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should update a stratmap and return 200', async () => {
    const body = { title: 'Updated Title', description: 'Original Desc', map: 'Original Map' }
    const updated = { id: 1, title: body.title, description: body.description, map: body.map }
    mockQuery.mockResolvedValueOnce({ rows: [updated] })

    const c = mockUpdateContext(1, body)
    const res = await updateStratmap(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(c.req.json).toHaveBeenCalled()
    expect(mockQuery).toHaveBeenCalledWith(
      'UPDATE stratmaps SET title = $1, description = $2, map = $3, "updated_at" = NOW() WHERE id = $4 RETURNING *',
      [body.title, body.description, body.map, 1]
    )
    expect(res).toEqual({
      data: { status: 'success', data: updated },
      status: 200,
    })
  })

  it('should return 404 if stratmap not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const c = mockUpdateContext(99, { title: 'Ghost' })

    const res = await updateStratmap(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'Stratmap not found',
      },
      status: 404,
    })
  })
})

