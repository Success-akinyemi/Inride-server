import mongoose from "mongoose";

const PushNotificationSchema = new mongoose.Schema({
    user: [
        {
            email: {
                type: String,
                required: [ true, 'Email address is required' ]
            },
            data: {
                type: Object
            },
            accountType: {
                type: String
            }
        }
    ]
})

const PushNotificationModel = mongoose.model('PushNotification', PushNotificationSchema)
export default PushNotificationModel