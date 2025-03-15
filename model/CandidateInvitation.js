import mongoose from "mongoose"

const CandidateInvitationSchema = new mongoose.Schema({
    invitationId: {
        type: String,
        required: [true, 'Invitation Id for candidate invitation is required']
    },
    invitation_url: {
        type: String
    },
    uri: {
        type: String
    },
    status: {
        type: String
    },
    created_at: {
        type: String
    },
    expires_at: {
        type: String
    },
    completed_at: {
        type: String
    },
    package: {
        type: String
    },
    candidateId: {
        type: String,
        required: [ true, 'Candidate for invitation is required']
    },
    metaData: {
        type: Object
    },
    reportId: {
        type: String
    }
},
{ timestamps: true }
)

const CandidateInvitationModel = mongoose.model('candidateinvitation', CandidateInvitationSchema)
export default CandidateInvitationModel