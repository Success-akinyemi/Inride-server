import mongoose from "mongoose";

const WarningMessageSchema = new mongoose.Schema({
    accountId: {
        type: String,
        required: [ true, 'Account Id is required']
    },
    reason: {
        type: String
    }
},
{ timestamps: true }
)

const WarningMessageModel  = mongoose.model('warningMessage', WarningMessageSchema)
export default WarningMessageModel