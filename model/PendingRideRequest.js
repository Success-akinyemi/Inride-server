import mongoose from "mongoose";

const PendingRideRequestSchema = new mongoose.Schema({
    rideId: {
        type: String,
        required: [ true, 'Ride Id is required']
    },
    driverId: {
        type: String,
        required: [ true, 'Driver Id is Requested' ]
    }
},
{ timestamps: true }
)

const PendingRideRequestModel = mongoose.model('pendingRideRequest', PendingRideRequestSchema)
export default PendingRideRequestModel