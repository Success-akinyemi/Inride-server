import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
    accountId: {
        type: String,
        required: [ true, 'Account Id for notification is required' ]
    },
    message: {
        type: String
    },
    images: {
        type: Array
    }
},
    { timestamps: true }
)

const NotificationModel = mongoose.model('notification', NotificationSchema)
export default NotificationModel