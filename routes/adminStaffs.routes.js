import express from 'express'
import * as controllers from '../controllers/adminStaffs.controllers.js'
import { AuthenticateAdmin, UserRole, VerifyAdminAccount } from '../middlewares/auth.js';
import { uploadImages } from '../middlewares/multer.js';

const router = express.Router()

//POST
router.post('/del', controllers.dele);
router.post('/updateProfile', AuthenticateAdmin, VerifyAdminAccount, uploadImages, controllers.updateProfile);
router.post('/updatePassword', AuthenticateAdmin, VerifyAdminAccount, VerifyAdminAccount, controllers.updatePassword);


//GET
router.get('/getProfile', AuthenticateAdmin, VerifyAdminAccount, controllers.getProfile);


//ADMIN
router.use(AuthenticateAdmin, VerifyAdminAccount, UserRole(['staff', 'admin', 'superadmin']));
//POST
router.post('/activateStaff', controllers.activateStaff);
router.post('/sackStaff', UserRole(['superadmin']), controllers.sackStaff);
router.post('/deactivateStaff', UserRole(['admin', 'superadmin']), controllers.deactivateStaff);
router.post('/updateStaffAccount', UserRole(['admin', 'superadmin']), controllers.updateStaffAccount);

//GET
router.get('/getAllStaffs', controllers.getAllStaffs);
router.get('/getAStaff/:adminId', controllers.getAStaff);






export default router