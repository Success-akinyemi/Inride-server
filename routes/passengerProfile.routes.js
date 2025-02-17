import express from 'express'
import * as controllers from '../controllers/passengerProfile.controllers.js'
import { AuthenticateAdmin, AuthenticatePassenger, UserRole, VerifyAccount, VerifyAdminAccount } from '../middlewares/auth.js'
import { uploadImages } from '../middlewares/multer.js'

const router = express.Router()

//POST
router.post('/updateProfile', uploadImages, AuthenticatePassenger, VerifyAccount, controllers.updateProfile)
router.post('/fundWallet', AuthenticatePassenger, VerifyAccount, controllers.fundWallet)


//GET
router.get('/getProfile', AuthenticatePassenger, VerifyAccount, controllers.getProfile)
router.get('/getNotifications', AuthenticatePassenger, VerifyAccount, controllers.getNotifications)


//ADMIN
router.use(AuthenticateAdmin, VerifyAdminAccount, UserRole(['passenger', 'admin', 'superadmin']));
//POST
router.post('/blockPassenger', controllers.blockPassenger)
router.post('/unBlockPassenger', controllers.unBlockPassenger)

//GET
router.get('/getPassengers', controllers.getPassengers)
router.get('/getAPassenger/:passengerId', controllers.getAPassenger)

export default router