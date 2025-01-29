import mongoose from "mongoose";

const AboutSchema = new mongoose.Schema({
    about: {
        type: String
    }
},
{ timestamps: true }
)

const AboutModel = mongoose.model('about', AboutSchema)
export default AboutModel