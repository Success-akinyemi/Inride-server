import express from 'express'
import * as controllers from '../controllers/appSettings.controllers.js'

const router = express.Router()

router.post('/updateAppSettings', controllers.handleappSettings)
router.post('/createFaq', controllers.createFaq)
router.post('/updateFaq', controllers.updateFaq)
router.post('/deleteFaq/:faqId', controllers.deleteFaq)
router.post('/updateAbout', controllers.updateAbout)



//GET
router.get('/getAppSettings', controllers.getAppSettings)
router.get('/getFaqs', controllers.getFaqs)
router.get('/getAbout', controllers.getAbout)


export default router