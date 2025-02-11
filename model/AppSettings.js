import mongoose from "mongoose";

const AppSettingsSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    pricePerKm: {
        type: Number,
        default: 0
    },
    deliveryPricePerKm: {
        type: Number,
        default: 0
    },
    earningCommission: {
        type: Number,
        default: 30
    },
    cancelationRidePercent: {
        type: Number,
        default: 5
    }, 
    currency: {
        type: String,
        default: 'USD'
    },
    warningCount: {
        type: Number,
        default: 3 //max number of warning before a account is banned
    },
},
{ timestamps: true}
)

const AppSettingsModel = mongoose.model('appSettings', AppSettingsSchema)
export default AppSettingsModel