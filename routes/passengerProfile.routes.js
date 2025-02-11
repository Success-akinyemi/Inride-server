import express from 'express'
import * as controllers from '../controllers/passengerProfile.controllers.js'
import { AuthenticateAdmin, AuthenticatePassenger } from '../middlewares/auth.js'
import { uploadImages } from '../middlewares/multer.js'

const router = express.Router()

//POST
router.post('/updateProfile', uploadImages, AuthenticatePassenger, controllers.updateProfile)
router.get('/blockPassenger', AuthenticateAdmin, controllers.blockPassenger)
router.get('/unBlockPassenger', AuthenticateAdmin, controllers.unBlockPassenger)


//GET
router.get('/getProfile', AuthenticatePassenger, controllers.getProfile)

router.get('/getPassengers', AuthenticateAdmin, controllers.getPassengers)
router.get('/getAPassenger/:passengerId', AuthenticateAdmin, controllers.getAPassenger)

export default router