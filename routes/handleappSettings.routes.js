import express from 'express'
import * as controllers from '../controllers/appSettings.controllers.js'

const router = express.Router()

router.post('/updateAppSettings', controllers.handleappSettings)
router.post('/createFaq', controllers.createFaq)
router.post('/updateFaq', controllers.updateFaq)
router.post('/deleteFaq/:faqId', controllers.deleteFaq)
router.post('/updateAbout', controllers.updateAbout)



//GET
router.post('/getAppSettings', controllers.getAppSettings)
router.post('/getFaqs', controllers.getFaqs)
router.post('/getAbout', controllers.getAbout)


export default router