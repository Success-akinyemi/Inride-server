import axios from "axios"
import { sendResponse } from "../middlewares/utils.js"
import NewCandidatemodel from "../model/NewCandidiate.js"
import CandidateInvitationModel from "../model/CandidateInvitation.js"
import CandidateReportModel from "../model/CandidateReport.js"
import DriverModel from "../model/Driver.js"
import { sendWelcomeEmail } from "../middlewares/mailTemplate.js.js"

const apiKey = process.env.CHECKR_SECRET

export async function authenticateCheckr(req, res){

    try {
        const authReq = await axios.get('https://api.checkr-staging.com', {
        auth: {
            username: apiKey,
            password: "", 
          },
        })

        console.log('AUTH DATA', authReq.data)
        sendResponse(res, 200, true, authReq.data)
    } catch (error) {
        console.log('ERROR AUTHENTICATIONG WITH CHECKR', error)
        sendResponse(res, 200, false, 'Unable to authenticate with checkr')
    }
}

export async function createCandidate({ first_name, last_name, middle_name, email, phone, zipcode, dob, ssn, driver_license_number, driver_license_state, copy_requested  }) {
    try {
        const newCandidate = await axios.post(
            `${process.env.CHECKR_URL}/candidates`,
            {
              first_name,
              middle_name,
              last_name,
              email,
              phone,
              zipcode,
              dob,
              ssn,
              driver_license_number,
              driver_license_state,
              copy_requested,
              work_locations: [{ country: "US" }],
            },
            {
              auth: {
                username: apiKey,
                password: "",
              },
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
      
          //console.log("Candidate created successfully:", newCandidate.data);
          return { success: true, data: newCandidate.data };
    } catch (error) {
        console.log('UNABLE TO CREATE CHECKR CANDIDATE', error)
        return { success: false, data: error.response.data };
    }
}

export async function inviteCandidate({ candidate_id, package_name, state }) {
    try {
        const invitationToCandidate = await axios.post(
            `${process.env.CHECKR_URL}/invitations`,
            {
              candidate_id,
              package: package_name,
              work_locations: [{ state: state }],
            },
            {
              auth: {
                username: apiKey,
                password: "",
              },
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
      
          //console.log("Candidate invited successfully:", invitationToCandidate.data);
          return { success: true, data: invitationToCandidate.data };
    } catch (error) {
        console.log('UNABLE TO INVITE CHECKR CANDIDATE', error)
        return { success: false, data: error.response.data };
    }
}

export async function checkrWebHook(req, res) {
    try {
        console.log('REQ, BODY', req.body, 'OBJECT', req.body.data.object)
        const bodyData = req?.body?.data?.object

        //CANDIDATE CREATED
        if(req.body.type === 'candidate.created'){
            //create new candidate
            const candidateIdExist = await NewCandidatemodel.findOne({ candidateId: bodyData?.id  })
            if(!candidateIdExist){
                await NewCandidatemodel.create({
                    candidateId: bodyData?.id,
                    uri: bodyData?.uri,
                    mobileNumber: bodyData?.phone,
                    email: bodyData?.email,
                    created_at: bodyData?.created_at
                })
            }

            res.json(200).end()
        }

        //INVITE CANDIDATE
        if(req.body.type === 'invitation.created'){
            //create new invitation
            const invitationIdExist = await CandidateInvitationModel.findOne({ invitationId: bodyData?.id  })
            if(!invitationIdExist){
                await CandidateInvitationModel.create({
                    invitationId: bodyData?.id,
                    invitation_url: bodyData?.invitation_url,
                    uri: bodyData?.uri,
                    status: bodyData?.status,
                    created_at: bodyData?.created_at,
                    expires_at: bodyData?.expires_at,
                    package: bodyData?.package,
                    candidateId: bodyData?.candidate_id,
                    metaData: bodyData?.metaData
                })
            }
            if(invitationIdExist){
              invitationIdExist.url = bodyData?.invitation_url
              invitationIdExist.status = bodyData?.status
              invitationIdExist.metaData = bodyData?.metaData
              invitationIdExist.uri = bodyData?.uri,
              await invitationIdExist.save()
            }

            res.json(200).end()
          }

          //INVITATION COMMPLETE
          if(req.body.type === 'invitation.completed'){
            //invitation completed (invitation done by user)
            const invitationIdExist = await CandidateInvitationModel.findOne({ invitationId: bodyData?.id  })
            if(invitationIdExist){
              invitationIdExist.status = bodyData.status
              invitationIdExist.reportId = bodyData?.report_id
              invitationIdExist.metaData = bodyData?.metadata
              invitationIdExist.completed_at = bodyData?.completed_at
              invitationIdExist.invitation_url = bodyData?.invitation_url
              await invitationIdExist.save()
            }

            res.json(200).end()
          }

          //report created
          if(req.body.type === 'report.created'){
            //create report
            const reportExist = await CandidateReportModel.findOne({ id: bodyData?.id })
            if(!reportExist){
              const reportId = bodyData?.uri.split('/')[3]
              await CandidateReportModel.create({
                id: bodyData?.id,
                uri: bodyData?.uri,
                reportId: reportId,
                status: bodyData?.status,
                created_at: bodyData?.created_at,
                candidateId: bodyData?.candidate_id,
                dueTime: bodyData?.due_time,
                ssnTraceId: bodyData?.ssn_trace_id,
                motorVehicleReportId: bodyData?.motor_vehicle_report_id,
                package: bodyData?.package
              })
            }

            res.json(200).end()
          }

          //report completed
          if(req.body.type === 'report.completed'){
            //report completd - update result and assement
            const reportId = bodyData?.uri.split('/')[3]
            const getCandidateReport = await CandidateReportModel.findOne({ reportId: reportId })
            if(reportId){
              getCandidateReport.status = bodyData.status
              getCandidateReport.result = bodyData.result
              getCandidateReport.package = bodyData.package
              getCandidateReport.assessment = bodyData.assessment
              await getCandidateReport.save()
              if(bodyData?.result?.toLowerCase() === 'clear'){
                const candidateId = getCandidateReport.candidateId
                const getDriver = await DriverModel.findOne({ candidateId: candidateId })
                if(getDriver){
                  getDriver.approved = true
                  await getDriver.save()

                  //send welcome email to user
                  sendWelcomeEmail({
                    email: getDriver.email,
                    name: getDriver.firstName,
                    title: `Account Activated | Happy to have you on RideFuze!`
                  })
                } 
              }
            }

            res.json(200).end()
          }

        
          

    } catch (error) {
        console.log('CHECKR ERROR', error)
    }
}