import { jest } from '@jest/globals';
import { deleteUser, users } from '../../controllers/user.js';
import type { Context } from 'hono';
import type { User } from '../../types.js';

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