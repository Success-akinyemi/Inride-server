import twilioClient from "../middlewares/twilioConfig.js"
import { generateOtp, generateUniqueCode, sendResponse } from "../middlewares/utils.js";
import { matchFace, verifyDriverLicense } from "../middlewares/verificationService.js";
import CarDetailModel from "../model/CarDetails.js";
import DriverModel from "../model/Driver.js"
import DriverLocationModel from "../model/DriverLocation.js";
import OtpModel from "../model/Otp.js";
import PassengerModel from "../model/Passenger.js";
import RefreshTokenModel from "../model/RefreshToken.js";


//Register user passenger account - use id from cookie to get user
export async function registerWithPassengerAccount(req, res) {
    const accountId = req.cookies.inrideaccessid;
    if(!accountId){
        return sendResponse(res, 400, false, 'Please Login in to perform this action')
    }
    try {
        const getPassenger = await PassengerModel.findOne({ passengerId: accountId })
        if(!getPassenger){
            return sendResponse(res, 404, false, 'Account does not exist' )
        }

        const findDriver = await DriverModel.findOne({ mobileNumber: getPassenger?.mobileNumber })
        if(findDriver){
            return sendResponse(res, 400, false, 'Driver account already exist' )
        }

        const driverId = await generateUniqueCode(8)
        console.log('DRIVER ID', `RF${driverId}DR`)

        const newDriver = await DriverModel.create({
            mobileNumber: getPassenger?.mobileNumber,
            firstName: getPassenger?.firstName,
            lastName: getPassenger?.lastName,
            email: getPassenger?.email,
            driverId: `RF${driverId}DR`,
            idCardImgFront: getPassenger?.idCardImgFront,
            idCardImgBack: getPassenger?.idCardImgBack,
            profileImg: getPassenger?.profileImg,
            idCardType: getPassenger?.idCardType,
            verified: true
        })

        return sendResponse(res, 201, true, 'Driver Account created Successful', newDriver?.mobileNumber)
    } catch (error) {
        console.log('UNABLE TO REGISTER DRIVER ACCOUNT', error)
        return sendResponse(res, 500, )
    }
}

//Complete registration for driver who created account with passenger account
export async function completeDriverRegistration(req, res) {
    const {ssn, opreatingCity, carDetails, mobileNumber, pricePerKm } = req.body
    const accountId = req.cookies.inrideaccessid;

    if(!opreatingCity){
        return sendResponse(res, 400, false, 'Opreating city is required')
    }

    const { driverLincenseImgFront, driverLincenseImgBack, profileImg } = req.files;
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

    if(!carDetails || carDetails?.length < 1){
        return sendResponse(res, 400, false, 'Car Details is required')
    }
    const {registrationNumber, year, model, color, noOfSeats, carImg} = carDetails
    if(!registrationNumber || !year || !model || !color || !noOfSeats){
        return sendResponse(res, 400, false, 'Car registration number, year, model, color, no of seats are required')
    }
    try {
        let driver
        if(mobileNumber){
            driver = await DriverModel.findOne({ mobileNumber })
        } else {
            driver = await DriverModel.findOne({ driverId: accountId })
        }
        if(!driver){
            return sendResponse(res, 404, false, 'Account not found')
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
        

        driver.opreatingCity = opreatingCity
        driver.ssn = ssn ? ssn : '',
        driver.driverLincenseImgFront = driverLincenseImgFrontUrl
        driver.driverLincenseImgBack = driverLicenseImgBackUrl
        driver.profileImg = profileImgUrl
        driver.pricePerKm = pricePerKm,
        driver.status = 'online'

        await driver.save()

        const carData = {registrationNumber, year, model, color, noOfSeats, carImg}
        const newCarDetails = await CarDetailModel.create({
            driverId: driver?.driverId
        })
        newCarDetails.cars.push(carData)
        await newCarDetails.save()

        const newDriverLocation = await DriverLocationModel.create({
            driverId: driver?.driverId,
            name: `${driver?.firstName} ${driver?.lastName}`,
            isActive: true,
            status: 'online'
        })

        // Generate Tokens
        const accessToken = driver.getAccessToken()
        const refreshToken = driver.getRefreshToken()
        const getRefreshToken = await RefreshTokenModel.findOne({ accountId: driver?.driverId })
        if(!getRefreshToken){
            const newRefreshToken = RefreshTokenModel.create({
                accountId: driver.driverId,
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
        res.cookie('inrideaccessid', driver?.driverId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, driverLincenseImgFront, driverLincenseImgBack, _id, ...userData } = driver._doc;
        return sendResponse(res, 200, true, userData, accessToken);
    } catch (error) {
        
    }
}

//New driver register
export async function registerNewDriver(req, res) {
    const { mobileNumber } = req.body
    if(!mobileNumber){
        return sendResponse(res, 400, false, 'Provide a mobile number')
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

            const sendOtpCode = await twilioClient.messages.create({
                body: `Your RideFuzz Otp code is: ${otpCode}`,
                from: `${process.env.TWILIO_PHONE_NUMBER}`,
                to: `${mobileNumber}`,
            })
            console.log('SMS BODY', sendOtpCode)
        
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

            const sendOtpCode = await twilioClient.messages.create({
                body: `Your RideFuzz Otp code is: ${otpCode}`,
                from: `${process.env.TWILIO_PHONE_NUMBER}`,
                to: `${mobileNumber}`,
            })
            console.log('SMS BODY', sendOtpCode?.body)
        
            return sendResponse(res, 201, true, `Verification Otp sent to: ${mobileNumber}`, `${mobileNumber} Code: ${otpCode}`)
        }


    } catch (error) {
        console.log('UNABLE TO RESENT OTP TO DRIVER', error)
        return sendResponse(res, 500, false, 'Unable to resend Otp code')
    }
}

//Complete new driver registration
export async function completeNewDriverRegistration(req, res) {
    const { mobileNumber, email, firstName, lastName, opreatingCity, ssn, carDetails, pricePerKm} = req.body
    
    // Validate required fields
    if (!email) return sendResponse(res, 400, false, `Provide an email address`);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    if (!firstName) return sendResponse(res, 400, false, `Provide a first name`);
    if (!lastName) return sendResponse(res, 400, false, `Provide a last name`);
    if (!ssn) return sendResponse(res, 400, false, `Provide a social security number`);
    if(!opreatingCity){
        return sendResponse(res, 400, false, 'Opreating city is required')
    }

    const { driverLincenseImgFront, driverLincenseImgBack, profileImg } = req.files;
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

    if(!carDetails || carDetails?.length < 1){
        return sendResponse(res, 400, false, 'Car Details is required')
    }
    const {registrationNumber, year, model, color, noOfSeats, carImg} = carDetails
    if(!registrationNumber || !year || !model || !color || !noOfSeats){
        return sendResponse(res, 400, false, 'Car registration number, year, model, color, no of seats are required')
    }
    try {
        newDriver = await DriverModel.findOne({ mobileNumber })
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
                
        const driverId = await generateUniqueCode(8)
        console.log('DRIVER ID', `RF${driverId}DR`)

        newDriver.firstName = firstName
        newDriver.lastName = lastName
        newDriver.email = email
        newDriver.ssn = req.body.ssn
        newDriver.opreatingCity = opreatingCity
        newDriver.driverLincenseImgFront = driverLincenseImgFrontUrl
        newDriver.driverLincenseImgBack = driverLicenseImgBackUrl,
        newDriver.idCardImgFront = driverLincenseImgFrontUrl
        newDriver.idCardImgBack = driverLicenseImgBackUrl,
        newDriver.profileImg = profileImgUrl,
        newDriver.driverId = `RF${driverId}DR`,
        newDriver.idCardType = 'Driver\'s License',
        newDriver.pricePerKm = pricePerKm,
        newDriver.status = 'online'

        await newDriver.save()

        const carData = {registrationNumber, year, model, color, noOfSeats, carImg}
        const newCarDetails = await CarDetailModel.create({
            driverId: newDriver?.driverId
        })
        newCarDetails.cars.push(carData)
        await newCarDetails.save()

        const newDriverLocation = await DriverLocationModel.create({
            driverId: newDriver?.driverId,
            name: `${newDriver?.firstName} ${newDriver?.lastName}`,
            isActive: true,
            status: 'online'
        })

        // Generate Tokens
        const accessToken = newDriver.getAccessToken()
        const refreshToken = newDriver.getRefreshToken()
        const getRefreshToken = await RefreshTokenModel.findOne({ accountId: newDriver?.driverId })
        if(!getRefreshToken){
            const newRefreshToken = RefreshTokenModel.create({
                accountId: newDriver.driverId,
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
        res.cookie('inrideaccessid', newDriver?.driverId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, driverLincenseImgFront, driverLincenseImgBack, _id, ...userData } = newDriver._doc;
        return sendResponse(res, 200, true, userData, accessToken);
    } catch (error) {
        console.log('UNABLE TO COMPLETE NEW DRIVER REGISTRATION', error)
        return sendResponse()
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
            return sendResponse(res, 400, false, 'Mobile number does not exist')
        }

        const otpCode = await generateOtp(mobileNumber, 4, 'driver' )
        console.log('OTP CODE', otpCode)
        
        if(otpCode){
            const sendOtpCode = await twilioClient.messages.create({
                body: `Your RideFuzz login Otp code is: ${otpCode}`,
                from: `${process.env.TWILIO_PHONE_NUMBER}`,
                to: `${mobileNumber}`,
            })
            console.log('SMS BODY', sendOtpCode)
        
            return sendResponse(res, 201, true, `Signin verification Otp sent to: ${mobileNumber}. code is valid for 10min`, `${mobileNumber} code: ${otpCode}`)
        }


    } catch (error) {
        console.log('UNABLE TO SIGNIN DRIVER', error)
        return sendResponse(res, 500, false, 'Unable to signin driver')
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
        const getDriver = await DriverModel.findOne({ mobileNumber: getOtp?.mobileNumber })
        if(!getDriver){
            return sendResponse(res, 404, false, 'Account does not exist')
        }

        const deleteOtp = await OtpModel.findByIdAndDelete({ _id: getOtp._id })
        getDriver.status = 'online'
        await getDriver.save()
        const getDriverLocation = DriverLocationModel.findOne({ driverId: getDriver?.driverId })
        getDriverLocation.status = 'online'
        getDriverLocation.isActive = true
        await getDriverLocation.save()

        // Generate Tokens
        const accessToken = getDriver.getAccessToken()
        const refreshToken = getDriver.getRefreshToken()
        const getRefreshToken = await RefreshTokenModel.findOne({ accountId: getDriver?.driverId })
        if(!getRefreshToken){
            const newRefreshToken = RefreshTokenModel.create({
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