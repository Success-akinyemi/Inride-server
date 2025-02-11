
import express from 'express'
import * as controllers from '../controllers/stats.controllers.js'
import { AuthenticateAdmin } from '../middlewares/auth.js'

const router = express.Router()

//GET
router.get('/activeUsers', AuthenticateAdmin, controllers.activeUsers)
router.get('/getTopLocations', AuthenticateAdmin, controllers.getTopLocations)





export default router