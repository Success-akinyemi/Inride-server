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
    totalRides: {
        type: Number
    },
    cancelRides: {
        type: Number
    },
    earnings: {
        type: Number
    },
    opreatingCity:{
        type: String
    },
    status: {
        type: String,
        default: 'offline',
        enum: [ 'online', 'offline', 'busy']
    },
    pricePerKm: {
        type: Number
    },

    password: {
        type: String
    },
    ssn:{
        type: String
    },
    idCardImgFront: {
        type: String
    },
    idCardImgBack: {
        type: String
    },
    profileImg: {
        type: String
    },
    idCardType: {
        type: String,
        //enum: ['driverLicense', 'internationalPassport', 'voterCard']
    },
    driverLincenseImgFront: {
        type: String
    },
    driverLincenseImgBack: {
        type: String
    },
    verified: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,

},
{ timestamps: true }
)

const DriverModel = mongoose.model('driver', DriverSchema)
export default DriverModel