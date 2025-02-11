import express from 'express'
import * as controllers from '../controllers/driverBankDetails.controllers.js'
import { AuthenticateDriver, VerifyAccount } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/newBankDetails', AuthenticateDriver, VerifyAccount, controllers.newBankDetails)
router.post('/updateBankDetails', AuthenticateDriver, VerifyAccount, controllers.updateBankDetails)
router.post('/deleteBankDetails', AuthenticateDriver, VerifyAccount, controllers.deleteBankDetails)

//GET
router.get('/getBankDetails', AuthenticateDriver, VerifyAccount, controllers.getBankDetails)
router.get('/getBankDetail/:bankId', AuthenticateDriver, VerifyAccount, controllers.getBankDetail)


export default router