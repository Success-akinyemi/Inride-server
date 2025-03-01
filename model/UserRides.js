import mongoose from "mongoose";

const UserRidesSchema = new mongoose.Schema({
    accountId: {
        type: String // both for either driver or passenger
    },
    rides: {
        type: Array
    }
},
{ timestamps: true }
)

const UserRideModel = mongoose.models.userRide || mongoose.model('userRide', UserRidesSchema);
export default UserRideModel;