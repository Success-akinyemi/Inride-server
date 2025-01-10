import mongoose from "mongoose";

const RideSchema = new mongoose.Schema({
    userId: {
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
    from: {
        type: String,
        required: [true, 'Starting point is required']
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
                type: String
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
        enum: ['Initiated', 'Active', 'Complete', 'Canceled']
    },
    paid: {
        type: Boolean,
        default: false
    }
});

const RideModel = mongoose.model('ride', RideSchema);
export default RideModel;
