
import express from 'express'
import * as controllers from '../controllers/stripeWebhook.controllers.js'

const router = express.Router()

//GET
router.post('/stripeWebHook', express.raw({ type: 'application/json' }), controllers.stripeWebHook)





export default router