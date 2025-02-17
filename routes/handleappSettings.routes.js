import express from 'express'
import * as controllers from '../controllers/appSettings.controllers.js'
import { AuthenticateAdmin, UserRole, VerifyAdminAccount } from '../middlewares/auth.js'

const router = express.Router()



//GET
router.get('/getAppSettings',  controllers.getAppSettings)
router.get('/getFaqs',  controllers.getFaqs)
router.get('/getAbout',  controllers.getAbout)


//ADMIN
router.use(AuthenticateAdmin, VerifyAdminAccount, UserRole(['admin', 'superadmin']));
//POST
router.post('/updateAppSettings', UserRole(['superadmin']), controllers.handleappSettings)
router.post('/createFaq', controllers.createFaq)
router.post('/updateFaq', controllers.updateFaq)
router.post('/deleteFaq/:faqId', controllers.deleteFaq)
router.post('/updateAbout', controllers.updateAbout)


export default router