import express from 'express'
import * as controllers from '../controllers/rides.controllers.js'
import { AuthenticateAdmin, AuthenticateDriver, AuthenticatePassenger, AuthenticateUser, VerifyAccount, VerifyAdminAccount } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/afterRideFeedBack', AuthenticateUser, VerifyAccount, controllers.afterRideFeedBack)
router.post('/reportForgotItem', AuthenticateUser, controllers.reportForgotItem)
router.post('/saftey', AuthenticateUser, VerifyAccount, controllers.saftey)



//GET
router.get('/getDriverRides', AuthenticateDriver, VerifyAccount, controllers.getDriverRides)
router.get('/getDriverRide/:rideId', AuthenticateDriver, VerifyAccount, controllers.getDriverRide)
router.get('/getUpcomingDriverRides', AuthenticateDriver, VerifyAccount, controllers.getUpcomingDriverRides)
router.get('/getLastSevenDays', AuthenticateDriver, VerifyAccount, controllers.getLastSevenDays)
router.get('/getPassengerRides', AuthenticatePassenger, VerifyAccount, controllers.getPassengerRides)
router.get('/getUpcomingPassengerRides', AuthenticatePassenger, VerifyAccount, controllers.getUpcomingPassengerRides)
router.get('/getPassengerRide/:rideId', AuthenticatePassenger, VerifyAccount, controllers.getPassengerRide)

router.get('/getRides', AuthenticateAdmin, VerifyAdminAccount, controllers.getARide)
router.get('/getARide/:rideId', AuthenticateAdmin, VerifyAdminAccount, controllers.getARide)
router.get('/passengerRides/:passengerId', AuthenticateAdmin, VerifyAdminAccount, controllers.getPassengerRides)
router.get('/driverRides/:driverId', AuthenticateAdmin, VerifyAdminAccount, controllers.getDriverRides)
router.get('/getRideStats', AuthenticateAdmin, VerifyAdminAccount, controllers.getRideStats)
router.get('/getTransactions', AuthenticateAdmin, VerifyAdminAccount, controllers.getTransactions)






export default router