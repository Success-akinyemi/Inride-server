import express from 'express'
import * as controllers from '../controllers/car.controllers.js'
import { AuthenticateAdmin, AuthenticateDriver, UserRole, VerifyAccount, VerifyAdminAccount } from '../middlewares/auth.js'
import { uploadImages } from '../middlewares/multer.js';

const router = express.Router()

//POST
router.post('/newCar', uploadImages, AuthenticateDriver, VerifyAccount, controllers.newCar);
router.post('/updateCarDetails', AuthenticateDriver, VerifyAccount, controllers.updateCarDetails);
router.post('/activateCar', AuthenticateDriver, VerifyAccount, controllers.activateCar);
router.post('/deleteCarDetails', AuthenticateDriver, VerifyAccount, controllers.deleteCarDetails);



//GET
router.get('/getCarDetail/:carId', AuthenticateDriver, VerifyAccount, controllers.getCarDetail);
router.get('/getCarDetails', AuthenticateDriver, VerifyAccount, controllers.getCarDetails);


//ADMIN
//POST
router.use(AuthenticateAdmin, VerifyAdminAccount, UserRole(['car', 'admin', 'superadmin']));
router.post('/blockCar', AuthenticateAdmin, VerifyAdminAccount, controllers.blockCar);
router.post('/unBlockCar', AuthenticateAdmin, VerifyAdminAccount, UserRole(['car']), controllers.unBlockCar);

//GET
router.get('/getAllCar', AuthenticateAdmin, VerifyAdminAccount, controllers.getAllCar);
router.get('/getACarDetail/:carId/:driverId', AuthenticateAdmin, VerifyAdminAccount, controllers.getCarDetail);
router.get('/getDriverCarDetails/:driverId', AuthenticateAdmin, VerifyAdminAccount, controllers.getCarDetails);
router.get('/carStats/:stats', AuthenticateAdmin, VerifyAdminAccount, controllers.carStats);





export default router