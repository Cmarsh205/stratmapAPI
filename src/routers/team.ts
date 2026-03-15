import { Hono } from 'hono'
import * as TeamController from '../controllers/team.js'

const router = new Hono()

router.get('/', TeamController.getTeams)
router.post('/', TeamController.createTeam)

router.get('/:id', TeamController.getTeam)
router.post('/:id/invite', TeamController.inviteToTeam)
router.put('/:id/members/:userId/role', TeamController.updateMemberRole)
router.delete('/:id/members/:userId', TeamController.removeMember)
router.delete('/:id', TeamController.deleteTeam)

export default router

