import { decrypt, encrypt, sendResponse } from "../middlewares/utils.js"
import CardDetailModel from "../model/CardDetails.js"
import NotificationModel from "../model/Notifications.js";

export async function newCardDetails(req, res) {
    const { cardNumber, cardHolderName, expiryDate, cvv, cardType } = req.body;
    const { passengerId } = req.user;

    if (!cardNumber) {
        sendResponse(res, 400, false, 'Card number is required');
        return;
    }
    // Remove spaces from the card number
    const sanitizedCardNumber = cardNumber.replace(/\s+/g, '');

    // Check if the card number is a valid number
    if (!/^\d+$/.test(sanitizedCardNumber)) {
        sendResponse(res, 400, false, 'Card number must be numeric');
        return;
    }

    if (!cardHolderName) {
        sendResponse(res, 400, false, 'Card holder name is required');
        return;
    }
    if (!expiryDate) {
        sendResponse(res, 400, false, 'Expiry date is required');
        return;
    }
    const isValid = /^\d{2}\/\d{2}$/.test(expiryDate);
    if (!isValid) {
        sendResponse(res, 400, false, 'Invalid expiry date format. Expected MM/YY.')
        return
    }
    if (!cvv) {
        sendResponse(res, 400, false, 'CVV is required');
        return;
    }
    if (cvv.length > 3 || cvv.length < 3) {
        sendResponse(res, 400, false, 'CVV is Invalid');
        return;
    }
    if (!cardType) {
        sendResponse(res, 400, false, 'Card type is required');
        return;
    }

    try {
        const getCardDetails = await CardDetailModel.findOne({ passengerId });
        const encryptedCardNumber = encrypt(cardNumber);
        const encryptedCvv = encrypt(cvv);

        if (!getCardDetails) {
            const newCardDetails = new CardDetailModel({
                passengerId,
                cards: [{
                    cardNumber: encryptedCardNumber,
                    cardHolderName,
                    expiryDate,
                    cvv: encryptedCvv,
                    cardType,
                }],
            });
            await newCardDetails.save();

            //new notification
            await NotificationModel.create({
                accountId: passengerId,
                message: `You added a new payment card`
            })
            sendResponse(res, 201, true, 'Card details added successfully');
            return
        } else {
            const newCard = {
                cardNumber: encryptedCardNumber,
                cardHolderName,
                expiryDate,
                cvv: encryptedCvv,
                cardType,
            };
            getCardDetails.cards.push(newCard);
            await getCardDetails.save();

            //new notification
            await NotificationModel.create({
              accountId: passengerId,
              message: `You added a new payment card`
            })

            sendResponse(res, 201, true, 'Card details added successfully');
            return
        }
    } catch (error) {
        console.log('UNABLE TO ADD NEW CARD DETAILS', error);
        sendResponse(res, 500, false, 'Unable to add new card details');
    }
}

export async function updateCardDetails(req, res) {
    const { passengerId } = req.user;
    const { cardId, cardNumber, cardHolderName, expiryDate, cvv, cardType } = req.body;
    if(expiryDate){
        const isValid = /^\d{2}\/\d{2}$/.test(expiryDate);
        if (!isValid) {
            sendResponse(res, 400, false, 'Invalid expiry date format. Expected MM/YY.')
            return
        }
    }
    if(cardNumber){
        // Remove spaces from the card number
        const sanitizedCardNumber = cardNumber.replace(/\s+/g, '');

        // Check if the card number is a valid number
        if (!/^\d+$/.test(sanitizedCardNumber)) {
            sendResponse(res, 400, false, 'Card number must be numeric');
            return;
        }
    }
    try {
        const getCardDetails = await CardDetailModel.findOne({ passengerId });
        if (!getCardDetails) {
            sendResponse(res, 404, false, 'Card details account not found');
            return;
        }

        if (getCardDetails.passengerId !== passengerId) {
            sendResponse(res, 403, false, 'You are not authorized to update this card details');
            return;
        }

        const card = getCardDetails.cards.find((card) => (card._id).toString() === cardId);
        if (!card) {
            sendResponse(res, 404, false, 'Card details not found');
            return;
        }

        if (cardNumber) card.cardNumber = encrypt(cardNumber);
        if (cvv) card.cvv = encrypt(cvv);
        if (cardHolderName) card.cardHolderName = cardHolderName;
        if (expiryDate) card.expiryDate = expiryDate;
        if (cardType) card.cardType = cardType;

        await getCardDetails.save();

        //new notification
        await NotificationModel.create({
            accountId: passengerId,
            message: `You updated a payment card`
        })

        sendResponse(res, 200, true, 'Card details updated successfully', getCardDetails);
    } catch (error) {
        console.log('ERROR UPDATING CARD DETAILS', error);
        sendResponse(res, 500, false, 'Unable to update card details');
    }
}

export async function getCardDetails(req, res) {
    const { passengerId } = req.user;
    try {
        const getCardDetails = await CardDetailModel.findOne({ passengerId });
        if (!getCardDetails) {
            sendResponse(res, 404, false, 'Card details not found');
            return;
        }

        // Decrypt card numbers and mask them
        const cards = getCardDetails.cards.map(card => {
            const decryptedCardNumber = decrypt(card.cardNumber); // Decrypt the card number
            const maskedCardNumber = `**** **** **** ${decryptedCardNumber.slice(-4)}`; // Mask all but the last 4 digits
            //remove cvv also
            const { cvv, ...cardData } = card._doc
            return {
                ...cardData.toObject(),
                cardNumber: maskedCardNumber, // Replace cardNumber with the masked value
            };
        });

        sendResponse(res, 200, true, { ...getCardDetails.toObject(), cards }, 'Card details fetched successfully');
    } catch (error) {
        console.log('ERROR FETCHING CARD DETAILS', error);
        sendResponse(res, 500, false, 'Unable to fetch card details');
    }
}

export async function getCardDetail(req, res) {
    const { passengerId } = req.user;
    const { cardId } = req.params;
    try {
        const getCardDetails = await CardDetailModel.findOne({ passengerId });
        if (!getCardDetails) {
            sendResponse(res, 404, false, 'Card details not found');
            return;
        }

        const card = getCardDetails.cards.find(card => card._id.toString() === cardId);
        if (!card) {
            sendResponse(res, 404, false, 'Card details not found');
            return;
        }

        // Decrypt card number and mask it
        const decryptedCardNumber = decrypt(card.cardNumber);
        const maskedCardNumber = `**** **** **** ${decryptedCardNumber.slice(-4)}`; // Mask all but the last 4 digits

        const { cvv, ...cardData } = card._doc
        sendResponse(res, 200, true, { ...cardData.toObject(), cardNumber: maskedCardNumber }, 'Card details fetched successfully');
    } catch (error) {
        console.log('ERROR FETCHING CARD DETAILS', error);
        sendResponse(res, 500, false, 'Unable to fetch card details');
    }
}

export async function getPaymentCards(req, res) {
    const { passengerId } = req.user;
    try {
        const getCardDetails = await CardDetailModel.findOne({ passengerId });
        if (!getCardDetails) {
            sendResponse(res, 404, false, 'Card details not found');
            return;
        }

        /**
         // Decrypt card numbers and mask them
         const cards = getCardDetails.cards.map(card => {
             const decryptedCardNumber = decrypt(card.cardNumber); // Decrypt the card number
             const maskedCardNumber = `**** **** **** ${decryptedCardNumber.slice(-4)}`; // Mask all but the last 4 digits
             return {
                 ...card.toObject(),
                 cardNumber: maskedCardNumber, // Replace cardNumber with the masked value
             };
         });
         * 
         */

         const paymentCard = getCardDetails.cards

        sendResponse(res, 200, true,  paymentCard, 'Card details fetched successfully');
    } catch (error) {
        console.log('ERROR FETCHING CARD DETAILS', error);
        sendResponse(res, 500, false, 'Unable to fetch card details');
    }
}

export async function deleteCardDetails(req, res) {
    const { passengerId } = req.user
    const { cardId } = req.body
    try {
        const getCardDetails = await CardDetailModel.findOne({passengerId})
        if(!getCardDetails){
            sendResponse(res, 404, false, 'Bank details not found')
            return
        }
        //check that passengerId is the same as passengerId on the getCardDetails
        if(getCardDetails.passengerId !== passengerId){
            sendResponse(res, 403, false, 'You are not authorized to delete this card details')
            return
        }
        const cards = getCardDetails.cards.filter(card => (card._id).toString() !== cardId)
        getCardDetails.cards = cards
        await getCardDetails.save()
        sendResponse(res, 200, true, 'Card details deleted successfully')

    } catch (error) {
        console.log('ERROR dELETING CARD DETAILS', error)
        sendResponse(res, 500, false, 'Unable to delete card details')
    }
}
