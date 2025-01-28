import express from 'express'
import * as controllers from '../controllers/passengerCardDeatil.controllers.js'
import { AuthenticatePassenger } from '../middlewares/auth.js'

const router = express.Router()

//POST
router.post('/newCardDetails', AuthenticatePassenger, controllers.newCardDetails)
router.post('/updateCardDetails', AuthenticatePassenger, controllers.updateCardDetails)
router.post('/deleteCardDetails', AuthenticatePassenger, controllers.deleteCardDetails)

//GET
router.get('/getCardDetails', AuthenticatePassenger, controllers.getCardDetails)
router.get('/getCardDetail/:cardId', AuthenticatePassenger, controllers.getCardDetail)
router.get('/getPaymentCards', AuthenticatePassenger, controllers.getPaymentCards)


export default router