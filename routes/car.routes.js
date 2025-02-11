import express from 'express'
import * as controllers from '../controllers/car.controllers.js'
import { AuthenticateAdmin, AuthenticateDriver } from '../middlewares/auth.js'
import { uploadImages } from '../middlewares/multer.js';

const router = express.Router()

//POST
router.post('/newCar', uploadImages, AuthenticateDriver, controllers.newCar);
router.post('/updateCarDetails', AuthenticateDriver, controllers.updateCarDetails);
router.post('/activateCar', AuthenticateDriver, controllers.activateCar);
router.post('/deleteCarDetails', AuthenticateDriver, controllers.deleteCarDetails);

router.post('/blockCar', AuthenticateAdmin, controllers.blockCar);
router.post('/unBlockCar', AuthenticateAdmin, controllers.unBlockCar);


//GET
router.get('/getCarDetail/:carId', AuthenticateDriver, controllers.getCarDetail);
router.get('/getCarDetails', AuthenticateDriver, controllers.getCarDetails);

router.get('/getAllCar', AuthenticateAdmin, controllers.getAllCar);
router.get('/getACarDetail/:carId/:driverId', AuthenticateAdmin, controllers.getCarDetail);
router.get('/getDriverCarDetails/:driverId', AuthenticateAdmin, controllers.getCarDetail);




export default router