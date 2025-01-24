import mongoose from "mongoose";

const DriverBankDetailSchema = new mongoose.Schema({
    driverId: {
        type: String,
        required: [ true, 'Driver Id is required']
    },
    bankDetails: [
        {
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
        }
    ]
},
{ timestamps: true }
)

const DriverBankDetailModel = mongoose.model('DriverBankDetail', DriverBankDetailSchema)
export default DriverBankDetailModel