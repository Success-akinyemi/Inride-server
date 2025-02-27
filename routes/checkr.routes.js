
import express from 'express'
import * as controllers from '../controllers/checkr.controllers.js'

const router = express.Router()

//GET
router.post('/checkrWebHook', controllers.checkrWebHook)





export default router