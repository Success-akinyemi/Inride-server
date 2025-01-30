import express from 'express'
import * as controllers from '../controllers/driverAuth.controllers.js'
import { uploadImages } from '../middlewares/multer.js'
const router = express.Router()

// Custom error handler for Multer
const multerErrorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        console.error(`Unexpected field: ${err.field}`);
        return res.status(400).json({ error: `Unexpected field: ${err.field}` });
      }
    }
    console.log('MULTER  ERROR', err)
    next(err); // Pass to the next error handler if not a Multer error
  };
  
//POST
router.post('/registerWithPassengerAccount', controllers.registerWithPassengerAccount)
router.post('/verifyPassengerToDriverAccountOtp', controllers.verifyPassengerToDriverAccountOtp)
router.post('/completeDriverRegistration', uploadImages, multerErrorHandler, controllers.completeDriverRegistration)
router.post('/registerNewDriver', controllers.registerNewDriver)
router.post('/resendOtp', controllers.resendOtp)
router.post('/verifyPersonalDetails', controllers.verifyPersonalDetails)
router.post('/verifySSN', controllers.verifySSN)
router.post('/completeNewDriverRegistration', uploadImages, multerErrorHandler, controllers.completeNewDriverRegistration)

router.post('/signin', controllers.signin)
router.post('/verifyLoginOtp', controllers.verifyLoginOtp)
router.post('/verifyToken', controllers.verifyToken)


router.post('/del', controllers.del)
router.post('/createnew', controllers.createnew)



//GET

export default router