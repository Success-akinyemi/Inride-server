
import express from 'express'
import * as controllers from '../controllers/checkr.controllers.js'

const router = express.Router()

//POST
router.post('/checkrWebHook', controllers.checkrWebHook)
router.post('/authenticateCheckr', controllers.authenticateCheckr)






export default router