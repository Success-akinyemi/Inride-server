import mongoose from 'mongoose'
import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import crypto from 'crypto'
import moment from "moment-timezone";

const AdminUserSchema = new mongoose.Schema({
    adminId: {
        type: String,
        required: [ true, 'Admin Id is required' ],
        unique: [ true, 'Admin Id is must be unique']
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
    email: {
        type: String
    },
    profileImg: {
        type: String
    },
    is2FA: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Sacked', 'Active', 'Inactive', 'Blocked']
    },
    role: {
        type: String,
        default: 'Staff',
    },
    permissions: {
        type: Array,
    },
    bio:{
        type: String
    },
    lastLogin:{
        type: String,
    },
    lastLoginInfo: [{
        device: {
            type: String,
        },
        location: {
            type: String
        }
    }],
    accountType:{
        type: String,
        default: 'admin'
    },

    password: {
        type: String
    },
    noOfLoginAttempts: {
        type: Number,
        default: 0, //max 3
    },
    temporaryAccountBlockTime: {
        type: String //
    },
    verified: {
        type: Boolean,
        default: false
    },
    accountSuspended: {
        type: Boolean,
        default: false
    },
    blocked:{
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
})

AdminUserSchema.pre('save', async function(next) {
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

AdminUserSchema.methods.matchPassword = async function(password) {
    return await bcryptjs.compare(password, this.password)
}

AdminUserSchema.methods.getAccessToken = function(){
    return jsonwebtoken.sign({ id: this.adminId, accountType: this?.accountType }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRE})
}

AdminUserSchema.methods.getRefreshToken = function(){
    return jsonwebtoken.sign({ id: this.adminId, email: this.email, _id: this._id }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRE})
}

AdminUserSchema.methods.getResetPasswordToken = function(){
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    //this.resetPasswordExpire = Date.now() + 10 * (60 * 1000)
    //this.resetPasswordExpire = moment().tz("Africa/Lagos").add(10, "minutes").toDate();

    const localTimeOffset = new Date().getTimezoneOffset() * 60 * 1000; // Convert minutes to milliseconds
    this.resetPasswordExpire = new Date(Date.now() - localTimeOffset + 10 * 60 * 1000);
    
    return resetToken
}

const AdminUserModel = mongoose.model('adminUser', AdminUserSchema)
export default AdminUserModel