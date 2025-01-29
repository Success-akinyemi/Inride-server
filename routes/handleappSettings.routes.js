import express from 'express'
import * as controllers from '../controllers/appSettings.controllers.js'

const router = express.Router()

router.post('/updateAppSettings', controllers.handleappSettings)


//GET
router.post('/getAppSettings', controllers.getAppSettings)

export default router