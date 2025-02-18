import express from 'express'
import * as controllers from '../controllers/driverPayout.controllers.js'
import { AuthenticateAdmin, AuthenticateDriver, UserRole, VerifyAccount, VerifyAdminAccount } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/payoutRequest', AuthenticateDriver, VerifyAccount, controllers.payoutRequest)

//GET
router.get('/getPayouts', AuthenticateDriver, VerifyAccount, controllers.getPayouts)

//ADMIN
router.use(AuthenticateAdmin, VerifyAdminAccount, UserRole(['payout', 'admin', 'superadmin']));
//POST
router.post('/approvePayout', controllers.approvePayout)
router.post('/rejectPayout', controllers.rejectPayout)

router.get('/getAllPayouts', controllers.getAllPayouts)
router.get('/getAPayout/:payoutId', controllers.getAPayout)
router.get('/payoutStats/:stats', controllers.payoutStats);

export default router