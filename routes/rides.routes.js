import express from 'express'
import * as controllers from '../controllers/rides.controllers.js'
import { AuthenticateDriver, AuthenticatePassenger, AuthenticateUser } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/afterRideFeedBack', AuthenticateUser, controllers.afterRideFeedBack)
router.post('/reportForgotItem', controllers.reportForgotItem)


//GET
router.get('/getDriverRides', AuthenticateDriver, controllers.getDriverRides)
router.get('/getDriverRide', AuthenticateDriver, controllers.getDriverRide)
router.get('/getLastSevenDays', AuthenticateDriver, controllers.getLastSevenDays)
router.get('/getPassengerRides', AuthenticatePassenger, controllers.getPassengerRides)
router.get('/getPassengerRide', AuthenticatePassenger, controllers.getPassengerRide)


export default router