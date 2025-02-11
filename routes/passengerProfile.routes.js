import express from 'express'
import * as controllers from '../controllers/passengerProfile.controllers.js'
import { AuthenticateAdmin, AuthenticatePassenger, VerifyAccount, VerifyAdminAccount } from '../middlewares/auth.js'
import { uploadImages } from '../middlewares/multer.js'

const router = express.Router()

//POST
router.post('/updateProfile', uploadImages, AuthenticatePassenger, VerifyAccount, controllers.updateProfile)
router.get('/blockPassenger', AuthenticateAdmin, VerifyAdminAccount, controllers.blockPassenger)
router.get('/unBlockPassenger', AuthenticateAdmin, VerifyAdminAccount, controllers.unBlockPassenger)


//GET
router.get('/getProfile', AuthenticatePassenger, VerifyAccount, controllers.getProfile)

router.get('/getPassengers', AuthenticateAdmin, VerifyAdminAccount, controllers.getPassengers)
router.get('/getAPassenger/:passengerId', AuthenticateAdmin, VerifyAdminAccount, controllers.getAPassenger)

export default router