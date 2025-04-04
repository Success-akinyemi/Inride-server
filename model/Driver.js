import mongoose from 'mongoose'
import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import crypto from 'crypto'

const DriverSchema = new mongoose.Schema({
    mobileNumber: {
        type: String,
        required: [ true, 'Mobile number is required'],
        unique: [ true, 'Mobile Number already exist' ]
    },
    firstName: {
        type: String,
    },
    middleName: {
        type: String
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
        type: Number,
        default: 0,
    },
    profileImg: {
        type: String
    },
    cancelRides: {
        type: Number,
        default: 0,
    },
    earnings: {
        type: Number,
        default: 0,
    },
    ratings: [
        {
            number: {
                type: Number
            },
            passengerId: {
                type: String
            }
        }
    ],
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
    autoAcceptRides: {
        type: Boolean,
        default: false
    },
    rideType: {
        type: String,
        default: 'all',
        enum: ['all', 'personal', 'group', 'split', 'delivery', 'reservation'],
    },
    kmRange: {
        type: Number, // in km
    },
    language: {
        type: String
    },
    pushNotification: {
        type: Boolean,
        default: false
    },
    mailNotification: {
        type: Boolean,
        default: false
    },
    homeAddress: {
        type: String
    },
    workAddress: {
        type: String
    },
    accountImg: {
        type: String
    },
    activeRide: {
        type: String
    },
    warningCount: {
        type: Number,
        default: 0 //max 3
    },
    candidateId: {
        type: String
    },
    zipcode: {
        type: String
    },
    state: {
        type: String
    },
    driverLincenseState: {
        type: String
    },
    driverLincenseNumber: {
        type: String
    },
    dob: {
        type: String //format 1964-03-15 YYYY-MM-DD
    },
    pushNotification: {
        type: Boolean,
        default: false
    },
    emailNotification: {
        type: Boolean,
        default: false
    },
    backgroundCheckStatus: {
        type: String
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
    approved: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    otpCode: {
        type: String
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,

},
{ timestamps: true }
)

DriverSchema.pre('save', async function(next) {
    if(!this.isModified('password')){
        return next();
    }

    try {
        const salt = await bcryptjs.genSalt(10)
        this.password = await bcryptjs.hash(this.password, salt)
        next()
    } catch (error) {
        console.log('UNABLE TO HASH PASSWORD', error)
        next(error)
    }
})
/**
 * 
DriverSchema.pre('save', async function(next) {
    if(!this.isModified('ssn')){
        return next();
    }

    try {
        const salt = await bcryptjs.genSalt(10)
        this.ssn = await bcryptjs.hash(this.ssn, salt)
        next()
    } catch (error) {
        console.log('UNABLE TO HASH SSN', error)
        next(error)
    }
})
 */

DriverSchema.methods.matchAdminPassword = async function(password) {
    return await bcryptjs.compare(password, this.password)
}

DriverSchema.methods.getAccessToken = function(){
    return jsonwebtoken.sign({ id: this.driverId, accountType: this?.accountType }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRE})
}

DriverSchema.methods.getRefreshToken = function(){
    return jsonwebtoken.sign({ id: this._id, email: this.email, mobileNumber: this.mobileNumber }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRE})
}

DriverSchema.methods.getAdminResetPasswordToken = function(){
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    this.resetPasswordExpire = Date.now() + 10 * ( 60 * 1000 )

    return resetToken
}

const DriverModel = mongoose.model('driver', DriverSchema)
export default DriverModel