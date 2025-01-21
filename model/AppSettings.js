import mongoose from "mongoose";

const AppSettingsSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    pricePerKm: {
        type: Number,
        default: 0
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