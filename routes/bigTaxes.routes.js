import express from 'express'
import * as controllers from '../controllers/bigTaxes.controllers.js'
import { AuthenticateAdmin, UserRole, VerifyAdminAccount } from '../middlewares/auth.js';

const router = express.Router()


//GET
router.get('/getAllBigTaxes', controllers.getAllBigTaxes);
router.get('/getABigTax/:taxId', controllers.getABigTax);


//ADMIN
router.use(AuthenticateAdmin, VerifyAdminAccount, UserRole(['bigtaxe', 'admin', 'superadmin']));
//POST
router.post('/newBigTaxes', controllers.newBigTaxes);
router.post('/updateBigTaxes', controllers.updateBigTaxes);
router.post('/deleteBigTaxes', controllers.deleteBigTaxes);



export default router