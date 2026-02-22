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
    get: jest.fn((key: string) => (key === 'privateTeamId' ? mockTeamId : undefined)),
    json: jest.fn((data, status = 200) => ({ data, status })),
  }) as unknown as Context

const mockTeamId = '11111111-1111-1111-1111-111111111111'
const mockUserId = '22222222-2222-2222-2222-222222222222'

// Create Stratmap
const mockCreateContext = (jsonBody: Record<string, unknown>) =>
  ({
    req: {
      json: jest.fn<() => Promise<Record<string, unknown>>>().mockResolvedValue(jsonBody),
    },
    get: jest.fn((key: string) => {
      if (key === 'dbUserId') return mockUserId
      if (key === 'privateTeamId') return mockTeamId
      return undefined
    }),
    json: jest.fn((data, status) => ({ data, status })),
  }) as unknown as Context

describe('createStratmap', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should create a new stratmap and return 201 response', async () => {
    const body = { title: 'Test Stratmap', description: 'Test Description' }
    const inserted = {
      id: '33333333-3333-3333-3333-333333333333',
      team_id: mockTeamId,
      created_by: mockUserId,
      title: body.title,
      description: body.description,
      data: { snapshot: null, mapName: body.description, floorImage: null },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockQuery.mockResolvedValueOnce({ rows: [inserted] })

    const c = mockCreateContext(body)

    const res = await createStratmap(c)

    expect(c.req.json).toHaveBeenCalled()
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO stratmaps (team_id, created_by, title, description, data, created_at, updated_at)'),
      [mockTeamId, mockUserId, body.title, body.description, JSON.stringify({ snapshot: null, mapName: body.description, floorImage: null })]
    )
    expect(res).toEqual({
      data: { status: 'success', data: inserted },
      status: 201,
    })
  })

  it('should save stratmap with snapshot as JSONB in data column', async () => {
    const snapshot = {
      store: 'some-tldraw-store',
      schema: { schemaVersion: 2, sequences: {} },
      documents: [
        { id: 'shape:1', typeName: 'shape', props: { x: 10, y: 20 } },
      ],
    }
    const body = {
      title: 'My Strat',
      description: 'Bind',
      data: {
        snapshot,
        mapName: 'Bind',
        floorImage: 'https://example.com/floor.png',
      },
    }
    const inserted = {
      id: '44444444-4444-4444-4444-444444444444',
      team_id: mockTeamId,
      created_by: mockUserId,
      title: body.title,
      description: body.description,
      data: body.data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockQuery.mockResolvedValueOnce({ rows: [inserted] })

    const c = mockCreateContext(body)
    const res = await createStratmap(c)

    expect(res.status).toBe(201)
    const [, , , , dataParam] = mockQuery.mock.calls[0][1] as unknown[]
    const parsedData = JSON.parse(dataParam as string)
    expect(parsedData).toEqual({
      snapshot,
      mapName: 'Bind',
      floorImage: 'https://example.com/floor.png',
    })
    expect(parsedData.snapshot).toEqual(snapshot)
    expect(parsedData.snapshot.documents).toHaveLength(1)
    expect(parsedData.snapshot.documents[0].props.x).toBe(10)
  })

  it('should not create stratmap when title is missing', async () => {
    const body = { title: '', description: 'Test' }
    const c = mockCreateContext(body)

    const res = await createStratmap(c)

    expect(c.req.json).toHaveBeenCalled()
    expect(mockQuery).not.toHaveBeenCalled()
    expect(res).toEqual({
      data: { status: 'error', message: 'Title is required' },
      status: 400,
    })
  })
})

// Delete Stratmap
const mockDeleteContext = (id: string) =>
  ({
    req: {
      param: jest.fn().mockReturnValue(id),
    },
    get: jest.fn((key: string) => (key === 'privateTeamId' ? mockTeamId : undefined)),
    json: jest.fn((data, status = 200) => ({ data, status })),
  }) as unknown as Context

describe('deleteStratmap', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should delete a stratmap and return 200', async () => {
    const stratId = '55555555-5555-5555-5555-555555555555'
    mockQuery.mockResolvedValueOnce({ rows: [{ id: stratId }] })

    const c = mockDeleteContext(stratId)

    const res = await deleteStratmap(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(mockQuery).toHaveBeenCalledWith('DELETE FROM stratmaps WHERE id = $1 AND team_id = $2 RETURNING id', [stratId, mockTeamId])
    expect(res).toEqual({
      data: {
        status: 'success',
        message: 'Stratmap deleted',
      },
      status: 200,
    })
  })

  it('should return error if stratmap not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const c = mockDeleteContext('99999999-9999-9999-9999-999999999999')

    const res = await deleteStratmap(c)

    expect(mockQuery).toHaveBeenCalled()
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

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, team_id, created_by, title, description, data'),
      [mockTeamId]
    )
    expect(res).toEqual({
      data: { status: 'success', data: [] },
      status: 200,
    })
  })

  it('should return all stratmaps', async () => {
    const rows = [
      { id: '1', title: 'Stratmap 1', description: 'Description 1', data: {} },
      { id: '2', title: 'Stratmap 2', description: 'Description 2', data: {} },
    ]

    mockQuery.mockResolvedValueOnce({ rows })

    const c = mockJsonContext()
    const res = await getStratmaps(c)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE team_id = $1'),
      [mockTeamId]
    )
    expect(res).toEqual({
      data: { status: 'success', data: rows },
      status: 200,
    })
  })
})

// Get by ID
const mockGetByIdContext = (id: string) =>
  ({
    req: {
      param: jest.fn().mockReturnValue(id),
    },
    get: jest.fn((key: string) => (key === 'privateTeamId' ? mockTeamId : undefined)),
    json: jest.fn((data, status = 200) => ({ data, status })),
  }) as unknown as Context

describe('getStratmap', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should return a stratmap by ID', async () => {
    const stratId = '66666666-6666-6666-6666-666666666666'
    const row = { id: stratId, title: 'Test', description: 'Desc', data: { snapshot: null } }
    mockQuery.mockResolvedValueOnce({ rows: [row] })

    const c = mockGetByIdContext(stratId)

    const res = await getStratmap(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND team_id = $2'),
      [stratId, mockTeamId]
    )
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
    const c = mockGetByIdContext('99999999-9999-9999-9999-999999999999')

    const res = await getStratmap(c)

    expect(mockQuery).toHaveBeenCalled()
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
const mockUpdateContext = (id: string, body: Record<string, unknown>) =>
  ({
    req: {
      param: jest.fn().mockReturnValue(id),
      json: jest.fn<() => Promise<Record<string, unknown>>>().mockResolvedValue(body),
    },
    get: jest.fn((key: string) => (key === 'privateTeamId' ? mockTeamId : undefined)),
    json: jest.fn((data, status = 200) => ({ data, status })),
  }) as unknown as Context

describe('updateStratmap', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('should update a stratmap and return 200', async () => {
    const stratId = '77777777-7777-7777-7777-777777777777'
    const body = { title: 'Updated Title', description: 'Original Desc' }
    const updated = { id: stratId, title: body.title, description: body.description }
    mockQuery.mockResolvedValueOnce({ rows: [updated] })

    const c = mockUpdateContext(stratId, body)
    const res = await updateStratmap(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(c.req.json).toHaveBeenCalled()
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE stratmaps SET title = $1, description = $2'),
      expect.arrayContaining([body.title, body.description])
    )
    expect(res).toEqual({
      data: { status: 'success', data: updated },
      status: 200,
    })
  })

  it('should update stratmap with new snapshot data as JSONB', async () => {
    const stratId = '88888888-8888-8888-8888-888888888888'
    const newSnapshot = {
      store: 'updated-store',
      schema: { schemaVersion: 2 },
      documents: [{ id: 'shape:99', typeName: 'shape', props: { x: 100, y: 200 } }],
    }
    const body = {
      data: {
        snapshot: newSnapshot,
        mapName: 'Ascent',
        floorImage: null,
      },
    }
    const updated = { id: stratId, data: body.data }
    mockQuery.mockResolvedValueOnce({ rows: [updated] })

    const c = mockUpdateContext(stratId, body)
    const res = await updateStratmap(c)

    expect(res.status).toBe(200)
    const updateCall = mockQuery.mock.calls[0]
    expect(updateCall[0]).toContain('data = $')
    const values = updateCall[1] as unknown[]
    const dataParam = values.find((v): v is string => typeof v === 'string' && v.includes('updated-store'))
    expect(dataParam).toBeDefined()
    const parsed = JSON.parse(dataParam!)
    expect(parsed.snapshot).toEqual(newSnapshot)
    expect(parsed.snapshot.documents[0].props.x).toBe(100)
  })

  it('should return 404 if stratmap not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const c = mockUpdateContext('99999999-9999-9999-9999-999999999999', { title: 'Ghost' })

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

