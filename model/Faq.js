import mongoose from "mongoose";

const FaqSchema = new mongoose.Schema({
    faq: [
        {
            question: {
                type: String,
                required: [ true, 'Question for Faq is required']
            },
            answer: {
                type: String,
                required: [ true, 'Question for Faq is required']
            },
            active: {
                type: Boolean,
                default: true,
            }
        }
    ]
},
{ timestamps: true }
)

const FaqModel = mongoose.model('faq', FaqSchema)
export default FaqModel