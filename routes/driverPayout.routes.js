import express from 'express'
import * as controllers from '../controllers/driverPayout.controllers.js'
import { AuthenticateDriver } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/payoutRequest', AuthenticateDriver, controllers.payoutRequest)

//GET
router.get('/getPayouts', AuthenticateDriver, controllers.getPayouts)


export default router