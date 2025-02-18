import mongoose from "mongoose";

const PaymentIntentSchema = new mongoose.Schema({
    paymentId: {
        type: String,
        required: [ true, 'Payment Id is required']
    },
    client_secret: {
        type: String,
        required: [ true, 'Client Secret is required']
    },
    paymentfor: {
        type: String,
        enum: ['funding', 'booking']
    },
    amount: {
        type: Number
    },
    accountId: {
        type: String,
        required: [ true, 'Account Id is required']
    },
    status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Successful', 'Failed', 'Processing']
    }
},
{ timestamps: true }
)

const PaymentIntentModel = mongoose.model('paymentIntent', PaymentIntentSchema)
export default PaymentIntentModel