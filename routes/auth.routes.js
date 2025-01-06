import express from 'express'
import * as controllers from '../controllers/auth.controllers.js'
const router = express.Router()

//POST
router.post('/verifyOtp', controllers.verifyOtp)
router.post('/signout', controllers.signout)



//GET

export default router