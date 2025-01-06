import twilioClient from "../middlewares/twilioConfig.js";
import { generateOtp, generateUniqueCode, sendResponse, uploadFile } from "../middlewares/utils.js";
import { matchFace, verifyID } from "../middlewares/verificationService.js";
import OtpModel from "../model/Otp.js";
import PassengerModel from "../model/Passenger.js";
import RefreshTokenModel from "../model/RefreshToken.js";

//REGISTER MOBILE NUMBER
export async function registerNumber(req, res) {
    const { mobileNumber } = req.body
    if(!mobileNumber){
        return sendResponse(res, 400, false, 'Provide a mobile number')
    }
    try { 
        const numberExist = await PassengerModel.findOne({ mobileNumber: mobileNumber })
        if(numberExist){
            return sendResponse(res, 400, false, 'Mobile number already exist')
        }

        const otpCode = await generateOtp(mobileNumber, 4, 'passenger' )
        console.log('OTP CODE', otpCode)
        
        if(otpCode){
            const newUser = await PassengerModel.create({
                mobileNumber: mobileNumber
            })

            const sendOtpCode = await twilioClient.messages.create({
                body: `Your Inride Otp code is: ${otpCode}`,
                from: `${process.env.TWILIO_PHONE_NUMBER}`,
                to: `${mobileNumber}`,
            })
            console.log('SMS BODY', sendOtpCode)
        
            return sendResponse(res, 201, true, `Verification Otp sent to: ${mobileNumber}. code is valid for 10min`, `${mobileNumber}`)
        }


    } catch (error) {
        console.log('UNABLE TO REGISTER USER NUMBER', error)
        return sendResponse(res, 500, false, 'Unable to register user number')
    }
}

//RESEND OTP
export async function resendOtp(req, res) {
    const { mobileNumber } = req.body
    if(!mobileNumber){
        return sendResponse(res, 400, false, 'Mobile Number is required')
    }
    try {
        const getPassenger = await PassengerModel.findOne({ mobileNumber })
        if(!getPassenger){
            return sendResponse(res, 404, false, 'No Account found with this number')
        }

        const otpCode = await generateOtp(mobileNumber, 4, 'passenger' )
        console.log('OTP CODE', otpCode)
        
        if(otpCode){
            const newUser = await PassengerModel.create({
                mobileNumber: mobileNumber
            })

            const sendOtpCode = await twilioClient.messages.create({
                body: `Your Inride Otp code is: ${otpCode}`,
                from: `${process.env.TWILIO_PHONE_NUMBER}`,
                to: `${mobileNumber}`,
            })
            console.log('SMS BODY', sendOtpCode?.body)
        
            return sendResponse(res, 201, true, `Verification Otp sent to: ${mobileNumber}`, `${mobileNumber}`)
        }


    } catch (error) {
        console.log('UNABLE TO RESENT OTP TO USER', error)
        return sendResponse(res, 500, false, 'Unable to resend Otp code')
    }
}

//REGISTER DETAILS
export async function registerUser(req, res) {
    const { email, firstName, lastName, ssn, idCardType, mobileNumber } = req.body;

    // Validate required fields
    if (!email) return sendResponse(res, 400, false, `Provide an email address`);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    if (!firstName) return sendResponse(res, 400, false, `Provide a first name`);
    if (!lastName) return sendResponse(res, 400, false, `Provide a last name`);
    if (!["driverLicense", "internationalPassport", "voterCard"].includes(idCardType)) {
        return sendResponse(res, 400, false, `ID card type must be: Driver License, International Passport, or Voter's Card`);
    }
    
    const { idCardImgFront, idCardImgBack, profileImg } = req.files;
    if (!idCardImgFront || !idCardImgFront[0]) return sendResponse(res, 400, false, `Provide the front image of your ID card`);
    if (!idCardImgBack || !idCardImgBack[0]) return sendResponse(res, 400, false, `Provide the back image of your ID card`);
    if (!profileImg || !profileImg[0]) return sendResponse(res, 400, false, `Provide a photo of your face`);

    const allowedImageTypes = ['image/jpeg', 'image/png'];
    if (!allowedImageTypes.includes(idCardImgFront[0].mimetype)) {
        return sendResponse(res, 400, false, `Invalid image format for ID card front. Accepted formats: jpeg, png`);
    }
    if (!allowedImageTypes.includes(idCardImgBack[0].mimetype)) {
        return sendResponse(res, 400, false, `Invalid image format for ID card back. Accepted formats: jpeg, png`);
    }
    if (!allowedImageTypes.includes(profileImg[0].mimetype)) {
        return sendResponse(res, 400, false, `Invalid image format for profile image. Accepted formats: jpeg, png`);
    }

    try {
        const newPassenger = await PassengerModel.findOne({ mobileNumber })
        if(!newPassenger?.verified){
            return sendResponse(res, 403, false, 'Mobile number not verified')
        }
        const idVerification = await verifyID(idCardImgFront[0], idCardImgBack[0]);
        if (!idVerification.success) {
            return sendResponse(res, 400, false, `Invalid ID card Image. Provide a Valid ID Card Image`);
        }

        const idPhotoBuffer = idVerification.photo;
        const profilePhotoBuffer = profileImg[0].buffer;
        const faceMatchResult = await matchFace(idPhotoBuffer, profilePhotoBuffer);
        if (!faceMatchResult.success) {
            return sendResponse(res, 400, false, `Face matching failed. Ensure your selfie matches your ID photo`);
        }

        // Upload images and get URLs
        const folder = 'passenger-id-cards';
        const idCardImgFrontUrl = await uploadFile(idCardImgFront[0], folder);
        const idCardImgBackUrl = await uploadFile(idCardImgBack[0], folder);
        const profileImgUrl = await uploadFile(profileImg[0], 'passenger-profile-image');

        const passengerId = await generateUniqueCode(8)
        console.log('PASSENGER ID', `IN${passengerId}PA`)


        newPassenger.firstName = firstName
        newPassenger.lastName = lastName
        newPassenger.email = email
        newPassenger.passengerId = `IN${passengerId}PA`,
        newPassenger.ssn = ssn
        newPassenger.idCardImgFront = idCardImgFrontUrl,
        newPassenger.idCardImgBack = idCardImgBackUrl,
        newPassenger.profileImg = profileImgUrl,
        newPassenger.idCardType = idCardType
        await newPassenger.save()

        //console.log('new passenger', newPassenger)

        // Generate Tokens
        const accessToken = newPassenger.getAccessToken()
        const refreshToken = newPassenger.getRefreshToken()
        const newRefreshToken = RefreshTokenModel.create({
            accountId: newPassenger.passengerId,
            refreshToken: refreshToken
        })

        // Set cookies
        res.cookie('inrideaccesstoken', accessToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie('inrideaccessid', newPassenger?.passengerId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, ...userData } = newPassenger._doc;
        return sendResponse(res, 200, true, userData, accessToken);
    } catch (error) {
        console.error('UNABLE TO REGISTER USER:', error);
        return sendResponse(res, 500, false, `Unable to register user. Please try again.`);
    }
}

//SIGNIN PASSENGER
export async function signin(req, res) {
    const { mobileNumber } = req.body
    if(!mobileNumber){
        return sendResponse(res, 400, false, 'Provide a mobile number')
    }
    try { 
        const numberExist = await PassengerModel.findOne({ mobileNumber: mobileNumber })
        if(!numberExist){
            return sendResponse(res, 400, false, 'Mobile number does not exist')
        }

        const otpCode = await generateOtp(mobileNumber, 4, 'passenger' )
        console.log('OTP CODE', otpCode)
        
        if(otpCode){
            const sendOtpCode = await twilioClient.messages.create({
                body: `Your Inride login Otp code is: ${otpCode}`,
                from: `${process.env.TWILIO_PHONE_NUMBER}`,
                to: `${mobileNumber}`,
            })
            console.log('SMS BODY', sendOtpCode)
        
            return sendResponse(res, 201, true, `Signin verification Otp sent to: ${mobileNumber}. code is valid for 10min`, `${mobileNumber}`)
        }


    } catch (error) {
        console.log('UNABLE TO SIGNIN PASSENGER', error)
        return sendResponse(res, 500, false, 'Unable to signin passenger')
    }
}

//VERIFY LOGIN OTP
export async function verifyLoginOtp(req, res) {
    const { otp } = req.body
    if(!otp){
        return sendResponse(res, 400, false, 'Otp is required')
    }
    try {
        const getOtp = await OtpModel.findOne({ otp })
        if(!getOtp){
            return sendResponse(res, 404, false, 'Invalid Otp Code')
        }
        const getPassenger = await PassengerModel.findOne({ mobileNumber: getOtp?.mobileNumber })
        if(!getPassenger){
            return sendResponse(res, 404, false, 'Account does not exist')
        }

        // Generate Tokens
        const accessToken = getPassenger.getAccessToken()
        const refreshToken = getPassenger.getRefreshToken()
        const getRefreshToken = await RefreshTokenModel.findOne({ accountId: getPassenger?.passengerId })
        if(!getRefreshToken){
            const newRefreshToken = RefreshTokenModel.create({
                accountId: getPassenger.passengerId,
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
        res.cookie('inrideaccessid', getPassenger?.passengerId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, ...userData } = getPassenger._doc;
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
                if (decoded.accountType === 'passenger') {
                    user = await PassengerModel.findOne({ passengerId: decoded.id });
                }
                if (!user) {
                    return sendResponse(res, 404, false, 'User not found');
                }
                if (!user.refreshToken) {
                    return sendResponse(res, 403, false, 'UnAuthenicated');
                }
                const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, ...userData } = user._doc;
                return sendResponse(res, 200, true, userData, accessToken);
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    if (accountId) {
                        let user = await PassengerModel.findOne({ passengerId: accountId });
                        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId })
                        if (user && refreshTokenExist) {
                            const accessToken = user.getAccessToken()
                            res.cookie('inrideaccesstoken', accessToken, {
                                httpOnly: true,
                                sameSite: 'None',
                                secure: true,
                                maxAge: 15 * 60 * 1000, // 15 minutes
                            });
                            const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, ...userData } = user._doc;
                            return sendResponse(res, 200, true, userData, accessToken);
                        }
                    }
                    return sendResponse(res, 403, false, 'UnAuthenicated');
                }
            }
        } else if (accountId) {
            const user = await PassengerModel.findOne({ passengerId: accountId });
            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId })
            if (user && refreshTokenExist) {
                const accessToken = user.getAccessToken()
                res.cookie('inrideaccesstoken', accessToken, {
                    httpOnly: true,
                    sameSite: 'None',
                    secure: true,
                    maxAge: 15 * 60 * 1000, // 15 minutes
                });
                const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, ...userData } = user._doc;
                return sendResponse(res, 200, true, userData, accessToken);
            }
        }
        return sendResponse(res, 403, false, 'UnAuthenicated');
    } catch (error) {
        console.log('UNABLE TO VERIFY TOKEN', error)   
        return sendResponse(res, 500, false, 'Unable to verify token')
    }
}

//SIGNOUT
export async function signout(req, res) {
    const { passengerId } = req.user
    try {
        const getRefreshTokenToken = await RefreshTokenModel.findOneAndDelete({ accountId: passengerId })
        if(getRefreshTokenToken){
            const deleteToken = await RefreshTokenModel.findOneAndDelete({ accountId: passengerId })
        }
        res.clearCookie(`inrideaccesstoken`)
        res.clearCookie(`inrideaccessid`)

        return sendResponse(res, 200, true, 'Signout success')
    } catch (error) {
        console.log('UNABLE TO SIGNOUT PASSENGER', error)
        return sendResponse(res, 500, false, 'Unable to process signout')
    }
}


export async function del(req, res) {
    try {
        const deletepas = await PassengerModel.deleteMany() 
        res.status(200).json({ success: true})
    } catch (error) {
        console.log('object', error)
    }
}