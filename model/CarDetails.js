import mongoose from "mongoose";

const CarDetailSchema = new mongoose.Schema({
    driverId: {
        type: String,
        required: [ true, 'Driver Id is required' ]
    },
    cars: [
        {
            registrationNumber: {
                type: String,
                required: [ true, 'Registration number is required' ],
                unique: [ true, 'Registration number already exist' ]
            },
            year: {
                type: String,
                required: [ true, 'Car model year is required']
            },
            model: {
                type: String,
                required: [ true, 'Car model is required' ]
            },
            color: {
                type: String,
                reqred: [true, 'Car color is required']
            },
            noOfSeats: {
                type: Number,
                required: [ true, 'Number of seats is required' ]
            },
            carImgUrl: {
                type: String,
            },
            active: {
                type: Boolean,
                default: true
            },
            approved: {
                type: Boolean,
                default: true
            },
            method: {
                type: String,
                default: 'Personal',
                enum: ['Personal', 'Rental']
            }
        }
    ]
},
{ timestamps: true }
)

const CarDetailModel = mongoose.model('cardDeatil', CarDetailSchema)
export default CarDetailModel