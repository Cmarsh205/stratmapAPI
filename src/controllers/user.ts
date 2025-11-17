import type { Context } from 'hono'
import type { User } from '../types.js'

export let users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@mail.com' },
  { id: 2, name: 'Bob', email: 'bob@mail.com' },
]

// GET 
export const getUsers = (c: Context) => {
  return c.json({ status: 'success', data: users })
}

// GET by ID
export const getUser = (c: Context) => {
  const id = Number(c.req.param('id'))
  const user = users.find(u => u.id === id)
  if (!user) return c.json({ status: 'error', message: 'User not found' }, 404)
  return c.json({ status: 'success', data: user })
}

// POST 
export const createUser = async (c: Context) => {
  const body = await c.req.json<User>()

  if (!body.name || !body.email) {
    return c.json(
      {
        status: 'fail',
        message: 'Name and email are required',
      },
      400
    );
  }

  const newUser = { ...body, id: users.length + 1 }
  users.push(newUser)
  return c.json({ status: 'success', data: newUser }, 201)
}

// PUT 
export const updateUser = async (c: Context) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<Partial<User>>()
  const index = users.findIndex(u => u.id === id)
  if (index === -1) return c.json({ status: 'error', message: 'User not found' }, 404)

  users[index] = { ...users[index], ...body }
  return c.json({ status: 'success', data: users[index] })
}

// DELETE 
export const deleteUser = (c: Context) => {
  const id = Number(c.req.param('id'));
  const exists = users.some((u) => u.id === id);

  if (!exists) {
    return c.json(
      { status: 'fail', message: 'User not found' },
      404
    );
  }

  const remaining = users.filter((u) => u.id !== id);
  users.length = 0;
  users.push(...remaining);

  return c.json(
    { status: 'success', message: `User ${id} deleted` },
    200
  );
};