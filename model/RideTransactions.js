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
    payableAmount: {
        type: Number
    },
    status: {
        type: String,
        enum: ['Pending', 'Successful', 'Failed']
        //can be update by admin
    }

},
{ timestamps: true }
)

const RideTransactionModel = mongoose.model('rideTransaction', RideTransactionSchema)
export default RideTransactionModel