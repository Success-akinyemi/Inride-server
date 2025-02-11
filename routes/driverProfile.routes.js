import express from 'express'
import * as controllers from '../controllers/driverProfile.controllers.js'
import { AuthenticateAdmin, AuthenticateDriver } from '../middlewares/auth.js'
import { uploadImages } from '../middlewares/multer.js'

const router = express.Router()

//POST
router.post('/updateProfile', uploadImages, AuthenticateDriver, controllers.updateProfile)

router.get('/blockDriver', AuthenticateAdmin, controllers.blockDriver)
router.get('/unBlockDriver', AuthenticateAdmin, controllers.unBlockDriver)


//GET
router.get('/getProfile', AuthenticateDriver, controllers.getProfile)

router.get('/getDrivers', AuthenticateAdmin, controllers.getDrivers)
router.get('/getADriver/:driverId', AuthenticateAdmin, controllers.getADriver)

export default router