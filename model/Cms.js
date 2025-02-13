import mongoose from "mongoose";

const CmsSchema = new mongoose.Schema({
    title: {
        type: String
    },
    message: {
        type: String
    },
    type: {
        type: String,
        enum: [ 'pushnotification', 'promotionalmail' ]
    },//push notification or promotional mail
    status: {
        type: String,
        enum: [ 'Draft', 'Scheduled', 'Published' ]
    }, //draft, published, scheduled
    image: {
        type: String
    },
    url: {
        type: String
    },
    caption: {
        type: String
    },
    scheduled: {
        type: Boolean,
        default: false
    }, //true if scheduled
    users: {
        type: Array
    },//users ID
    accountType: {
        type: String
    },
    allUsers: {
        type: Boolean,
        default: true
    },
    scheduledDate: [{
        day: { type: String, },
        time: { type: String, }, 
        date: { type: String, }, 
    }],
    author: {
        type: String
    },
    authorID: {
        type: String
    }
},
{ timestamps: true }
)

const CmsModel = mongoose.model('cms', CmsSchema)
export default CmsModel