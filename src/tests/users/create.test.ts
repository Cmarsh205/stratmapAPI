import { jest } from '@jest/globals';
import { createUser, users } from '../../controllers/user.js';
import type { Context } from 'hono';
import type { User } from '../../types.js';

const mockContext = (jsonBody: Omit<User, 'id'>) => {
  return {
    req: {
      json: jest.fn<() => Promise<Omit<User, 'id'>>>().mockResolvedValue(jsonBody),
    },
    json: jest.fn((data, status) => ({ data, status })),
  } as unknown as Context;
};

describe('createUser', () => {
  beforeEach(() => {
    users.length = 0;
  });

  it('should create a new user and return 201 response', async () => {
    const body = { name: 'Tom', email: 'tom@mail.com' };

    const c = mockContext(body);

    const res = await createUser(c);

    expect(c.req.json).toHaveBeenCalled();
    expect(users.length).toBe(1);
    expect(users[0]).toEqual({ ...body, id: 1 });
    expect(res).toEqual({
      data: { status: 'success', data: { ...body, id: 1 } },
      status: 201,
    });
  });
});