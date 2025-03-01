import mongoose from "mongoose";

const EmailSubscriberSchema = new mongoose.Schema({
    accountId: {
        type: String
    },
    email: {
        type: String,
        required: [ true, 'Email address is required' ]
    },
    accountType: {
        type: String
    },
    firstName: {
        type: String,
    },
    lastName: {
        type: String
    }
},
{ timestamps: true }
)

const EmailSubscriberModel = mongoose.model('userRide', EmailSubscriberSchema)
export default EmailSubscriberModel