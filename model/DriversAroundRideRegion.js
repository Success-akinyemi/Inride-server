import mongoose from "mongoose";

const driverAroundrideRegionSchema = new mongoose.Schema({
    rideId: {
        type: String,
        required: [ true, 'Ride Id is required'],
    },
    driversIds: {
        type: Array
    }
},
{ timestamps: true }
)

const driverAroundrideRegionModel = mongoose.model('driverAroundrideRegion', driverAroundrideRegionSchema)
export default driverAroundrideRegionModel