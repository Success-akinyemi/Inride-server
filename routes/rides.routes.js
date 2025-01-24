import express from 'express'
import * as controllers from '../controllers/rides.controllers.js'
import { AuthenticateDriver } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/afterRideFeedBack', controllers.afterRideFeedBack)


//GET
router.get('/getDriverRides', AuthenticateDriver, controllers.getDriverRides)
router.get('/getLastSevenDays', AuthenticateDriver, controllers.getLastSevenDays)


export default router