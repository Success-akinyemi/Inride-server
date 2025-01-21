import mongoose from "mongoose";

const driverPriceSchema = new mongoose.Schema({
  rideId: {
    type: String,
    required: [true, 'Ride Id is required'],
  },
  prices: [
    {
      driverId: {
        type: String,
        required: [true, 'Driver Id is required'],
      },
      price: {
        type: Number,
        required: [true, 'Price is required'],
      },
      time: {
        type: Date, 
        default: Date.now, 
      },
    },
  ],
},
{ timestamps: true }
);

const driverPriceModel = mongoose.model('driverPrice', driverPriceSchema);
export default driverPriceModel;
