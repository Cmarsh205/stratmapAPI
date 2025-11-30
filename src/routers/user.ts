import { Hono } from 'hono'
import * as UserController from '../controllers/user.js'

const router = new Hono()

router.get('/', UserController.getUsers)
router.get('/:id', UserController.getUserById)
router.post('/', UserController.createUser)
router.put('/:id', UserController.updateUser)
router.delete('/:id', UserController.deleteUser)

export default router