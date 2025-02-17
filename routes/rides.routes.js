import express from 'express'
import * as controllers from '../controllers/rides.controllers.js'
import { AuthenticateAdmin, AuthenticateDriver, AuthenticatePassenger, AuthenticateUser, UserRole, VerifyAccount, VerifyAdminAccount } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/afterRideFeedBack', AuthenticateUser, VerifyAccount, controllers.afterRideFeedBack)
router.post('/reportForgotItem', AuthenticateUser, VerifyAccount, controllers.reportForgotItem)
router.post('/saftey', AuthenticateUser, VerifyAccount, controllers.saftey)



//GET
router.get('/getDriverRides', AuthenticateDriver, VerifyAccount, controllers.getDriverRides)
router.get('/getDriverRide/:rideId', AuthenticateDriver, VerifyAccount, controllers.getDriverRide)
router.get('/getUpcomingDriverRides', AuthenticateDriver, VerifyAccount, controllers.getUpcomingDriverRides)
router.get('/getLastSevenDays', AuthenticateDriver, VerifyAccount, controllers.getLastSevenDays)
router.get('/getPassengerRides', AuthenticatePassenger, VerifyAccount, controllers.getPassengerRides)
router.get('/getUpcomingPassengerRides', AuthenticatePassenger, VerifyAccount, controllers.getUpcomingPassengerRides)
router.get('/getPassengerRide/:rideId', AuthenticatePassenger, VerifyAccount, controllers.getPassengerRide)

//ADMIN
router.use(AuthenticateAdmin, VerifyAdminAccount, UserRole(['passenger', 'driver', 'admin', 'superadmin']));

router.get('/getRides', controllers.getRides)
router.get('/getARide/:rideId', controllers.getARide)
router.get('/passengerRides/:passengerId', controllers.getPassengerRides)
router.get('/driverRides/:driverId', controllers.getDriverRides)
router.get('/getRideStats/:stats', controllers.getRideStats)
router.get('/getTransactions', controllers.getTransactions)






export default router