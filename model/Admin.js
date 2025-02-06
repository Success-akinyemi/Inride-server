import mongoose from "mongoose";

const AdminUserSchema = new mongoose.Schema({
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
        enum: ['Pending', 'Sacked', 'Active', 'Inactive', 'Blocked']
    },
    role: {
        type: String,
        default: 'Staff'
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

    password: {
        type: String
    },
    noOfLoginAttempts: {
        type: Number
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
    }
})

const AdminUserModel = mongoose.model('adminUser', AdminUserSchema)
export default AdminUserModel