
import express from 'express'
import * as controllers from '../controllers/stripeWebhook.controllers.js'

const router = express.Router()

//GET
router.post('/stripeWebHook', controllers.stripeWebHook)





export default router