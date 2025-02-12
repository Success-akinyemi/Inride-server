import express from 'express'
import * as controllers from '../controllers/adminStaffs.controllers.js'
import { AuthenticateAdmin, VerifyAdminAccount } from '../middlewares/auth.js';
import { uploadImages } from '../middlewares/multer.js';

const router = express.Router()

//POST
router.post('/del', controllers.dele);
router.post('/updateProfile', AuthenticateAdmin, VerifyAdminAccount, uploadImages, VerifyAdminAccount, controllers.updateProfile);
router.post('/updatePassword', AuthenticateAdmin, VerifyAdminAccount, VerifyAdminAccount, controllers.updatePassword);
router.post('/activateStaff', AuthenticateAdmin, VerifyAdminAccount, VerifyAdminAccount, controllers.activateStaff);
router.post('/sackStaff', AuthenticateAdmin, VerifyAdminAccount, VerifyAdminAccount, controllers.sackStaff);
router.post('/deactivateStaff', AuthenticateAdmin, VerifyAdminAccount, VerifyAdminAccount, controllers.deactivateStaff);





//GET
router.get('/getAllStaffs', controllers.getAllStaffs);
router.get('/getProfile', AuthenticateAdmin, VerifyAdminAccount, controllers.getProfile);
router.get('/getAStaff/:adminId', AuthenticateAdmin, VerifyAdminAccount, controllers.getAStaff);






export default router