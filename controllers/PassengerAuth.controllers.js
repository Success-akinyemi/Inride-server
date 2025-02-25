import { sendWelcomeEmail } from "../middlewares/mailTemplate.js.js";
import twilioClient from "../middlewares/twilioConfig.js";
import { generateOtp, generateUniqueCode, sendResponse, uploadFile } from "../middlewares/utils.js";
import { matchFace, verifyID } from "../middlewares/verificationService.js";
import OtpModel from "../model/Otp.js";
import PassengerModel from "../model/Passenger.js";
import RefreshTokenModel from "../model/RefreshToken.js";

//REGISTER MOBILE NUMBER
export async function registerNumber(req, res) {
    const { mobileNumber } = req.body
    console.log('PASSENGER REGISTER', req.body)
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
            const passengerId = await generateUniqueCode(8)
            console.log('PASSENGER ID', `RF${passengerId}PA`)
            const newPassengerId = `RF${passengerId}PA`
    
            const newUser = await PassengerModel.create({
                mobileNumber: mobileNumber,
                passengerId: newPassengerId
            })

            /**
             * //REMOVE LATER AFTER WORK DONE
            const sendOtpCode = await twilioClient.messages.create({
                body: `Your RideFuzz Otp code is: ${otpCode}`,
                from: `${process.env.TWILIO_PHONE_NUMBER}`,
                to: `${mobileNumber}`,
            })
            console.log('SMS BODY', sendOtpCode)
             */

            res.cookie('inridepassengertoken', newPassengerId, {
                httpOnly: true,
                sameSite: 'None',
                secure: true,
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });
        
            return sendResponse(res, 201, true, `Verification Otp sent to: ${mobileNumber}. code is valid for 10min`, `${mobileNumber}, Code: ${otpCode}`)
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

            const sendOtpCode = await twilioClient.messages.create({
                body: `Your Inride Otp code is: ${otpCode}`,
                from: `${process.env.TWILIO_PHONE_NUMBER}`,
                to: `${mobileNumber}`,
            })
            console.log('SMS BODY', sendOtpCode?.body)
        
            return sendResponse(res, 201, true, `Verification Otp sent to: ${mobileNumber}`, `${mobileNumber} Code: ${otpCode}`)
        }


    } catch (error) {
        console.log('UNABLE TO RESENT OTP TO USER', error)
        return sendResponse(res, 500, false, 'Unable to resend Otp code')
    }
}

//verify email and mobile number
export async function verifyPersonalDetails(req, res) {
    const { email, mobileNumber  } = req.body
    if(!email) return sendResponse(res, 400, false, 'Provide an Email address')
    if(!mobileNumber) return sendResponse(res, 400, false, 'Provide a mobile number')
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    try {
        const findUser = await PassengerModel.findOne({ mobileNumber })
        if(!findUser){
            return sendResponse(res, 404, false, 'Mobile number does not exist' )
        }
        if(!findUser?.verified){
            return sendResponse(res, 403, false, 'Account not verified')
        }

        const findUserEmail = await PassengerModel.findOne({ email })
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
    //convert to a number and check it is a valid number
    if(ssn?.length < 9 || ssn?.length > 9){
        return sendResponse(res, 400, false, 'Invalid ssn lenght')
    }
    try {
        const findSSN = await PassengerModel.findOne({ ssn })
        if(findSSN){
            return sendResponse(res, 400, false, 'SSN already exist')   
        }
        return sendResponse(res, 200, true, 'SSN Verified')
    } catch (error) {
        console.log('UNABLE TO VERIFY SSN')
        return sendResponse(res, 500, false, 'Unable to verify SSN')
    }
}

//REGISTER DETAILS
export async function registerUser(req, res) {
    const { email, firstName, lastName, ssn, idCardType, mobileNumber } = req.body;
    const accountId = req.cookies.inridepassengertoken;

    //console.log('REGSITRATION BODY', req.body)
    // Validate required fields
    if (!email) return sendResponse(res, 400, false, `Provide an email address`);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    if (!firstName) return sendResponse(res, 400, false, `Provide a first name`);
    if (!lastName) return sendResponse(res, 400, false, `Provide a last name`);
    //if (!ssn) return sendResponse(res, 400, false, `Provide a social security number`);
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
        const newPassenger = await PassengerModel.findOne({ passengerId: accountId })
        console.log('object', newPassenger)
        if(!newPassenger){
            return sendResponse(res, 403, false, 'No Account found')
        }
        if(!newPassenger?.verified){
            return sendResponse(res, 403, false, 'Mobile number not verified')
        }

        const emailExist = await PassengerModel.findOne({ email })
        if(emailExist){
            return sendResponse(res, 400, false, 'Email Already exist')
        }
        //console.log('idCardImgFront', idCardImgBack, idCardImgFront)
        const idVerification = await verifyID(req.files.idCardImgFront[0], req.files.idCardImgBack[0]);
        if (!idVerification.success) {
            return sendResponse(res, 400, false, `Invalid ID card Image. Provide a Valid ID Card Image`);
        }

        const idPhotoBuffer = idVerification.photo;
        const profilePhotoBuffer = req.files.profileImg[0].buffer;
        const faceMatchResult = await matchFace(idPhotoBuffer, profilePhotoBuffer);
        if (!faceMatchResult.success) {
            return sendResponse(res, 400, false, `Face matching failed. Ensure your selfie matches your ID photo`);
        }

        // Upload images and get URLs
        const folder = 'passenger-id-cards';
        const idCardImgFrontUrl = await uploadFile(req.files.idCardImgFront[0], folder);
        const idCardImgBackUrl = await uploadFile(req.files.idCardImgBack[0], folder);
        const profileImgUrl = await uploadFile(req.files.profileImg[0], 'passenger-profile-image');

        const passengerId = await generateUniqueCode(8)
        console.log('PASSENGER ID', `RF${passengerId}PA`)


        newPassenger.firstName = firstName
        newPassenger.lastName = lastName
        newPassenger.email = email
        //newPassenger.passengerId = `RF${passengerId}PA`,
        newPassenger.ssn = req.body.ssn
        newPassenger.idCardImgFront = idCardImgFrontUrl,
        newPassenger.idCardImgBack = idCardImgBackUrl,
        newPassenger.profileImg = profileImgUrl,
        newPassenger.idCardType = idVerification.cardType
        newPassenger.otpCode = ''
        await newPassenger.save()

        // Generate Tokens
        const accessToken = newPassenger.getAccessToken()
        const refreshToken = newPassenger.getRefreshToken()
        const newRefreshToken = await RefreshTokenModel.create({
            accountId: newPassenger.passengerId,
            refreshToken: refreshToken
        })

        //send welcome email to user
        sendWelcomeEmail({
            email: newPassenger.email,
            name: newPassenger.firstName
        })
        

        res.clearCookie(`inridepassengertoken`)

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

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, active, isBlocked, resetPasswordToken, resetPasswordExpire, _id, ...userData } = newPassenger._doc;
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
        if(!numberExist.verified){
            return sendResponse(res, 403, false, 'Unverified account')
        }

        //check if user register data already exist
        if(
            !numberExist?.email || 
            numberExist?.email === '' ||
            !numberExist?.firstName ||
            numberExist?.firstName === '' ||
            !numberExist?.lastName ||
            numberExist?.lastName === '' ||
            !numberExist?.ssn ||
            !numberExist?.profileImg ||
            !numberExist?.idCardImgFront ||
            !numberExist?.idCardImgBack
        ){
            return sendResponse(res, 403, false, 'register passenger information')
        }
        const otpCode = await generateOtp(mobileNumber, 4, 'passenger' )
        console.log('OTP CODE', otpCode)
        
        if(otpCode){
            /**
             const sendOtpCode = await twilioClient.messages.create({
                 body: `Your RideFuzz login Otp code is: ${otpCode}`,
                 from: `${process.env.TWILIO_PHONE_NUMBER}`,
                 to: `${mobileNumber}`,
             })
             console.log('SMS BODY', sendOtpCode)
         
             * 
             */
            return sendResponse(res, 201, true, `Signin verification Otp sent to: ${mobileNumber}. code is valid for 10min`, `${mobileNumber} code: ${otpCode}`)
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
        console.log('object data', otp, getOtp)
        if(!getOtp){
            return sendResponse(res, 404, false, 'Invalid Otp Code')
        }

        const getPassenger = await PassengerModel.findOne({ mobileNumber: getOtp?.mobileNumber })
        if(!getPassenger){
            return sendResponse(res, 404, false, 'Account does not exist')
        }
        getPassenger.otpCode = ''
        await getPassenger.save()

        const deleteOtp = await OtpModel.findByIdAndDelete({ _id: getOtp._id })

        // Generate Tokens
        const accessToken = getPassenger.getAccessToken()
        const refreshToken = getPassenger.getRefreshToken()
        const getRefreshToken = await RefreshTokenModel.findOne({ accountId: getPassenger?.passengerId })
        if(!getRefreshToken){
            const newRefreshToken = await RefreshTokenModel.create({
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

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, _id, ...userData } = getPassenger._doc;
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

//signup with google
export async function signupWithGoogle(req, res) {
    const { email } = req.body
    if(!email){
        return sendResponse(res, 400, false, 'Provide a email address')
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    try { 
        const emailExist = await PassengerModel.findOne({ email: email })
        if(emailExist){
            return sendResponse(res, 404, false, 'this email already exist exist')
        }

        const passengerId = await generateUniqueCode(8)
        console.log('PASSENGER ID', `RF${passengerId}PA`)
        const newPassengerId = `RF${passengerId}PA`

        const newUser = await PassengerModel.create({
            email: email,
            passengerId: newPassengerId,
            verified: true
        })

        // Generate Tokens
        const accessToken = newUser.getAccessToken()
        const refreshToken = newUser.getRefreshToken()
        const newRefreshToken = await RefreshTokenModel.create({
            accountId: newUser.passengerId,
            refreshToken: refreshToken
        })

        //send welcome email to user
        sendWelcomeEmail({
            email: email
        })
        

        // Set cookies
        res.cookie('inrideaccesstoken', accessToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie('inrideaccessid', newUser?.passengerId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, active, isBlocked, resetPasswordToken, resetPasswordExpire, _id, ...userData } = newUser._doc;
        sendResponse(res, 201, true, userData, 'Account Created')
    } catch (error) {
        console.log('UNABLE TO SIGNUP PASSENGER', error)
        return sendResponse(res, 500, false, 'Unable to signup passenger')
    }
}

//signin with google
export async function signinWithGoogle(req, res) {
    const { email } = req.body
    if(!email){
        return sendResponse(res, 400, false, 'Provide a email address')
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    try { 
        const emailExist = await PassengerModel.findOne({ email: email })
        if(!emailExist){
            return sendResponse(res, 404, false, 'this email does not exist exist')
        }

        // Generate Tokens
        const accessToken = emailExist.getAccessToken()
        const refreshToken = emailExist.getRefreshToken()
        const newRefreshToken = await RefreshTokenModel.create({
            accountId: emailExist.passengerId,
            refreshToken: refreshToken
        })
   

        // Set cookies
        res.cookie('inrideaccesstoken', accessToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie('inrideaccessid', emailExist?.passengerId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, active, isBlocked, resetPasswordToken, resetPasswordExpire, _id, ...userData } = emailExist._doc;
        sendResponse(res, 200, true, userData, 'Account Created')
    } catch (error) {
        console.log('UNABLE TO SIGNIN PASSENGER', error)
        return sendResponse(res, 500, false, 'Unable to signin passenger')
    }
}

//complete user registration
export async function completeRegisterUser(req, res) {
    const { firstName, lastName, ssn, idCardType, mobileNumber } = req.body;
    const { passengerId } = req.user
    
    // Validate required fields
    if (!mobileNumber) return sendResponse(res, 400, false, `Provide a mobile number`);
    if (!firstName) return sendResponse(res, 400, false, `Provide a first name`);
    if (!lastName) return sendResponse(res, 400, false, `Provide a last name`);
    if (!ssn) return sendResponse(res, 400, false, `Provide a social security number`);
    if (!["driverLicense", "internationalPassport", "voterCard"].includes(idCardType)) {
        return sendResponse(res, 400, false, `ID card type must be: Driver License, International Passport, or Voter's Card`);
    }
    
    const { idCardImgFront, idCardImgBack, profileImg } = req.files;
    //console.log('idCardImgFront', idCardImgBack, req.files)
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
        const newPassenger = await PassengerModel.findOne({ passengerId })

        //console.log('idCardImgFront', idCardImgBack, idCardImgFront)
        const idVerification = await verifyID(req.files.idCardImgFront[0], req.files.idCardImgBack[0]);
        if (!idVerification.success) {
            return sendResponse(res, 400, false, `Invalid ID card Image. Provide a Valid ID Card Image`);
        }

        const idPhotoBuffer = idVerification.photo;
        const profilePhotoBuffer = req.files.profileImg[0].buffer;
        const faceMatchResult = await matchFace(idPhotoBuffer, profilePhotoBuffer);
        if (!faceMatchResult.success) {
            return sendResponse(res, 400, false, `Face matching failed. Ensure your selfie matches your ID photo`);
        }

        // Upload images and get URLs
        const folder = 'passenger-id-cards';
        const idCardImgFrontUrl = await uploadFile(req.files.idCardImgFront[0], folder);
        const idCardImgBackUrl = await uploadFile(req.files.idCardImgBack[0], folder);
        const profileImgUrl = await uploadFile(req.files.profileImg[0], 'passenger-profile-image');

        newPassenger.firstName = firstName
        newPassenger.lastName = lastName
        newPassenger.email = email
        newPassenger.ssn = req.body.ssn
        newPassenger.idCardImgFront = idCardImgFrontUrl,
        newPassenger.idCardImgBack = idCardImgBackUrl,
        newPassenger.profileImg = profileImgUrl,
        newPassenger.idCardType = idVerification.cardType
        newPassenger.mobileNumber = mobileNumber
        await newPassenger.save()

        // Generate Tokens
        const accessToken = newPassenger.getAccessToken()
        const refreshToken = newPassenger.getRefreshToken()
        const newRefreshToken = await RefreshTokenModel.create({
            accountId: newPassenger.passengerId,
            refreshToken: refreshToken
        })

        //send welcome email to user
        sendWelcomeEmail({
            email: newPassenger.email,
            name: newPassenger.firstName
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

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, active, isBlocked, resetPasswordToken, resetPasswordExpire, _id, ...userData } = newPassenger._doc;
        return sendResponse(res, 200, true, 'Account updated');
    } catch (error) {
        console.error('UNABLE TO COMPLETE REGISTER USER:', error);
        return sendResponse(res, 500, false, `Unable to complete register user. Please try again.`);
    }
}

/** 
 */
export async function createnew(req, res) {
    try {
        const passengerId = await generateUniqueCode(8)
        console.log('PASSENGER ID', `RF${passengerId}PA`)

        const data = {
            mobileNumber: "+2349059309836",
            firstName: "Inride",
            lastName: "User",
            email: "user@gmail.com",
            passengerId: `RF${passengerId}PA`,
            ssn: '123456789',
            idCardImgFront: 'https://img.freepik.com/free-vector/business-id-card-with-minimalist-elements_23-2148708734.jpg',
            idCardImgBack: 'https://img.freepik.com/free-vector/business-id-card-with-minimalist-elements_23-2148708734.jpg',
            profileImg: 'https://img.freepik.com/free-vector/business-id-card-with-minimalist-elements_23-2148708734.jpg',
            accountImg: 'https://img.freepik.com/free-vector/business-id-card-with-minimalist-elements_23-2148708734.jpg',
            verified: true,
        }

        const newPassenger = await PassengerModel.create(data)

        sendWelcomeEmail({
            email: 'jeniferakinyemi445@gmail.com',
            name: 'Brown'
        })

        sendResponse(res, 201, true, 'User created', newPassenger)
    } catch (error) {
        console.log('error', error)
    }
}