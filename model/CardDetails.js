import mongoose from "mongoose";

const CardDetailSchema = new mongoose.Schema({
    passengerId: {
        type: String,
        required: [true, 'Passenger id is required']
    },
    cards: [
        {
            cardNumber: {
                type: String,
                required: [true, 'Card number is required']
            },
            cardHolderName: {
                type: String,
                required: [true, 'Card holder name is required']
            },
            expiryDate: {
                type: String,
                required: [true, 'Expiry date is required']
            },
            cvv: {
                type: String,
                required: [true, 'CVV is required']
            },
            cardType: {
                type: String,
                //required: [true, 'Card type is required']
            }
        }
    ]
},
{ timestamps: true }
)

const CardDetailModel = mongoose.model('cardDetail', CardDetailSchema)
export default CardDetailModel