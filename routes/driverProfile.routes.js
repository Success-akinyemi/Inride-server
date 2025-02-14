import express from 'express'
import * as controllers from '../controllers/driverProfile.controllers.js'
import { AuthenticateAdmin, AuthenticateDriver, VerifyAccount, VerifyAdminAccount } from '../middlewares/auth.js'
import { uploadImages } from '../middlewares/multer.js'

const router = express.Router()

//POST
router.post('/updateProfile', uploadImages, AuthenticateDriver, VerifyAccount, controllers.updateProfile)
router.post('/blockDriver', AuthenticateAdmin, VerifyAdminAccount, controllers.blockDriver)
router.post('/unBlockDriver', AuthenticateAdmin, VerifyAdminAccount, controllers.unBlockDriver)


//GET
router.get('/getProfile', AuthenticateDriver, VerifyAccount, controllers.getProfile)

router.get('/getDrivers', AuthenticateAdmin, VerifyAdminAccount, controllers.getDrivers)
router.get('/getADriver/:driverId', AuthenticateAdmin, VerifyAdminAccount, controllers.getADriver)

export default router