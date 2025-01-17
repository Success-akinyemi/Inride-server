import express from 'express';
import * as controllers from '../controllers/driver.controllers.js';
import { AuthenticateDriver } from '../middlewares/auth.js';

const router = express.Router();

//POST
router.post('/updateLocation', AuthenticateDriver, controllers.updateLocation);
router.post('/goOnline', AuthenticateDriver, controllers.goOnline);
router.post('/goOffline', AuthenticateDriver, controllers.goOffline);
router.post('/rideAccepted', AuthenticateDriver, controllers.rideAccepted);
router.post('/activateCar', AuthenticateDriver, controllers.activateCar);



export default router;
