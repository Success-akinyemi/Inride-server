import mongoose from "mongoose";

const BigTaxesSchema = new mongoose.Schema({
    stationName: {
        type: String,
        required: [ true, 'Station name is required']
    },
    price: {
        type: Number,
        required: [ true, 'Price is required']
    },
    from: {
        type: String,
        required: [ true, 'Place "from" is required']
    },
    fromDescription: {
        type: String
    },
    to: {
        type: String,
        required: [ true, 'Place "to" is required']
    },
    toDescription: {
        type: String
    },
    miles: {
        type: Number,
        required: [ true, 'Miles is required']
    },
    time: {
        type: String,
        required: [ true, 'Time is required']
    },
    
},
{ timestamps: true }
)

const BigTaxesModel = mongoose.model('bigtaxe', BigTaxesSchema)
export default BigTaxesModel