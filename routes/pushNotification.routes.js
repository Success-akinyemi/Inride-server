import express from 'express'
import * as controllers from '../controllers/pushNotification.controllers.js'
import { AuthenticateUser, VerifyAccount } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/saveSubscription', AuthenticateUser, VerifyAccount, controllers.saveSubscription)
router.post('/subscribeEmail', AuthenticateUser, VerifyAccount, controllers.subscribeEmail)


//GET ROUTES
//router.get('/sendNotification', controllers.sendNotification)
router.get('/getNotification', controllers.getNotification)


//PUT ROUTES

export default router
