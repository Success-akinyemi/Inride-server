import mongoose from "mongoose";

const ForgotItemSchem = new mongoose.Schema({
    rideId: {
        type: String
    },
    passengerId: {
        type: String
    },
    driverId: {
        type: String,
    },
    description: {
        type: String,
    },
    resolved: {
        type: Boolean,
        default: false
    }
},
{ timestamps: true }
)

const ForgotItemModel = mongoose.model('forgotItem', ForgotItemSchem)
export default ForgotItemModel