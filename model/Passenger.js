import mongoose from 'mongoose'
import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import crypto from 'crypto'

const PassengerSchema = new mongoose.Schema({
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
    passengerId: {
        type: String,
        unique: [true, 'Passger Id must be unique']
    },
    accountType: {
        type: String,
        default: 'passenger'
    },
    accountImg: {
        type: String
    },
    rides: {
        type: Array
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
        enum: ['driverLicense', 'internationalPassport', 'voterCard']
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

PassengerSchema.pre('save', async function(next) {
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

PassengerSchema.pre('save', async function(next) {
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

PassengerSchema.methods.matchAdminPassword = async function(password) {
    return await bcryptjs.compare(password, this.password)
}

PassengerSchema.methods.getAccessToken = function(){
    return jsonwebtoken.sign({ id: this.passengerId, accountType: this?.accountType }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRE})
}

PassengerSchema.methods.getRefreshToken = function(){
    return jsonwebtoken.sign({ id: this._id, email: this.email, mobileNumber: this.mobileNumber }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRE})
}

PassengerSchema.methods.getAdminResetPasswordToken = function(){
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    this.resetPasswordExpire = Date.now() + 10 * ( 60 * 1000 )

    return resetToken
}

const PassengerModel = mongoose.model('passenger', PassengerSchema)
export default PassengerModel