import mongoose from "mongoose";

const RideSchema = new mongoose.Schema({
    passengerId: {
        type: String,
        required: [true, 'User id is required']
    },
    driverId: {
        type: String,
        //required: [ true, 'Driver Id is required']
    },
    rideId: {
        type: String,
        required: [true, 'Ride Id is required'],
        unique: [true, 'Ride Id must be unique']
    },
    rideType: {
        type: String,
        default: 'personal',
        enum: [ 'personal', 'group', 'split', 'delivery', 'reservation'],
    },
    noOffPassengers: {
        type: Number,
        default: 1
    },
    passengers: {
        type: Array
    },
    personnalRide: {
        type: Boolean,
        default: true
    },
    from: {
        type: String,
        required: [true, 'Starting point is required']
    },
    fromId: {
        type: String,
        required: [true, 'Starting point place Id is required']
    },
    fromCoordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          required: true
        }
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
    pickupPoint: {
        type: String,
    },
    kmDistance: {
        type: String
    },
    charge: {
        type: String
    },
    rating: {
        type: String
    },
    comment: {
        type: String
    },
    status: {
        type: String,
        default: 'Initiated',
        enum: ['Pending', 'Initiated', 'Active', 'Complete', 'Canceled']
    },
    paid: {
        type: Boolean,
        default: false
    }
},
{ timestamps: true }
);

const RideModel = mongoose.model('ride', RideSchema);
export default RideModel;
