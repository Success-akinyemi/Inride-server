
import express from 'express'
import * as controllers from '../controllers/stats.controllers.js'
import { AuthenticateAdmin, VerifyAdminAccount } from '../middlewares/auth.js'

const router = express.Router()

//GET
router.get('/activeUsers/:stats', AuthenticateAdmin, VerifyAdminAccount, controllers.activeUsers)
router.get('/getTopLocations', AuthenticateAdmin, VerifyAdminAccount, controllers.getTopLocations)
router.get('/salesReport/:stats', AuthenticateAdmin, VerifyAdminAccount, controllers.salesReport)






export default router