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

const UserRideModel = mongoose.model('userRideHistroy', UserRidesSchema);
export default UserRideModel;