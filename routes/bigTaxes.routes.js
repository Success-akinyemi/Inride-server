import express from 'express'
import * as controllers from '../controllers/bigTaxes.controllers.js'
import { AuthenticateAdmin, VerifyAdminAccount } from '../middlewares/auth.js';

const router = express.Router()

//POST
router.post('/newBigTaxes', AuthenticateAdmin, VerifyAdminAccount, controllers.newBigTaxes);
router.post('/updateBigTaxes', AuthenticateAdmin, VerifyAdminAccount, controllers.updateBigTaxes);
router.post('/deleteBigTaxes', AuthenticateAdmin, VerifyAdminAccount, controllers.deleteBigTaxes);


//GET
router.get('/getAllBigTaxes', controllers.getAllBigTaxes);
router.get('/getABigTax/:taxId', controllers.getABigTax);






export default router