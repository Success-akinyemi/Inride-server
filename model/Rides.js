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
        enum: [ 'personal', 'group', 'delivery', 'schedule'],
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
        //default: true
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
        type: Number
    },
    driverRating: {
        type: Number
    },
    comment: {
        type: String
    },
    drivercomment: {
        type: String
    },
    status: {
        type: String,
        default: 'Initiated',
        enum: ['Pending', 'Initiated', 'Requested', 'Active', 'In progress', 'Complete', 'Canceled']
    },
    scheduleRide: {
        type: Boolean,
        default: false
    },
    scheduleTime: {
        type: String //14:30:00
    },
    scheduleDate: {
        type: String //2025-01-26
    },
    paid: {
        type: Boolean,
        default: false
    },
    paymentMethod: {
        type: String
    },
    carDetails: {
        registrationNumber: {
            type: String,
            //required: [ true, 'Registration number is required' ],
        },
        year: {
            type: String,
            //required: [ true, 'Car model year is required']
        },
        model: {
            type: String,
            //required: [ true, 'Car model is required' ]
        },
        color: {
            type: String,
            //reqred: [true, 'Car color is required']
        },
        noOfSeats: {
            type: Number,
            //required: [ true, 'Number of seats is required' ]
        },
        carImgUrl: {
            type: String,
        }
    }
},
{ timestamps: true }
);

const RideModel = mongoose.model('ride', RideSchema);
export default RideModel;
