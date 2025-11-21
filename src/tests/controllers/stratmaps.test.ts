import { jest } from '@jest/globals';
import { createStratmap, deleteStratmap, getStratmaps, stratmaps, getStratmap, updateStratmap } from '../../controllers/stratmap.js';
import type { Context } from 'hono';
import type { Stratmap } from '../../types.js';

//Create Stratmap
const mockCreateContext = (jsonBody: Omit<Stratmap, 'id' | 'createdAt' | 'updatedAt'>) => {
  return {
    req: {
      json: jest.fn<() => Promise<Omit<Stratmap, 'id' | 'createdAt' | 'updatedAt'>>>().mockResolvedValue(jsonBody),
    },
    json: jest.fn((data, status) => ({ data, status })),
  } as unknown as Context;
};

describe('createStratmap', () => {
  beforeEach(() => {
    stratmaps.length = 0;
  });

  it('should create a new stratmap and return 201 response', async () => {
    const body = { title: 'Test Stratmap', description: 'Test Description', map: 'Test Map' };
    const c = mockCreateContext(body);

    const res = await createStratmap(c);

    expect(c.req.json).toHaveBeenCalled();
    expect(stratmaps.length).toBe(1);
    expect(stratmaps[0]).toMatchObject({ ...body, id: 1 });
    expect(stratmaps[0].createdAt).toBeInstanceOf(Date);
    expect(stratmaps[0].updatedAt).toBeInstanceOf(Date);
    expect((res as any).data.status).toBe('success');
    expect((res as any).data.data).toMatchObject({ ...body, id: 1 });
    expect((res as any).status).toBe(201);
  });

  it('should not create stratmap and should return 404 if required fields are missing', async () => {
    const body = { title: '' } as any;
    const c = mockCreateContext(body);

    const res = await createStratmap(c);

    expect(c.req.json).toHaveBeenCalled();
    expect(stratmaps.length).toBe(0);
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'Title, description, and map are required',
      },
      status: 404,
    });
  });
});

//Delete Stratmap
const mockDeleteContext = (id: number) => {
  return {
    req: {
      param: jest.fn().mockReturnValue(String(id)),
    },
    json: jest.fn((data, status = 200) => ({ data, status })),
  } as unknown as Context;
};

describe('deleteStratmap', () => {
  beforeEach(() => {
    stratmaps.length = 0;
  });

  it('should delete a stratmap and return 200', async () => {
    const now = new Date();
    stratmaps.push({ id: 1, title: 'Test', description: 'Desc', map: 'Map', createdAt: now, updatedAt: now });

    const c = mockDeleteContext(1);

    const res = await deleteStratmap(c);

    expect(c.req.param).toHaveBeenCalledWith('id');
    expect(stratmaps.length).toBe(0);
    expect(res).toEqual({
      data: {
        status: 'success',
        message: 'Stratmap 1 deleted',
      },
      status: 200,
    });
  });

  it('should return error if stratmap not found', async () => {
    const c = mockDeleteContext(99);

    const res = await deleteStratmap(c);

    expect(c.req.param).toHaveBeenCalledWith('id');
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'Stratmap not found',
      },
      status: 404,
    });
  });
});

//Get all
const mockGetAllContext = () => {
  return {
    json: jest.fn((data, status = 200) => ({ data, status })),
  } as unknown as Context;
};

describe('getStratmaps', () => {
  beforeEach(() => {
    stratmaps.length = 0;
  });

  it('should return 404 when no stratmaps exist', async () => {
    const c = mockGetAllContext();

    const res = await getStratmaps(c);

    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'No stratmaps found',
      },
      status: 404,
    });
  });

  it('should return all stratmaps', async () => {
    const now = new Date();
    stratmaps.push(
      { id: 1, title: 'Stratmap 1', description: 'Description 1', map: 'Map 1', createdAt: now, updatedAt: now },
      { id: 2, title: 'Stratmap 2', description: 'Description 2', map: 'Map 2', createdAt: now, updatedAt: now }
    );

    const c = mockGetAllContext();

    const res = await getStratmaps(c);

    expect(res).toEqual({
      data: {
        status: 'success',
        data: [
          { id: 1, title: 'Stratmap 1', description: 'Description 1', map: 'Map 1', createdAt: now, updatedAt: now },
          { id: 2, title: 'Stratmap 2', description: 'Description 2', map: 'Map 2', createdAt: now, updatedAt: now },
        ],
      },
      status: 200,
    });
  });
});

//Get by ID
const mockGetByIdContext = (id: number) => {
  return {
    req: {
      param: jest.fn().mockReturnValue(String(id)),
    },
    json: jest.fn((data, status = 200) => ({ data, status })),
  } as unknown as Context;
};

describe('getStratmap', () => {
  beforeEach(() => {
    stratmaps.length = 0;
  });

  it('should return a stratmap by ID', async () => {
    const now = new Date();
    stratmaps.push({ id: 1, title: 'Test', description: 'Desc', map: 'Map', createdAt: now, updatedAt: now });

    const c = mockGetByIdContext(1);

    const res = await getStratmap(c);

    expect(c.req.param).toHaveBeenCalledWith('id');
    expect(res).toEqual({
      data: {
        status: 'success',
        data: { id: 1, title: 'Test', description: 'Desc', map: 'Map', createdAt: now, updatedAt: now },
      },
      status: 200,
    });
  });

  it('should return 404 if stratmap not found', async () => {
    const c = mockGetByIdContext(99);

    const res = await getStratmap(c);

    expect(c.req.param).toHaveBeenCalledWith('id');
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'Stratmap not found',
      },
      status: 404,
    });
  });
});

//Update stratmap
const mockUpdateContext = (id: number, body: Partial<Stratmap>) => {
  return {
    req: {
      param: jest.fn().mockReturnValue(String(id)),
      json: jest.fn<() => Promise<Partial<Stratmap>>>().mockResolvedValue(body),
    },
    json: jest.fn((data, status = 200) => ({ data, status })),
  } as unknown as Context;
};

describe('updateStratmap', () => {
  beforeEach(() => {
    stratmaps.length = 0;
  });

  it('should update a stratmap and return 200', async () => {
    const now = new Date();
    stratmaps.push({ id: 1, title: 'Original', description: 'Original Desc', map: 'Original Map', createdAt: now, updatedAt: now });

    const body = { title: 'Updated Title' };
    const c = mockUpdateContext(1, body);

    const res = await updateStratmap(c);

    expect(c.req.param).toHaveBeenCalledWith('id');
    expect(c.req.json).toHaveBeenCalled();
    expect(stratmaps[0]).toMatchObject({
      id: 1,
      title: 'Updated Title',
      description: 'Original Desc',
      map: 'Original Map',
    });
    expect(stratmaps[0].createdAt).toEqual(now);
    expect(stratmaps[0].updatedAt).toBeInstanceOf(Date);
    expect(stratmaps[0].updatedAt.getTime()).toBeGreaterThanOrEqual(now.getTime());
    expect((res as any).data.status).toBe('success');
    expect((res as any).data.data).toMatchObject({
      id: 1,
      title: 'Updated Title',
      description: 'Original Desc',
      map: 'Original Map',
    });
    expect(res.status).toBe(200);
  });

  it('should return 404 if stratmap not found', async () => {
    const c = mockUpdateContext(99, { title: 'Ghost' });

    const res = await updateStratmap(c);

    expect(c.req.param).toHaveBeenCalledWith('id');
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'Stratmap not found',
      },
      status: 404,
    });
  });
});

