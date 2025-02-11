
import express from 'express'
import * as controllers from '../controllers/rideChats.controllers.js'
import { AuthenticateAdmin, VerifyAdminAccount } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.get('/sendChatWarning', AuthenticateAdmin, VerifyAdminAccount, controllers.sendChatWarning)


//GET
router.get('/getChats', AuthenticateAdmin, VerifyAdminAccount, controllers.getChats)
router.get('/getAchat/:rideId', AuthenticateAdmin, VerifyAdminAccount, controllers.getAchat)





export default router