
import express from 'express'
import * as controllers from '../controllers/adminAuth.controllers.js'
import { AuthenticateAdmin } from '../middlewares/auth.js'

const router = express.Router()

//POST
//router.post('/createAccount', controllers.createAccount)
//router.post('/resendOtp', controllers.resendOtp)
//router.post('/verifyOtp', controllers.verifyOtp)
//router.post('/createPassword', controllers.createPassword)
router.post('/login', controllers.login)
router.post('/forgotPassword', controllers.forgotPassword)
router.post('/resetPassword/:resetToken', controllers.resetPassword)
router.post('/signout', AuthenticateAdmin, controllers.signout)

//GET
router.get('/verifyToken', controllers.verifyToken)




export default router