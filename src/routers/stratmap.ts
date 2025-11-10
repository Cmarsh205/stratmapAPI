import { Hono } from 'hono'
import * as StratmapController from '../controllers/stratmap.js'

const router = new Hono()

router.get('/', StratmapController.getStratmaps)
router.get('/:id', StratmapController.getStratmap)
router.post('/', StratmapController.createStratmap)
router.put('/:id', StratmapController.updateStratmap)
router.delete('/:id', StratmapController.deleteStratmap)

export default router