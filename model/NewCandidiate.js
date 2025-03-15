import mongoose from "mongoose";

const NewCandidateSchema = new mongoose.Schema({
    candidateId: {
        type: String,
        required: [true, 'Candidate Id is requred']
    },
    uri: {
        type: String
    },
    mobileNumber: {
        type: String
    },
    email: {
        type: String
    },
    created_at: {
        type: String
    }
},
{ timestamps: true}
)

const NewCandidatemodel = mongoose.model('newCandidate', NewCandidateSchema)
export default NewCandidatemodel