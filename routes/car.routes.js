import express from 'express'
import * as controllers from '../controllers/car.controllers.js'
import { AuthenticateDriver } from '../middlewares/auth.js'
import { uploadImages } from '../middlewares/multer.js';

const router = express.Router()

//POST
router.post('/newCar', uploadImages, AuthenticateDriver, controllers.newCar);
router.post('/updateCarDetails', AuthenticateDriver, controllers.updateCarDetails);
router.post('/activateCar', AuthenticateDriver, controllers.activateCar);
router.post('/deleteCarDetails', AuthenticateDriver, controllers.deleteCarDetails);


//GET
router.get('/getCarDetail', AuthenticateDriver, controllers.getCarDetail);
router.get('/getCarDetails', AuthenticateDriver, controllers.getCarDetails);


export default router