import mongoose from "mongoose";

const PayoutSchema = new mongoose.Schema({
    driverId: {
        type: String,
        required: [ true, 'Driver Id is required']
    },
    amount: {
        type: Number
    },
    status: {
        type: String,
        default: 'Pending',
        enum : ['Pending', 'Succesful', 'Canceled']
    },
    closed:{
        type: Boolean,
        default: false
    },
    reason:{
        type: String
    },
    bankName: {
        type: String,
        required: [ true, 'Bank Name is required']
    },
    accountNumber: {
        type: String,
        required: [ true, 'Account Number is required']
    },
    accountName: {
        type: String,
        required: [ true, 'Account Name is requried']
    }
},
{ timestamps: true }
)

const PayoutModel = mongoose.model('Payout', PayoutSchema)
export default PayoutModel