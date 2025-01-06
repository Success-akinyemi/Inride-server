import express from 'express'
import * as controllers from '../controllers/auth.controllers.js'
const router = express.Router()

//POST
router.post('/verifyOtp', controllers.verifyOtp)


//GET

export default router