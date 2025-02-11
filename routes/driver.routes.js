import express from 'express';
import * as controllers from '../controllers/driver.controllers.js';
import { AuthenticateDriver, VerifyAccount } from '../middlewares/auth.js';

const router = express.Router();

//POST
router.post('/updateLocation', AuthenticateDriver, VerifyAccount, controllers.updateLocation);
router.post('/goOnline', AuthenticateDriver, VerifyAccount, controllers.goOnline);
router.post('/goOffline', AuthenticateDriver, VerifyAccount, controllers.goOffline);
router.post('/acceptRideRequest', AuthenticateDriver, VerifyAccount, controllers.acceptRideRequest);
router.post('/homeBreak', AuthenticateDriver, VerifyAccount, controllers.homeBreak);




export default router;
