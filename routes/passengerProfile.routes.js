import express from 'express'
import * as controllers from '../controllers/passengerProfile.controllers.js'
import { AuthenticatePassenger } from '../middlewares/auth.js'
import { uploadImages } from '../middlewares/multer.js'

const router = express.Router()

//POST
router.post('/updateProfile', uploadImages, AuthenticatePassenger, controllers.updateProfile)


//GET

export default router