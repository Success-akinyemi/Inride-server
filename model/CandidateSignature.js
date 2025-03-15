import mongoose from 'mongoose'

const CandidateSignatureSchema = new mongoose.Schema({
    name: {
        type: String
    },
    signature: {
        type: String
    },
    candidateId: {
        type: String
    },
    email: {
        type: String
    },
    mobileNumber: {
        type: String
    },
    userConsent: {
        type: Boolean
    },
    userDeviceData: {
        type: Object
    }
},
{ timestamps: true }
)

const CandidateSignatureModel = mongoose.model('candidateSignature', CandidateSignatureSchema)
export default CandidateSignatureModel