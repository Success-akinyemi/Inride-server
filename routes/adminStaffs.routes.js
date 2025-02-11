import express from 'express'
import * as controllers from '../controllers/adminStaffs.controllers.js'
import { AuthenticateAdmin, VerifyAdminAccount } from '../middlewares/auth.js';
import { uploadImages } from '../middlewares/multer.js';

const router = express.Router()

//POST
router.post('/del', controllers.dele);
router.post('/updateProfile', AuthenticateAdmin, VerifyAdminAccount, uploadImages, VerifyAdminAccount, controllers.updateProfile);
router.post('/updatePassword', AuthenticateAdmin, VerifyAdminAccount, VerifyAdminAccount, controllers.updatePassword);




//GET
router.get('/getAllStaffs', controllers.getAllStaffs);
router.get('/getProfile', AuthenticateAdmin, VerifyAdminAccount, controllers.getProfile);
router.get('/getAStaff/:adminId', AuthenticateAdmin, VerifyAdminAccount, controllers.getAStaff);






export default router