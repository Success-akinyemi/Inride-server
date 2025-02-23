import mongoose from "mongoose";

const AvailableActiveRideSchema = new mongoose.Schema({
    driverId: {
        type: String,
        required: [ true, 'Driver Id is required']
    },
    rideIds: {
        type: Array,
        default: []
    },
    createdAt:{
        type: Date,
        default: () => Date.now(),
        expires: 3600 //1Hour
    }
}, 
 { timestamps: true}
)

const AvailableActiveRideModel = mongoose.model('availableActiveRdie', AvailableActiveRideSchema)
export default AvailableActiveRideModel