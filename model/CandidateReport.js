import mongoose from "mongoose";

const CandidateReportSchema = new mongoose.Schema({
    id: {
        type: String //id of the report data not report_id for candidate
    },
    reportId: {
        type: String
    },
    uri: {
        type: String
    },
    status: {
        type: String
    },
    result: {
        type: String
    },
    assessment: {
        type: String
    },
    created_at: {
        type: String
    },
    candidateId: {
        type: String
    },
    ssnTraceId: {
        type: String
    },
    motorVehicleReportId: {
        type: String
    },
    dueTime: {
        type: String
    },
    package: {
        type: String
    },
    canceled: {
        type: Boolean,
        default: false
    }
})

const CandidateReportModel = mongoose.model('candidatereport', CandidateReportSchema)
export default CandidateReportModel