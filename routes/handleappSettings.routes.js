import express from 'express'
import * as controllers from '../controllers/appSettings.controllers.js'
import { AuthenticateAdmin, VerifyAdminAccount } from '../middlewares/auth.js'

const router = express.Router()

router.post('/updateAppSettings', AuthenticateAdmin, VerifyAdminAccount, controllers.handleappSettings)
router.post('/createFaq', AuthenticateAdmin, VerifyAdminAccount, controllers.createFaq)
router.post('/updateFaq', AuthenticateAdmin, VerifyAdminAccount, controllers.updateFaq)
router.post('/deleteFaq/:faqId', AuthenticateAdmin, VerifyAdminAccount, controllers.deleteFaq)
router.post('/updateAbout', AuthenticateAdmin, VerifyAdminAccount, controllers.updateAbout)



//GET
router.get('/getAppSettings',  controllers.getAppSettings)
router.get('/getFaqs',  controllers.getFaqs)
router.get('/getAbout',  controllers.getAbout)


export default router