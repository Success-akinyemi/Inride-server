
import express from 'express'
import * as controllers from '../controllers/rideChats.controllers.js'
import { AuthenticateAdmin, UserRole, VerifyAdminAccount } from '../middlewares/auth.js'

const router = express.Router()

router.use(AuthenticateAdmin, VerifyAdminAccount, UserRole(['passenger', 'driver', 'admin', 'superadmin']));
//POST
router.post('/sendChatWarning', controllers.sendChatWarning)


//GET
router.get('/getChats', controllers.getChats)
router.get('/getAchat/:rideId', controllers.getAchat)





export default router