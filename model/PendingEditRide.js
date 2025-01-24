import mongoose from "mongoose";

const PendingEditRideRequestSchema = new mongoose.Schema({
    rideId: {
        type: String,
        required: [ true, 'Ride Id is required']
    },
    to: [
        {
            place: {
                type: String //Name of places
            },
            placeId: {
                type: String // Id of place
            },
            locationCoordinates: {
                type: {
                  type: String,
                  enum: ['Point'],
                  default: 'Point'
                },
                coordinates: {
                  type: [Number],
                  required: true
                }
            }
        }
    ],
    totalDistance: {
        type: Number,
        required: [true, 'Total Distance is required']
    },
    price: {
        type: Number
    },
    status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Accepted', 'Rejected', 'Paid']
    }
},
{ timestamps: true }
)

const PendingEditRideRequestModel = mongoose.model('pendingEditRideRequest', PendingEditRideRequestSchema)
export default PendingEditRideRequestModel