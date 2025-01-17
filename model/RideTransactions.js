import mongoose from "mongoose";

const RideTransactionSchema = new mongoose.Schema({
    rideId: {
        type: String
    },
    driverId: {
        type: String
    },
    amount: {
        type: Number
    },
    status: {
        type: String
    }

},
{ timestamps: true }
)

const RideTransactionModel = mongoose.model('rideTransaction', RideTransactionSchema)
export default RideTransactionModel