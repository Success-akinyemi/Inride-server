import express from 'express'
import * as controllers from '../controllers/driverPayout.controllers.js'
import { AuthenticateDriver, VerifyAccount } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/payoutRequest', AuthenticateDriver, VerifyAccount, controllers.payoutRequest)

//GET
router.get('/getPayouts', AuthenticateDriver, VerifyAccount, controllers.getPayouts)


export default router