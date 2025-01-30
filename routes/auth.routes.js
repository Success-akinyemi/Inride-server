import express from 'express'
import * as controllers from '../controllers/auth.controllers.js'
import { AuthenticateUser } from '../middlewares/auth.js'
const router = express.Router()

//POST
router.post('/verifyOtp', controllers.verifyOtp)
router.post('/signout', AuthenticateUser, controllers.signout)



//GET

export default router