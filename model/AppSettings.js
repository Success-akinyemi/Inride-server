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
},
{ timestamps: true}
)

const AppSettingsModel = mongoose.model('appSettings', AppSettingsSchema)
export default AppSettingsModel