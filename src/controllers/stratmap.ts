import type { Context } from 'hono'
import type { Stratmap } from '../types.js'

export let stratmaps: Stratmap[] = [
    { id: 1, title: 'Stratmap 1', description: 'Description 1', map: 'Map 1', createdAt: new Date(), updatedAt: new Date() }, 
    { id: 2, title: 'Stratmap 2', description: 'Description 2', map: 'Map 2', createdAt: new Date(), updatedAt: new Date() },
]

// GET 
export const getStratmaps = (c: Context) => {
    if (stratmaps.length === 0) {
        return c.json({ status: 'error', message: 'No stratmaps found' }, 404)
    }
    return c.json({ status: 'success', data: stratmaps }, 200)
}

// GET by ID
export const getStratmap = (c: Context) => {
    const id = Number(c.req.param('id'))
    const stratmap = stratmaps.find(stratmap => stratmap.id === id)
    if (!stratmap) return c.json({ status: 'error', message: 'Stratmap not found' }, 404)
    return c.json({ status: 'success', data: stratmap }, 200)
}

// POST 
export const createStratmap = async (c: Context) => {
    const body = await c.req.json<Stratmap>()
    if (!body.title || !body.description || !body.map) {
        return c.json({ status: 'error', message: 'Title, description, and map are required' }, 400)
    }
    const newStratmap = { ...body, id: stratmaps.length + 1, createdAt: new Date(), updatedAt: new Date() }
    stratmaps.push(newStratmap)
    return c.json({ status: 'success', data: newStratmap }, 201)
}

// PUT
export const updateStratmap = async (c: Context) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json<Partial<Stratmap>>()
    const index = stratmaps.findIndex(stratmap => stratmap.id === id)
    if (index === -1) return c.json({ status: 'error', message: 'Stratmap not found' }, 404)
    stratmaps[index] = { ...stratmaps[index], ...body, updatedAt: new Date() }
    return c.json({ status: 'success', data: stratmaps[index] }, 200)
}

// DELETE
export const deleteStratmap = (c: Context) => {
    const id = Number(c.req.param('id'))
    const exists = stratmaps.some((stratmap) => stratmap.id === id)
    
    if (!exists) {
        return c.json({ status: 'error', message: 'Stratmap not found' }, 404)
    }
    
    stratmaps = stratmaps.filter(stratmap => stratmap.id !== id)
    return c.json({ status: 'success', message: `Stratmap ${id} deleted` }, 200)
}