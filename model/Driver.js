import mongoose from "mongoose";

const DriverSchema = new mongoose.Schema({
    mobileNumber: {
        type: String,
        required: [ true, 'Mobile number is required'],
        unique: [ true, 'Mobile Number already exist' ]
    },
    firstName: {
        type: String,
    },
    lastName: {
        type: String
    },
    email: {
        type: String,
        //unique: [ true, 'Email Already exist']
    },
    driverId: {
        type: String,
        unique: [true, 'driver Id must be unique']
    },
    accountType: {
        type: String,
        default: 'driver'
    },

    password: {
        type: String
    },
    verified: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    refreshToken: {
        type: String,
        expires: 30 * 24 * 60 * 60 // 30 days
    }
},
{ timestamps: true }
)

const DriverModel = mongoose.model('driver', DriverSchema)
export default DriverModel