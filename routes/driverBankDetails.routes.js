import express from 'express'
import * as controllers from '../controllers/driverBankDetails.controllers.js'
import { AuthenticateDriver } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/newBankDetails', AuthenticateDriver, controllers.newBankDetails)
router.post('/updateBankDetails', AuthenticateDriver, controllers.updateBankDetails)
router.post('/deleteBankDetails', AuthenticateDriver, controllers.deleteBankDetails)

//GET
router.get('/getBankDetails', AuthenticateDriver, controllers.getBankDetails)
router.get('/getBankDetail/:bankId', AuthenticateDriver, controllers.getBankDetail)


export default router