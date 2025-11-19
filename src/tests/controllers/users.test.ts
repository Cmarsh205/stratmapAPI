import { jest } from '@jest/globals';
import { createUser, deleteUser, getUsers, users, getUserById, updateUser } from '../../controllers/user.js';
import type { Context } from 'hono';
import type { User } from '../../types.js';

//Create User
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

  it('should not create user and should return 400 if no email', async () => {
    const body = { name: '' } as any; 
  
    const c = mockContext(body);
  
    const res = await createUser(c);
  
    expect(c.req.json).toHaveBeenCalled();
    expect(users.length).toBe(0); 
    expect(res).toEqual({
      data: {
        status: 'fail',
        message: 'Name and email are required',
      },
      status: 400,
    });
  });
});

//Delete User
const mockDeleteContext = (id: number) => {
  return {
    req: {
      param: jest.fn().mockReturnValue(String(id)),
    },
    json: jest.fn((data, status) => ({ data, status })),
  } as unknown as Context;
};
 
describe('deleteUser', () => {
  beforeEach(() => {
    users.length = 0;
  });

  it('should delete a user and return 200', async () => {
    users.push({ id: 1, name: 'Tom', email: 'tom@mail.com' });

    const c = mockDeleteContext(1);

    const res = await deleteUser(c);

    expect(c.req.param).toHaveBeenCalledWith('id');
    expect(users.length).toBe(0);
    expect(res).toEqual({
      data: {
        status: 'success',
        message: 'User 1 deleted',
      },
      status: 200,
    });
  });

  it('should return 404 if user not found', async () => {
    const c = mockDeleteContext(99);

    const res = await deleteUser(c);

    expect(c.req.param).toHaveBeenCalledWith('id');
    expect(res).toEqual({
      data: {
        status: 'fail',
        message: 'User not found',
      },
      status: 404,
    });
  });
});

//Get all
const mockGetAllContext = () => {
  return {
    json: jest.fn((data, status) => ({ data, status })),
  } as unknown as Context
}

describe('getUsers', () => {
  beforeEach(() => {
    users.length = 0
  })

  it('should return an empty list when no users exist', async () => {
    const c = mockGetAllContext()

    const res = await getUsers(c)

    expect(res).toEqual({
      data: {
        status: 'success',
        data: [],
      },
      status: 200,
    })
  })

  it('should return all users', async () => {
    users.push(
      { id: 1, name: 'Tom', email: 'tom@mail.com' },
      { id: 2, name: 'Jane', email: 'jane@mail.com' }
    )

    const c = mockGetAllContext()

    const res = await getUsers(c)

    expect(res).toEqual({
      data: {
        status: 'success',
        data: [
          { id: 1, name: 'Tom', email: 'tom@mail.com' },
          { id: 2, name: 'Jane', email: 'jane@mail.com' },
        ],
      },
      status: 200,
    })
  })
})

//Get by ID
const mockGetByIdContext = (id: number) => {
  return {
    req: {
      param: jest.fn().mockReturnValue(String(id)),
    },
    json: jest.fn((data, status) => ({ data, status })),
  } as unknown as Context
}

describe('getUserById', () => {
  beforeEach(() => {
    users.length = 0
  })

  it('should return a user by ID', async () => {
    users.push({ id: 1, name: 'Tom', email: 'tom@mail.com' })

    const c = mockGetByIdContext(1)

    const res = await getUserById(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(res).toEqual({
      data: {
        status: 'success',
        data: { id: 1, name: 'Tom', email: 'tom@mail.com' },
      },
      status: 200,
    })
  })

  it('should return 404 if user not found', async () => {
    const c = mockGetByIdContext(99)

    const res = await getUserById(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'User not found',
      },
      status: 404,
    })
  })
})

//Update user
const mockUpdateContext = (id: number, body: Partial<User>) => {
  return {
    req: {
      param: jest.fn().mockReturnValue(String(id)),
      json: jest.fn<() => Promise<Partial<User>>>().mockResolvedValue(body),
    },
    json: jest.fn((data, status = 200) => ({ data, status })),
  } as unknown as Context
}

describe('updateUser', () => {
  beforeEach(() => {
    users.length = 0
  })

  it('should update a user and return 200', async () => {
    users.push({ id: 1, name: 'Tom', email: 'tom@mail.com' })

    const body = { name: 'Tommy' }
    const c = mockUpdateContext(1, body)

    const res = await updateUser(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(c.req.json).toHaveBeenCalled()
    expect(users[0]).toEqual({
      id: 1,
      name: 'Tommy',
      email: 'tom@mail.com',
    })
    expect(res).toEqual({
      data: {
        status: 'success',
        data: {
          id: 1,
          name: 'Tommy',
          email: 'tom@mail.com',
        },
      },
      status: 200,
    })
  })

  it('should return 404 if user not found', async () => {
    const c = mockUpdateContext(99, { name: 'Ghost' })

    const res = await updateUser(c)

    expect(c.req.param).toHaveBeenCalledWith('id')
    expect(res).toEqual({
      data: {
        status: 'error',
        message: 'User not found',
      },
      status: 404,
    })
  })
})