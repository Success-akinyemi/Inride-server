import express from 'express'
import * as controllers from '../controllers/driverProfile.controllers.js'
import { AuthenticateDriver } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/updateProfile', AuthenticateDriver, controllers.updateProfile)


//GET

export default router