import mongoose from "mongoose";

const CmsSchema = new mongoose.Schema({
    title: {
        type: String
    },
    message: {
        type: String
    },
    image: {
        type: String
    },
    url: {
        type: String
    },
    caption: {
        type: String
    },
    author: {
        type: String
    },
    authorId: {
        type: String
    },
    redirection: {
        type: String,
        enum: [ 'inapp', 'mail', 'pushnotification', 'inappandpushnotification', ]
    },//in-app mail pushnotification 
    status: {
        type: String,
        enum: [ 'draft', 'scheduled', 'published' ]
    },//draft, published, scheduled
    type: {
        type: String,
        enum: [ 'updates', 'offers' ]
    },//updates, Offers
    scheduled: {
        type: Boolean,
        default: false
    }, //true if scheduled
    scheduledDate: [{
        day: { type: String, },
        time: { type: String, }, 
        date: { type: String, }, 
    }],

    users: {
        type: Array
    },//users custom email if provided
    accountType: {
        type: String
    }, //driver passenger admin
    allUsers: {
        type: Boolean,
        default: true
    }, //true if no accountType passed
},
{ timestamps: true }
)

const CmsModel = mongoose.model('cms', CmsSchema)
export default CmsModel