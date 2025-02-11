import mongoose from "mongoose";

const SafteySchema = new mongoose.Schema({
    accountId: {
        type: String,
        required: [ true, 'Account Id is requried' ]
    },
    rideId: {
        type: String,
        required: [ true, 'Ride Id is requried' ]
    },
    safteyIssue: {
        type: String,
        required: [ true, 'Saftey Issues is required' ]
    }
},
{ timestamps: true }
)

const SafteyModel = mongoose.model('saftey', SafteySchema)
export default SafteyModel