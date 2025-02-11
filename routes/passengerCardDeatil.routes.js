import express from 'express'
import * as controllers from '../controllers/passengerCardDeatil.controllers.js'
import { AuthenticatePassenger, VerifyAccount } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/newCardDetails', AuthenticatePassenger, VerifyAccount, controllers.newCardDetails)
router.post('/updateCardDetails', AuthenticatePassenger, VerifyAccount, controllers.updateCardDetails)
router.post('/deleteCardDetails', AuthenticatePassenger, VerifyAccount, controllers.deleteCardDetails)

//GET
router.get('/getCardDetails', AuthenticatePassenger, VerifyAccount, controllers.getCardDetails)
router.get('/getCardDetail/:cardId', AuthenticatePassenger, VerifyAccount, controllers.getCardDetail)
router.get('/getPaymentCards', AuthenticatePassenger, VerifyAccount, controllers.getPaymentCards)


export default router