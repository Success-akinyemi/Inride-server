import express from 'express'
import * as controllers from '../controllers/PassengerAuth.controllers.js'
import { uploadImages } from '../middlewares/multer.js'
import { AuthenticatePassenger } from '../middlewares/auth.js'
const router = express.Router()

//POST
router.post('/registerNumber', controllers.registerNumber)
router.post('/resendOtp', controllers.resendOtp)
router.post('/verifyPersonalDetails', controllers.verifyPersonalDetails)
router.post('/verifySSN', controllers.verifySSN)
router.post('/registerUser', uploadImages, controllers.registerUser)
router.post('/signin', controllers.signin)
router.post('/verifyLoginOtp', controllers.verifyLoginOtp)
router.post('/verifyToken', controllers.verifyToken)

router.post('/signupWithGoogle', controllers.signupWithGoogle)
router.post('/signinWithGoogle', controllers.signinWithGoogle)
router.post('/completeRegisterUser', AuthenticatePassenger, uploadImages, controllers.completeRegisterUser)


//router.post('/createnew', controllers.createnew)
router.post('/dele', controllers.dele)




//GET

export default router