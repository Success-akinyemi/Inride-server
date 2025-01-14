import express from 'express'
import * as controllers from '../controllers/driverAuth.controllers.js'
import { uploadImages } from '../middlewares/multer.js'
const router = express.Router()

//POST
router.post('/registerWithPassengerAccount', controllers.registerWithPassengerAccount)
router.post('/completeDriverRegistration', uploadImages, controllers.completeDriverRegistration)
router.post('/registerNewDriver', controllers.registerNewDriver)
router.post('/resendOtp', controllers.resendOtp)
router.post('/verifyPersonalDetails', controllers.verifyPersonalDetails)
router.post('/verifySSN', controllers.verifySSN)
router.post('/completeNewDriverRegistration', uploadImages, controllers.completeNewDriverRegistration)

router.post('/signin', controllers.signin)
router.post('/verifyLoginOtp', controllers.verifyLoginOtp)
router.post('/verifyToken', controllers.verifyToken)


router.post('/del', controllers.del)
router.post('/createnew', controllers.createnew)



//GET

export default router