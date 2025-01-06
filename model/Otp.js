import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
    otp: {
        type: String,
        required: [true, 'Otp code is required'],
        unique: [true, 'Otp code already exist']
    },
    mobileNumber: {
        type: String,
        required: [true, 'Mobile number is required']
    },
    accountType: {
        type: String,
        required: [ true, 'Accout type is required' ]
    },
    createdAt:{
        type: Date,
        default: Date.now(),
        expires: 600 //10 minutes
    },
},
{ timestamps: true }
)

const OtpModel = mongoose.model('otp', OtpSchema)
export default OtpModel