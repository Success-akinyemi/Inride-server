import { sendCheckrInvitationEmail, sendWelcomeEmail } from "../middlewares/mailTemplate.js.js";
import twilioClient from "../middlewares/twilioConfig.js"
import { formatSSN, generateOtp, generateUniqueCode, isValidDOB, sendResponse, uploadFile } from "../middlewares/utils.js";
import { matchFace, verifyDriverLicense } from "../middlewares/verificationService.js";
import CandidateSignatureModel from "../model/CandidateSignature.js";
import CarDetailModel from "../model/CarDetails.js";
import DriverModel from "../model/Driver.js"
import DriverLocationModel from "../model/DriverLocation.js";
import NotificationModel from "../model/Notifications.js";
import OtpModel from "../model/Otp.js";
import PassengerModel from "../model/Passenger.js";
import RefreshTokenModel from "../model/RefreshToken.js";
import { createCandidate, inviteCandidate } from "./checkr.controllers.js";
import useragent from 'useragent';
import axios from 'axios';

const usNumberRegex = /^\+1\d{10}$/;

//Register user passenger account - use id from cookie to get user
export async function registerWithPassengerAccount(req, res) {
    const { mobileNumber } = req.body
    console.log('NEW DRIVER TO PASSENGER NUMBER', mobileNumber)
    if(!mobileNumber){
        return sendResponse(res, 400, false, 'Please provide your passenger mobile number to perform this action')
    }

    //ensure it is a us number and start with +1
    if (!usNumberRegex.test(mobileNumber)) {
        return sendResponse(res, 400, false, 'Invalid US mobile number. It must start with +1 and have 10 digits after.');
    } 
       
    try {
        const getPassenger = await PassengerModel.findOne({ mobileNumber: mobileNumber })
        if(!getPassenger){
            return sendResponse(res, 404, false, 'Account does not exist' )
        }

        const findDriver = await DriverModel.findOne({ mobileNumber: getPassenger?.mobileNumber })
        if(findDriver){
            return sendResponse(res, 400, false, 'Driver account already exist' )
        }

        const otpCode = await generateOtp(mobileNumber, 4, 'driver' )
        console.log('PASSENGER TO DRIVER OTP CODE', otpCode)

        if(otpCode){
            const driverId = await generateUniqueCode(8)
            console.log('DRIVER ID', `RF${driverId}PA`)
            const newDriverId = `RF${driverId}PA`
            
            const newUser = await DriverModel.create({
                mobileNumber: mobileNumber,
                driverId: newDriverId
            })
            /**
             * REMOVE LATTER AFTER WORK DONE
            const sendOtpCode = await twilioClient.messages.create({
                body: `Your RideFuze Otp code is: ${otpCode}`,
                from: `${process.env.TWILIO_PHONE_NUMBER}`,
                to: `${mobileNumber}`,
                messagingServiceSid: process.env.TWILIO_MESSAGE_SID
            })
            console.log('SMS BODY', sendOtpCode)
        
             */

            res.cookie('inridedrivertoken', newDriverId, {
                httpOnly: true,
                sameSite: 'None',
                secure: true,
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });

            return sendResponse(res, 201, true, `Verification Otp sent to: ${mobileNumber}. code is valid for 10min`, `${mobileNumber}, Code: ${otpCode}`)
        }

        return sendResponse(res, 500, false, 'Unable to register driver account')

    } catch (error) {
        console.log('UNABLE TO REGISTER DRIVER ACCOUNT', error)
        return sendResponse(res, 500, )
    }
}

export async function verifyPassengerToDriverAccountOtp(req, res) {
    const { otp } = req.body
    try {
        const getOtp = await OtpModel.findOne({ otp: otp })
        console.log('object', otp, getOtp)
        if(!getOtp){
            const getUser = await PassengerModel.findOne({ mobileNumber: getOtp?.mobileNumber })
            if(!getUser){
                return sendResponse(res, 404, false, 'Account does not exist')
            }

            const driverId = await generateUniqueCode(8)
            console.log('DRIVER ID', `RF${driverId}DR`)
            const newDriver = await DriverModel.create({
                mobileNumber: getUser?.mobileNumber,
                firstName: getUser?.firstName,
                lastName: getUser?.lastName,
                email: getUser?.email,
                //driverId: `RF${driverId}DR`,
                idCardImgFront: getUser?.idCardImgFront,
                idCardImgBack: getUser?.idCardImgBack,
                profileImg: getUser?.profileImg,
                idCardType: getUser?.idCardType,
                verified: true,
                otpCode: getOtp?.otp
            })    

            return sendResponse(res, 200, true, 'Account verified')
        }

        return sendResponse(res, 500, false, 'Unable to verify OTP')
    } catch (error) {
        console.log('UNABLE TO VERIFY OTP', error)
        return sendResponse(res, 500, false, 'Unable to verify OTP')
    }
}

//Complete registration for driver who created account with passenger account
export async function completeDriverRegistration(req, res) {
    const {ssn, opreatingCity, carDetails, firstName, middleName, lastName, pricePerKm, coordinates, email, state, dob, zipcode, driverLincenseNumber, driverLincenseState, userConsent, signature } = req.body
    const accountId = req.cookies.inridedrivertoken;

    if(!ssn){
        return sendResponse(res, 400, false, 'SSN is required')
    }
    const formatSsn = await formatSSN(ssn)
    if(!formatSsn.success){
        return sendResponse(res, 400, false, formatSsn.data)
    }
    if(!email){
        return sendResponse(res, 400, false, 'email is required')
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    if(!opreatingCity){
        return sendResponse(res, 400, false, 'Opreating city is required')
    }
    if(!driverLincenseNumber){
        return sendResponse(res, 400, false, 'Driver linsence number is required')
    }
    if(!driverLincenseState){
        return sendResponse(res, 400, false, 'Please provide driver lincense state')
    }
    if(!zipcode){
        return sendResponse(res, 400, false, 'Please provide zipcode')
    }
    if(!dob){
        return sendResponse(res, 400, false, 'Please provide date of birth')
    }
    const checkDob = isValidDOB(dob)
    if(!checkDob){
        return sendResponse(res, 400, false, 'Date of birth format is: YYYY-MM-DD')
    }
    if(!state){
        return sendResponse(res, 400, false, 'Please provide state of residence')
    }
    if(!userConsent){
        return sendResponse(res, 400, false, 'Please agree to background check/screen consent')
    }
    if(!signature){
        return sendResponse(res, 400, false, 'Your digital signature is required')
    }
    const expectedSignature = middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
    if(signature !== expectedSignature){
        return sendResponse(res, 400, false, 'Invalid Signature - does not match name')
    }
    if(!coordinates) return sendResponse(res, 400, false, 'Coordinates of driver location is required')
    //if(coordinates?.length < 2 || coordinates?.length > 2) return sendResponse(res, 400, false, 'Content of the coordinates is only: [longitude, latitude]')
    

    const { driverLincenseImgFront, driverLincenseImgBack, profileImg, carImg } = req.files || {};
    //console.log('COMPLETE RETURNING DRIVER REG', req.body, req?.files)
    if (!driverLincenseImgFront || !driverLincenseImgFront[0]) return sendResponse(res, 400, false, `Provide a valid photo of the front image of driver lincense`);
    if (!driverLincenseImgBack || !driverLincenseImgBack[0]) return sendResponse(res, 400, false, `Provide a valid photo of the back image of driver lincense`);
    if (!profileImg || !profileImg[0]) return sendResponse(res, 400, false, `Provide a photo of your face`);

    const allowedImageTypes = ['image/jpeg', 'image/png'];
    if (!allowedImageTypes.includes(driverLincenseImgFront[0].mimetype)) {
        return sendResponse(res, 400, false, `Invalid image format for Driver lincense front. Accepted formats: jpeg, png`);
    }
    if (!allowedImageTypes.includes(driverLincenseImgBack[0].mimetype)) {
        return sendResponse(res, 400, false, `Invalid image format for Driver lincense back. Accepted formats: jpeg, png`);
    }
    if (!allowedImageTypes.includes(profileImg[0].mimetype)) {
        return sendResponse(res, 400, false, `Invalid image format for profile image. Accepted formats: jpeg, png`);
    }

    if(!carDetails){
        return sendResponse(res, 400, false, 'Car Details is required')
    }
    const {registrationNumber, year, model, color, noOfSeats } = carDetails
    if(!registrationNumber || !year || !model || !color || !noOfSeats){
        return sendResponse(res, 400, false, 'Car registration number, year, model, color, no of seats are required')
    }
    try {
        let driver
        if(!accountId){
            return sendResponse(res, 403, false, 'Not Allowed')
        }
        driver = await DriverModel.findOne({ driverId: accountId })
        if(!driver){
            return sendResponse(res, 404, false, 'Account not found')
        }

        const getPassenger = await PassengerModel.findOne({ mobileNumber: driver?.mobileNumber })

        //VERIFY DRIVER LINCENSE
        const driverLincenseVerification = await verifyDriverLicense(req.files.driverLincenseImgFront[0], req.files.driverLincenseImgBack[0]);
        if (!driverLincenseVerification.success) {
            return sendResponse(res, 400, false, `Invalid Driver Lincense card Image. Provide a Valid driver Lincense Card Image`);
        }

        //VERIFY FACE
        const idPhotoBuffer = driverLincenseVerification.photo;
        const profilePhotoBuffer = req.files.profileImg[0].buffer;
        const faceMatchResult = await matchFace(idPhotoBuffer, profilePhotoBuffer);
        if (!faceMatchResult.success) {
            return sendResponse(res, 400, false, `Face matching failed. Ensure your selfie matches your ID photo`);
        }

        // Upload images and get URLs
        const folder = 'driver-id-cards';
        const driverLincenseImgFrontUrl = await uploadFile(req.files.driverLincenseImgFront[0], folder);
        console.log('driverLincenseImgFrontUrl', driverLincenseImgFrontUrl)
        const driverLicenseImgBackUrl = await uploadFile(req.files.driverLincenseImgBack[0], folder);
        console.log('driverLicenseImgBackUrl', driverLicenseImgBackUrl)
        const profileImgUrl = await uploadFile(req.files.profileImg[0], 'driver-profile-image');
        console.log('profileImgUrl', profileImgUrl)
        let carImgUrl
        let carImgFile = req.files?.carImg?.[0] || req.files?.['carDetails[carImg]']?.[0];

        if (carImgFile) {
            console.log('Car image upload:', carImgFile);
            carImgUrl = await uploadFile(carImgFile, 'driver-car-image');
            console.log('carImgUrl', carImgUrl);
        }
        
        driver.firstName = getPassenger?.firstName || firstName
        driver.lastName = getPassenger?.lastName || lastName
        driver.middleName = getPassenger?.middleName || middleName
        driver.opreatingCity = opreatingCity
        driver.ssn = formatSsn.data,
        driver.driverLincenseImgFront = driverLincenseImgFrontUrl
        driver.driverLincenseImgBack = driverLicenseImgBackUrl
        driver.profileImg = profileImgUrl
        driver.pricePerKm = pricePerKm || '',
        driver.email = getPassenger?.email || email
        driver.status = 'online'
        driver.dob = dob
        driver.state = state
        driver.driverLincenseNumber = driverLincenseNumber
        driver.driverLincenseState = driverLincenseState
        driver.otpCode = ''

        await driver.save()

        const carData = {registrationNumber, year, model, color, noOfSeats, carImgUrl, active: true }
        //let newCarDetails
        //const carDataExist = await CarDetailModel.findOne({ driverId: driver?.driverId })
        //if(carDataExist){
        //    newCarDetails = carDataExist
        //} else {
        //    newCarDetails = await CarDetailModel.create({
        //        driverId: driver?.driverId
        //    })
        //}
        //newCarDetails.cars.push(carData)
        //await newCarDetails.save()
        // Ensure a driver can only have one car data by updating if it exists
        const updatedCarDetail = await CarDetailModel.findOneAndUpdate(
            { driverId: driver?.driverId }, // Search by driver ID
            { $set: { cars: [carData] } }, // Update cars array with the new data
            { new: true, upsert: true } // Return updated document, create if it doesn't exist
        );
        

        //const parsedCoordinates = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
        const parsedCoordinates = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
        const coordinatesArray = [parsedCoordinates.lng, parsedCoordinates.lat]; // [longitude, latitude]
        const newDriverLocation = await DriverLocationModel.create({
            driverId: driver?.driverId,
            name: `${driver?.firstName} ${driver?.lastName}`,
            location: { type: 'Point', coordinates: coordinatesArray },  //longitude first for GeoJSON
            isActive: true,
            status: 'online'
        })

        //new notification
        await NotificationModel.create({
            accountId: `${driver.driverId}`,
            message: `${driver.firstName} ${driver.lastName}, welcome to your new driver account. Its time to earn more money`
        })
        
        //send welcome email to user
        sendWelcomeEmail({
            email: driver.email,
            name: driver.firstName
        })

        //get device info
        // Extract device information
        const agent = useragent.parse(req.headers['user-agent']);
        const deviceInfo = agent.toString(); // e.g., "Chrome 110.0.0 on Windows 10"
        const deviceType = deviceInfo.split('/')[1]

        // Get user IP
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;

        // Fetch location details
        let locationInfo = 'Unknown';
        try {
            const { data } = await axios.get(`https://ipinfo.io/${ip}/json`);
            locationInfo = `${data.city}, ${data.region}, ${data.country}`;
        } catch (err) {
            console.log('Error fetching location:', err.message);
        }

        const userDeviceData = {
            device: deviceInfo,
            location: locationInfo,
            deviceType: deviceType
        }

        //CREATE NEW CANDIDATE
        const candidate = await createCandidate({
            first_name: driver?.firstName,
            middle_name: driver?.middleName,
            last_name: driver?.lastName,
            email: driver?.email,
            phone: driver?.mobileNumber,
            zipcode: driver?.zipcode,
            dob: driver?.dob,
            ssn: formatSsn.data,
            driver_license_number: driver?.driverLincenseNumber,
            driver_license_state: driver?.driverLincenseState,
            copy_requested: true
        })
        console.log('checkr candidate',candidate)
        if(!candidate.success){
            return sendResponse(res, 400, false, `${candidate.data.error}`)
        }

        driver.candidateId = candidate?.data?.id
        await driver.save()
        const candidateSignature = await CandidateSignatureModel.create({
            name: `${driver.firstName} ${driver.middleName || ''} ${driver.lastName}`,
            signature: signature,
            candidateId: candidate?.data?.id,
            email: driver.email,
            mobileNumber: driver.mobileNumber,
            userConsent: userConsent,
            userDeviceData
        })
        console.log('candidateSignature', candidateSignature, 'candidateSignature device', candidateSignature.userDeviceData)
        //INVITE CANDIDATE
        let sendInviteToCandidate
        if(candidate.success){
            sendInviteToCandidate = await inviteCandidate({
                candidate_id: candidate?.data?.id,
                package_name: process.env.CHECKR_PACKAGE_NAME,
                state: driver?.state
            })
        }

        console.log('sendInviteToCandidate', sendInviteToCandidate)
        if(!sendInviteToCandidate.success){
            return sendResponse(res, 400, false, `${sendInviteToCandidate.data.error}`)
        }
        //send invitation email to complete verification
        sendCheckrInvitationEmail({
            email: driver?.email,
            name: `${driver?.firstName} ${driver?.middleName || ''} ${driver?.lastName}`,
            buttonLink: sendInviteToCandidate?.data?.invitation_url
        })
        

        // Generate Tokens
        const accessToken = driver.getAccessToken()
        const refreshToken = driver.getRefreshToken()
        const getRefreshToken = await RefreshTokenModel.findOne({ accountId: driver?.driverId })
        if(!getRefreshToken){
            const newRefreshToken = await RefreshTokenModel.create({
                accountId: driver.driverId,
                refreshToken: refreshToken
            })
        }
        res.clearCookie(`inridedrivertoken`)

        // Set cookies
        res.cookie('inrideaccesstoken', accessToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie('inrideaccessid', driver?.driverId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, approved, active, isBlocked, resetPasswordToken, resetPasswordExpire, driverLincenseImgFront, driverLincenseImgBack, _id, ...userData } = driver._doc;
        return sendResponse(res, 200, true, userData, accessToken);
    } catch (error) {
        console.log('UNABLE TO COMPLETE PASSENGER TO DRIVER REGISTRATION', error)
        if (error.code === 11000 && error.keyPattern && error.keyPattern['cars.registrationNumber']) {
            return sendResponse(res, 400, false, 'Car registration number already exists. Please use a different one.');
        }
        sendResponse(res, 500, false, 'Uanble to complete driver registration')
    }
}

//New driver register
export async function registerNewDriver(req, res) {
    const { mobileNumber } = req.body
    console.log('NEW DRIVER NUMBER', mobileNumber)
    if(!mobileNumber){
        return sendResponse(res, 400, false, 'Provide a mobile number')
    }

    if (!usNumberRegex.test(mobileNumber)) {
        return sendResponse(res, 400, false, 'Invalid US mobile number. It must start with +1 and have 10 digits after.');
    }  

    try { 
        const numberExist = await DriverModel.findOne({ mobileNumber: mobileNumber })
        if(numberExist){
            return sendResponse(res, 400, false, 'Mobile number already exist')
        }


        const otpCode = await generateOtp(mobileNumber, 4, 'driver' )
        console.log('OTP CODE', otpCode)

        const driverId = await generateUniqueCode(8)
        console.log('DRIVER ID', `RF${driverId}DR`)
        
        if(otpCode){
            const newUser = await DriverModel.create({
                mobileNumber: mobileNumber,
                driverId: `RF${driverId}DR`
            })

            /**
             * 
            const sendOtpCode = await twilioClient.messages.create({
                body: `Your RideFuzz Otp code is: ${otpCode}`,
                from: `${process.env.TWILIO_PHONE_NUMBER}`,
                to: `${mobileNumber}`,
            })
            console.log('SMS BODY', sendOtpCode)
        
             */

            res.cookie('inridedrivertoken', newUser.driverId, {
                httpOnly: true,
                sameSite: 'None',
                secure: true,
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });

            return sendResponse(res, 201, true, `Verification Otp sent to: ${mobileNumber}. code is valid for 10min`, `${mobileNumber}, Code: ${otpCode}`)
        }


    } catch (error) {
        console.log('UNABLE TO REGISTER DRIVER NUMBER', error)
        return sendResponse(res, 500, false, 'Unable to register driver number')
    }
}

//RESEND OTP
export async function resendOtp(req, res) {
    const { mobileNumber } = req.body
    if(!mobileNumber){
        return sendResponse(res, 400, false, 'Mobile Number is required')
    }
    try {
        const getPassenger = await DriverModel.findOne({ mobileNumber })
        if(!getPassenger){
            return sendResponse(res, 404, false, 'No Account found with this number')
        }

        const otpCode = await generateOtp(mobileNumber, 4, 'driver' )
        console.log('OTP CODE', otpCode)
        
        if(otpCode){
            /**
             * 
            const sendOtpCode = await twilioClient.messages.create({
                body: `Your RideFuzz Otp code is: ${otpCode}`,
                from: `${process.env.TWILIO_PHONE_NUMBER}`,
                to: `${mobileNumber}`,
            })
            console.log('SMS BODY', sendOtpCode?.body)
        
             */
            return sendResponse(res, 201, true, `Verification Otp sent to: ${mobileNumber}`, `${mobileNumber} Code: ${otpCode}`)
        }


    } catch (error) {
        console.log('UNABLE TO RESENT OTP TO DRIVER', error)
        return sendResponse(res, 500, false, 'Unable to resend Otp code')
    }
}

//verify email and mobile number
export async function verifyPersonalDetails(req, res) {
    const { email, mobileNumber  } = req.body
    if(!email) return sendResponse(res, 400, false, 'Provide an Email address')
    if(!mobileNumber) return sendResponse(res, 400, false, 'Provide a mobile number')
    try {
        const findDriver = await DriverModel.findOne({ mobileNumber })
        if(!findDriver){
            return sendResponse(res, 404, false, 'Mobile number does not exist' )
        }
        if(!findDriver?.verified){
            return sendResponse(res, 403, false, 'Account not verified')
        }

        const findUserEmail = await DriverModel.findOne({ email })
        if(findUserEmail) return sendResponse(res, 404, false, 'Email already exist')
        
        return sendResponse(res, 200, true, 'Successful')
    } catch (error) {
        console.log('UNABLE TO VERIFY USER')
        return sendResponse(res, 500, false, 'Unable to verify user data')
    }
}

//verify ssn
export async function verifySSN(req, res) {
    const { ssn } = req.body
    if(!ssn){
        return sendResponse(res, 400, false, 'Provide a social security number')
    }
    const checkItisANumber = /^\d{9}$/.test(ssn); 
    if (!checkItisANumber) {
        return sendResponse(res, 400, false, 'Invalid ssn type');
    }
    const formatSsn = await formatSSN(ssn)
    if(!formatSsn.success){
        return sendResponse(res, 400, false, formatSsn.data)
    }
    try {
        const findSSN = await DriverModel.findOne({ ssn })
        if(findSSN){
            return sendResponse(res, 400, false, 'SSN already exist')   
        }

        return sendResponse(res, 200, true, 'SSN Verified')
    } catch (error) {
        console.log('UNABLE TO VERIFY SSN OF DRIVER')
        return sendResponse(res, 500, false, 'Unable to verify driver SSN')
    }
}

//Complete new driver registration
export async function completeNewDriverRegistration(req, res) {
    const { mobileNumber, email, firstName, middleName, lastName, opreatingCity, ssn, carDetails, pricePerKm, coordinates, state, dob, zipcode, driverLincenseNumber, driverLincenseState, userConsent, signature } = req.body
    const accountId = req.cookies.inridedrivertoken;
    
    // Validate required fields
    if (!email) return sendResponse(res, 400, false, `Provide an email address`);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    if (!firstName) return sendResponse(res, 400, false, `Provide a first name`);
    if (!lastName) return sendResponse(res, 400, false, `Provide a last name`);
    if (!ssn) return sendResponse(res, 400, false, `Provide a social security number`);
    const formatSsn = await formatSSN(ssn)
    if(!formatSsn.success){
        return sendResponse(res, 400, false, formatSsn.data)
    }
    if(!opreatingCity){
        return sendResponse(res, 400, false, 'Opreating city is required')
    }
    if(!driverLincenseNumber){
        return sendResponse(res, 400, false, 'Driver linsence number is required')
    }
    if(!driverLincenseState){
        return sendResponse(res, 400, false, 'Please provide driver lincense state')
    }
    if(!zipcode){
        return sendResponse(res, 400, false, 'Please provide zipcode')
    }
    if(!dob){
        return sendResponse(res, 400, false, 'Please provide date of birth')
    }
    const checkDob = isValidDOB(dob)
    if(!checkDob){
        return sendResponse(res, 400, false, 'Date of birth format is: YYYY-MM-DD')
    }
    if(!state){
        return sendResponse(res, 400, false, 'Please provide state of residence')
    }
    if(!userConsent){
        return sendResponse(res, 400, false, 'Please agree to background check/screen consent')
    }
    if(!signature){
        return sendResponse(res, 400, false, 'Your digital signature is required')
    }
    const expectedSignature = middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
    if(signature !== expectedSignature){
        return sendResponse(res, 400, false, 'Invalid Signature - does not match name')
    }
    if(!coordinates) return sendResponse(res, 400, false, 'Coordinates of driver location is required')
    //if(coordinates?.length < 2 || coordinates?.length > 2) return sendResponse(res, 400, false, 'Content of the coordinates is only: [longitude, latitude]')

    const { driverLincenseImgFront, driverLincenseImgBack, profileImg, carImg, } = req.files || {};
    //console.log('COMPLETE NEW DRIVER REG',req.body, req?.files)

    if (!driverLincenseImgFront || !driverLincenseImgFront[0]) return sendResponse(res, 400, false, `Provide a valid photo of the front image of driver lincense`);
    if (!driverLincenseImgBack || !driverLincenseImgBack[0]) return sendResponse(res, 400, false, `Provide a valid photo of the back image of driver lincense`);
    if (!profileImg || !profileImg[0]) return sendResponse(res, 400, false, `Provide a photo of your face`);

    const allowedImageTypes = ['image/jpeg', 'image/png'];
    if (!allowedImageTypes.includes(driverLincenseImgFront[0].mimetype)) {
        return sendResponse(res, 400, false, `Invalid image format for Driver lincense front. Accepted formats: jpeg, png`);
    }
    if (!allowedImageTypes.includes(driverLincenseImgBack[0].mimetype)) {
        return sendResponse(res, 400, false, `Invalid image format for Driver lincense back. Accepted formats: jpeg, png`);
    }
    if (!allowedImageTypes.includes(profileImg[0].mimetype)) {
        return sendResponse(res, 400, false, `Invalid image format for profile image. Accepted formats: jpeg, png`);
    }

    if(!carDetails){
        return sendResponse(res, 400, false, 'Car Details is required')
    }
    const {registrationNumber, year, model, color, noOfSeats } = carDetails
    if(!registrationNumber || !year || !model || !color || !noOfSeats){
        return sendResponse(res, 400, false, 'Car registration number, year, model, color, no of seats are required')
    }
    try {
        newDriver = await DriverModel.findOne({ driverId: accountId })
        if(!newDriver){
            return sendResponse(res, 403, false, 'No account found')
        }
        if(!newDriver?.verified){
            return sendResponse(res, 403, false, 'Mobile number not verified')
        }

        //VERIFY DRIVER LINCENSE
        const driverLincenseVerification = await verifyDriverLicense(req.files.driverLincenseImgFront[0], req.files.driverLincenseImgBack[0]);
        if (!driverLincenseVerification.success) {
            return sendResponse(res, 400, false, `Invalid Driver Lincense card Image. Provide a Valid driver Lincense Card Image`);
        }

        //VERIFY FACE
        const idPhotoBuffer = driverLincenseVerification.photo;
        const profilePhotoBuffer = req.files.profileImg[0].buffer;
        const faceMatchResult = await matchFace(idPhotoBuffer, profilePhotoBuffer);
        if (!faceMatchResult.success) {
            return sendResponse(res, 400, false, `Face matching failed. Ensure your selfie matches your ID photo`);
        }

        // Upload images and get URLs
        const folder = 'driver-id-cards';
        const driverLincenseImgFrontUrl = await uploadFile(req.files.driverLincenseImgFront[0], folder);
        const driverLicenseImgBackUrl = await uploadFile(req.files.driverLincenseImgBack[0], folder);
        const profileImgUrl = await uploadFile(req.files.profileImg[0], 'driver-profile-image');
        let carImgUrl = ''
        let carImgFile = req.files?.carImg?.[0] || req.files?.['carDetails[carImg]']?.[0];

        if (carImgFile) {
            console.log('Car image upload:', carImgFile);
            carImgUrl = await uploadFile(carImgFile, 'driver-car-image');
            console.log('carImgUrl', carImgUrl);
        }
                
        newDriver.firstName = firstName
        newDriver.lastName = lastName
        newDriver.middleName = middleName
        newDriver.email = email
        newDriver.ssn = formatSsn.data
        newDriver.opreatingCity = opreatingCity
        newDriver.driverLincenseImgFront = driverLincenseImgFrontUrl
        newDriver.driverLincenseImgBack = driverLicenseImgBackUrl,
        newDriver.idCardImgFront = driverLincenseImgFrontUrl
        newDriver.idCardImgBack = driverLicenseImgBackUrl,
        newDriver.profileImg = profileImgUrl,
        //newDriver.driverId = `RF${driverId}DR`,
        newDriver.idCardType = 'Driver\'s License',
        newDriver.pricePerKm = pricePerKm,
        newDriver.status = 'online',
        newDriver.dob = dob
        newDriver.state = state
        newDriver.driverLincenseNumber = driverLincenseNumber
        newDriver.driverLincenseState = driverLincenseState
        newDriver.otpCode = ''

        await newDriver.save()

        const carData = {registrationNumber, year, model, color, noOfSeats, carImgUrl, active: true }
        //let newCarDetails
        //const carDataExist = await CarDetailModel.findOne({ driverId: driver?.driverId })
        //if(carDataExist){
        //    newCarDetails = carDataExist
        //} else {
        //    newCarDetails = await CarDetailModel.create({
        //        driverId: newDriver?.driverId
        //    })
        //}
        //newCarDetails.cars.push(carData)
        //await newCarDetails.save()
        // Ensure a driver can only have one car data by updating if it exists
        const updatedCarDetail = await CarDetailModel.findOneAndUpdate(
            { driverId: driver?.driverId }, // Search by driver ID
            { $set: { cars: [carData] } }, // Update cars array with the new data
            { new: true, upsert: true } // Return updated document, create if it doesn't exist
        );

        //const parsedCoordinates = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
        const parsedCoordinates = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
        const coordinatesArray = [parsedCoordinates.lng, parsedCoordinates.lat]; // [longitude, latitude]
        const newDriverLocation = await DriverLocationModel.create({
            driverId: newDriver?.driverId,
            name: `${newDriver?.firstName} ${newDriver?.lastName}`,
            location: { type: 'Point', coordinates: coordinatesArray },  //longitude first for GeoJSON
            isActive: true,
            status: 'online'
        })

        //const deleteOtp = await OtpModel.findByIdAndDelete({ _id: verifyOtp._id })
        
        //new Notification
        await NotificationModel.create({
            accountId: `${newDriver?.driverId}`,
            message: `Welcome to a new Era. Get ride orders get money`
        })
        
        //send welcome email to user
        sendWelcomeEmail({
            email: newDriver.email,
            name: newDriver.firstName
        })

                //get device info
        // Extract device information
        const agent = useragent.parse(req.headers['user-agent']);
        const deviceInfo = agent.toString(); // e.g., "Chrome 110.0.0 on Windows 10"
        const deviceType = deviceInfo.split('/')[1]

        // Get user IP
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;

        // Fetch location details
        let locationInfo = 'Unknown';
        try {
            const { data } = await axios.get(`https://ipinfo.io/${ip}/json`);
            locationInfo = `${data.city}, ${data.region}, ${data.country}`;
        } catch (err) {
            console.log('Error fetching location:', err.message);
        }

        const userDeviceData = {
            device: deviceInfo,
            location: locationInfo,
            deviceType: deviceType
        }

        //CREATE NEW CANDIDATE
        const candidate = await createCandidate({
            first_name: newDriver?.firstName,
            middle_name: newDriver?.middleName,
            last_name: newDriver?.lastName,
            email: newDriver?.email,
            phone: newDriver?.mobileNumber,
            zipcode: newDriver?.zipcode,
            dob: newDriver?.dob,
            ssn: formatSsn.data,
            driver_license_number: newDriver?.driverLincenseNumber,
            driver_license_state: newDriver?.driverLincenseState,
            copy_requested: true
        })
        console.log('checkr candidate',candidate)
        if(!candidate.success){
            return sendResponse(res, 400, false, `${candidate.data.error}`)
        }
        
        newDriver.candidateId = candidate?.data?.id
        await newDriver.save()
        await CandidateSignatureModel.create({
            name: `${newDriver.firstName} ${newDriver.middleName || ''} ${newDriver.lastName}`,
            signature: signature,
            candidateId: candidate?.data?.id,
            email: newDriver.email,
            mobileNumber: newDriver.mobileNumber,
            userConsent: userConsent,
            userDeviceData
        })
        //INVITE CANDIDATE
        let sendInviteToCandidate
        if(candidate.success){
            sendInviteToCandidate = await inviteCandidate({
                candidate_id: candidate?.data?.id,
                package_name: process.env.CHECKR_PACKAGE_NAME,
                state: newDriver?.state
            })
        }
        console.log('sendInviteToCandidate',sendInviteToCandidate)
        if(!sendInviteToCandidate.success){
            return sendResponse(res, 400, false, `${sendInviteToCandidate.data.error}`)
        }

        //send invitation email to complete verification
        sendCheckrInvitationEmail({
            email: newDriver?.email,
            name: `${newDriver?.firstName} ${newDriver?.middleName || ''} ${newDriver?.lastName}`,
            buttonLink: sendInviteToCandidate?.data?.invitation_url
        })

        // Generate Tokens
        const accessToken = newDriver.getAccessToken()
        const refreshToken = newDriver.getRefreshToken()
        const getRefreshToken = await RefreshTokenModel.findOne({ accountId: newDriver?.driverId })
        if(!getRefreshToken){
            const newRefreshToken = await RefreshTokenModel.create({
                accountId: newDriver.driverId,
                refreshToken: refreshToken
            })
        }

        res.clearCookie(`inridedrivertoken`)

        // Set cookies
        res.cookie('inrideaccesstoken', accessToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie('inrideaccessid', newDriver?.driverId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, approved, active, isBlocked, resetPasswordToken, resetPasswordExpire, driverLincenseImgFront, driverLincenseImgBack, _id, ...userData } = newDriver._doc;
        return sendResponse(res, 200, true, userData, accessToken);
    } catch (error) {
        console.log('UNABLE TO COMPLETE NEW DRIVER REGISTRATION', error)
        if (error.code === 11000 && error.keyPattern && error.keyPattern['cars.registrationNumber']) {
            return sendResponse(res, 400, false, 'Car registration number already exists. Please use a different one.');
        }
        return sendResponse(res, 500, false, 'Unable to complete driver registration')
    }
}

//Sigining Driver
export async function signin(req, res) {
    const { mobileNumber } = req.body
    if(!mobileNumber){
        return sendResponse(res, 400, false, 'Provide a mobile number')
    }
    try { 
        const numberExist = await DriverModel.findOne({ mobileNumber: mobileNumber })
        if(!numberExist){
            return sendResponse(res, 404, false, 'Mobile number does not exist')
        }
        if(!numberExist.verified){
            return sendResponse(res, 403, false, 'Unverified account')
        }

        const otpCode = await generateOtp(mobileNumber, 4, 'driver' )
        console.log('OTP CODE', otpCode)
        
        if(otpCode){
            /**
             const sendOtpCode = await twilioClient.messages.create({
                 body: `Your RideFuze login Otp code is: ${otpCode}`,
                 from: `${process.env.TWILIO_PHONE_NUMBER}`,
                 to: `${mobileNumber}`,
                 messagingServiceSid: process.env.TWILIO_MESSAGE_SID
             })
             console.log('SMS BODY', sendOtpCode)
         
             * 
             */
            return sendResponse(res, 201, true, `Signin verification Otp sent to: ${mobileNumber}. code is valid for 10min`, `${mobileNumber} code: ${otpCode}`)
        }


    } catch (error) {
        console.log('UNABLE TO SIGNIN DRIVER', error)
        return sendResponse(res, 500, false, 'Unable to signin driver')
    }
}

//Sigining Driver with google
export async function signinWithGoogle(req, res) {
    const { email } = req.body
    if(!email){
        return sendResponse(res, 400, false, 'Provide a mobile number')
    }
    try { 
        const numberExist = await DriverModel.findOne({ email: email })
        if(!numberExist){
            return sendResponse(res, 404, false, 'Mobile number does not exist')
        }
        if(!numberExist.verified){
            return sendResponse(res, 403, false, 'Unverified account')
        }

        numberExist.status = 'online'
        numberExist.otpCode = ''
        await numberExist.save()
        const getDriverLocation = await DriverLocationModel.findOne({ driverId: numberExist?.driverId })
        getDriverLocation.status = 'online'
        getDriverLocation.isActive = true
        getDriverLocation.location = location
        await getDriverLocation.save()

        // Generate Tokens
        const accessToken = numberExist.getAccessToken()
        const refreshToken = numberExist.getRefreshToken()
        const getRefreshToken = await RefreshTokenModel.findOne({ accountId: numberExist?.driverId })
        if(!getRefreshToken){
            const newRefreshToken = await RefreshTokenModel.create({
                accountId: numberExist.driverId,
                refreshToken: refreshToken
            })
        }

        // Set cookies
        res.cookie('inrideaccesstoken', accessToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie('inrideaccessid', numberExist?.driverId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, approved, resetPasswordToken, resetPasswordExpire, driverLincenseImgFront, driverLincenseImgBack, _id, ...userData } = numberExist._doc;
        return sendResponse(res, 200, true, userData, accessToken);
    } catch (error) {
        console.log('UNABLE TO SIGNIN DRIVER', error)
        return sendResponse(res, 500, false, 'Unable to signin driver')
    }
}

//VERIFY LOGIN OTP
export async function verifyLoginOtp(req, res) {
    const { otp, location } = req.body

    if(!otp){
        return sendResponse(res, 400, false, 'Otp is required')
    }
    try {
        const getOtp = await OtpModel.findOne({ otp: otp })
        console.log('object', otp, getOtp)
        if(!getOtp){
            return sendResponse(res, 404, false, 'Invalid Otp Code')
        }
        const getDriver = await DriverModel.findOne({ mobileNumber: getOtp?.mobileNumber })
        if(!getDriver){
            return sendResponse(res, 404, false, 'Account does not exist')
        }

        const deleteOtp = await OtpModel.findByIdAndDelete({ _id: getOtp._id })
        getDriver.status = 'online'
        getDriver.otpCode = ''
        await getDriver.save()
        const getDriverLocation = await DriverLocationModel.findOne({ driverId: getDriver?.driverId })
        getDriverLocation.status = 'online'
        getDriverLocation.isActive = true
        getDriverLocation.location = location
        await getDriverLocation.save()

        // Generate Tokens
        const accessToken = getDriver.getAccessToken()
        const refreshToken = getDriver.getRefreshToken()
        const getRefreshToken = await RefreshTokenModel.findOne({ accountId: getDriver?.driverId })
        if(!getRefreshToken){
            const newRefreshToken = await RefreshTokenModel.create({
                accountId: getDriver.driverId,
                refreshToken: refreshToken
            })
        }

        // Set cookies
        res.cookie('inrideaccesstoken', accessToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie('inrideaccessid', getDriver?.driverId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, driverLincenseImgFront, driverLincenseImgBack, _id, ...userData } = getDriver._doc;
        return sendResponse(res, 200, true, userData, accessToken);
    } catch (error) {
        console.log('UNABLE TO VERIFY LOGIN OTP', error)
        return sendResponse(res, 500, false, 'Unable to verify login otp')
    }    
}

//VERIFY TOKEN
export async function verifyToken(req, res) {
    const accessToken = req.cookies.inrideaccesstoken;
    const accountId = req.cookies.inrideaccessid;
    try {
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                let user;
                if (decoded.accountType === 'driver') {
                    user = await DriverModel.findOne({ driverId: decoded.id });
                }
                if (!user) {
                    return sendResponse(res, 404, false, 'User not found');
                }
                if (!user.refreshToken) {
                    return sendResponse(res, 403, false, 'UnAuthenicated');
                }
                const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, driverLincenseImgFront, driverLincenseImgBack, ...userData } = user._doc;
                return sendResponse(res, 200, true, userData, accessToken);
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    if (accountId) {
                        let user = await DriverModel.findOne({ passengerId: accountId });
                        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId })
                        if (user && refreshTokenExist) {
                            const accessToken = user.getAccessToken()
                            res.cookie('inrideaccesstoken', accessToken, {
                                httpOnly: true,
                                sameSite: 'None',
                                secure: true,
                                maxAge: 15 * 60 * 1000, // 15 minutes
                            });
                            const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, driverLincenseImgFront, driverLincenseImgBack, ...userData } = user._doc;
                            return sendResponse(res, 200, true, userData, accessToken);
                        }
                    }
                    return sendResponse(res, 403, false, 'UnAuthenicated');
                }
            }
        } else if (accountId) {
            const user = await DriverModel.findOne({ driverId: accountId });
            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId })
            if (user && refreshTokenExist) {
                const accessToken = user.getAccessToken()
                res.cookie('inrideaccesstoken', accessToken, {
                    httpOnly: true,
                    sameSite: 'None',
                    secure: true,
                    maxAge: 15 * 60 * 1000, // 15 minutes
                });
                const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, driverLincenseImgFront, driverLincenseImgBack, ...userData } = user._doc;
                return sendResponse(res, 200, true, userData, accessToken);
            }
        }
        return sendResponse(res, 403, false, 'UnAuthenicated');
    } catch (error) {
        console.log('UNABLE TO VERIFY TOKEN', error)   
        return sendResponse(res, 500, false, 'Unable to verify token')
    }
}

/**
 
*/
export async function createnew(req, res) {
    try {
        const driverId = await generateUniqueCode(8)
        console.log('DRIVER ID', `RF${driverId}DR`)

        const data = {
            mobileNumber: '+12240898878',
            firstName: 'john',
            middleName: 'doe',
            lastName: 'Man',
            zipcode: '95814',
            email: 'successakin123@gmail.com',
            opreatingCity: 'Lagos',
            pricePerKm: 100,
            ssn: '111-11-2003', //'111-11-2003',
            idCardImgFront: 'https://img.freepik.com/free-vector/business-id-card-with-minimalist-elements_23-2148708734.jpg',
            idCardImgBack: 'https://img.freepik.com/free-vector/business-id-card-with-minimalist-elements_23-2148708734.jpg',
            profileImg: 'https://img.freepik.com/free-vector/business-id-card-with-minimalist-elements_23-2148708734.jpg',
            idCardType: 'Driver Lincense',
            driverLincenseImgFront: 'https://img.freepik.com/free-vector/business-id-card-with-minimalist-elements_23-2148708734.jpg',
            driverLincenseImgBack: 'https://img.freepik.com/free-vector/business-id-card-with-minimalist-elements_23-2148708734.jpg',
            driver_license_number: '981736076', //'' '1234555',
            driver_license_state: 'CT',
            dob: '1964-03-15',
            state: 'CA',
            verified: true,
            driverId: `RF${driverId}DR`,
            status: 'online'
        }

        const candidate = await createCandidate({
            first_name: data?.firstName,
            middle_name: data?.middleName,
            last_name: data?.lastName,
            email: data?.email,
            phone: data?.mobileNumber,
            zipcode: data?.zipcode,
            dob: data?.dob,
            ssn: data?.ssn,
            driver_license_number: data?.driver_license_number,
            driver_license_state: data?.driver_license_state,
            copy_requested: true
        })
        console.log('NEW CANDIDATE', candidate)
        console.log('candidate.data', candidate.data.error)
        
        let sendInviteToCandidate
        //INVITE CANDIDATE
        if(candidate.success){
            console.log('INVITE CANDIDATE')
            sendInviteToCandidate = await inviteCandidate({
                candidate_id: candidate?.data?.id,
                package_name: process.env.CHECKR_PACKAGE_NAME,
                state: data?.state
            })
        }
        console.log('CANDIDATE INVITESS', sendInviteToCandidate.data)

        //send invitation email to complete verification
        sendCheckrInvitationEmail({
            email: data?.email,
            name: `${data?.firstName} ${data?.middleName || ''} ${data?.lastName}`,
            buttonLink: sendInviteToCandidate.data.invitation_url
        })

        const newUser = await DriverModel.create(data)
        newUser.candidateId = candidate?.data?.id
        await newUser.save()
        const carDetails = {
            driverId: newUser?.driverId,
            cars: [
                {
                    registrationNumber: '0034t49',
                    year: '2025',
                    model: 'Hyundai',
                    color: 'Black',
                    noOfSeats: '6',
                    carImgUrl: 'https://i.ibb.co/5nmWk7p/photo-1536700503339-1e4b06520771.jpg',
                    active: false
                },
                {
                    registrationNumber: '245fr',
                    year: '2025',
                    model: 'Benz',
                    color: 'Black',
                    noOfSeats: '4',
                    carImgUrl: 'https://i.ibb.co/5nmWk7p/photo-1536700503339-1e4b06520771.jpg',
                    active: true
                }
            ]
        }
        const newCar = await CarDetailModel.create(carDetails)
        const newDriverLocation = await DriverLocationModel.create({
            driverId: newUser?.driverId,
            name: `${newUser?.firstName} ${newUser?.lastName}`,
            location: {
                "type": "Point",
                "coordinates": [
                    3.3792057,
                    6.5243793
                ]
            },
            isActive: true,
            status: 'online'
        })
        console.log('NEW DRIVER LOCATION', newDriverLocation)
        return sendResponse(res, 201, true, newUser, 'DRIVER CREATED')
    } catch (error) {
        console.log('ERROR', error)
    }
}

/**
 export async function createnew(req, res){
     try {
         //const allDrivers = await DriverModel.deleteMany()
         //const allDriverCars = await CarDetailModel.deleteMany()
         //const allDriverLocations = await DriverLocationModel.deleteMany()
         const driver = await DriverModel.findOne({ email: 'aremu.moses2022@gmail.com' })
         driver.approved = true
         driver.active = true
         driver.verified = true
         await driver.save()
         sendResponse(res, 200, true, driver, 'Driver Approved')
 
         //sendResponse(res, 200, true, { allDrivers, allDriverCars, allDriverLocations }, 'All Drivers')
     } catch (error) {
         console.log('ERROR', error)
     }
 }
*/