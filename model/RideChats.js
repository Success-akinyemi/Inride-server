import mongoose from "mongoose";

const RideChatSchema = new mongoose.Schema({
    rideId: {
        type: String,
        required: [ true, 'Ride Id is required'],
        unique: [ true, 'Ride Id already exist']
    },
    chats: [
        {
            message: {
                type: String
            },
            from: {
                type: String
            },
            mediaLink: {
                type: String
            },
            senderId: {
                type: String
            },
        }
    ]
},
{ timestamps: true }
)

const RideChatModel = mongoose.model('RideChat', RideChatSchema)
export default RideChatModel