import express from 'express'
import * as controllers from '../controllers/pushNotification.controllers.js'

const router = express.Router()

//POST
router.post('/saveSubscription', controllers.saveSubscription)

//GET ROUTES
//router.get('/sendNotification', controllers.sendNotification)

//PUT ROUTES

export default router
