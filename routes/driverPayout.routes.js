import express from 'express'
import * as controllers from '../controllers/driverPayout.controllers.js'
import { AuthenticateAdmin, AuthenticateDriver, VerifyAccount, VerifyAdminAccount } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/payoutRequest', AuthenticateDriver, VerifyAccount, controllers.payoutRequest)
router.post('/approvePayout', AuthenticateAdmin, VerifyAdminAccount, controllers.approvePayout)
router.post('/rejectPayout', AuthenticateAdmin, VerifyAdminAccount, controllers.rejectPayout)

//GET
router.get('/getPayouts', AuthenticateDriver, VerifyAccount, controllers.getPayouts)

router.get('/getAllPayouts', AuthenticateAdmin, VerifyAdminAccount, controllers.getAllPayouts)
router.get('/getAPayout/:payoutId', AuthenticateAdmin, VerifyAdminAccount, controllers.getAPayout)

export default router