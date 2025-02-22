import mongoose from "mongoose";

const PushNotificationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email address is required'],
    },
    data: {
        type: Object,
        required: [true, 'Data token is required'],
    },
    accountId: {
        type: String,
        required: [true, 'Account Id is required'],
    },
    accountType: {
        type: String,
        required: [true, 'Account type is required'],
        enum: ['passenger', 'driver'],
    },
});

const PushNotificationModel = mongoose.model('PushNotification', PushNotificationSchema);
export default PushNotificationModel;