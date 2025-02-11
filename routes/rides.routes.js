import express from 'express'
import * as controllers from '../controllers/rides.controllers.js'
import { AuthenticateAdmin, AuthenticateDriver, AuthenticatePassenger, AuthenticateUser } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/afterRideFeedBack', AuthenticateUser, controllers.afterRideFeedBack)
router.post('/reportForgotItem', controllers.reportForgotItem)
router.post('/saftey', AuthenticateUser, controllers.saftey)



//GET
router.get('/getDriverRides', AuthenticateDriver, controllers.getDriverRides)
router.get('/getDriverRide/:rideId', AuthenticateDriver, controllers.getDriverRide)
router.get('/getUpcomingDriverRides', AuthenticateDriver, controllers.getUpcomingDriverRides)
router.get('/getLastSevenDays', AuthenticateDriver, controllers.getLastSevenDays)
router.get('/getPassengerRides', AuthenticatePassenger, controllers.getPassengerRides)
router.get('/getUpcomingPassengerRides', AuthenticatePassenger, controllers.getUpcomingPassengerRides)
router.get('/getPassengerRide/:rideId', AuthenticatePassenger, controllers.getPassengerRide)

router.get('/getRides', AuthenticateAdmin, controllers.getARide)
router.get('/getARide/:rideId', AuthenticateAdmin, controllers.getARide)
router.get('/passengerRides/:passengerId', AuthenticateAdmin, controllers.getPassengerRides)
router.get('/driverRides/:driverId', AuthenticateAdmin, controllers.getDriverRides)




export default router