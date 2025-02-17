import { sendAccountSuspendedEmail, sendForgotPasswordEmail, sendNewLoginEmail, sendOtpEmail } from "../middlewares/mailTemplate.js.js"
import { generateOtp, generateUniqueCode, sendResponse } from "../middlewares/utils.js"
import AdminUserModel from "../model/Admin.js"
import OtpModel from "../model/Otp.js";
import moment from 'moment';
import RefreshTokenModel from "../model/RefreshToken.js";
import crypto from 'crypto'
import useragent from 'useragent';
import axios from 'axios';

function stringToNumberArray(code) {
    return code.split('').map(Number);
}
const MAX_LOGIN_ATTEMPTS = 4
const BLOCK_DURATION_HOURS = 6
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

//CREATE ACCOUNT
export async function createAccount(req, res) {
    const { firstName, lastName, email } = req.body
    if(!firstName){
        sendResponse(res, 400, false, 'Provide a first name')
        return
    }
    if(!lastName){
        sendResponse(res, 400, false, 'Provide a Last name')
        return
    }    
    if(!email){
        sendResponse(res, 400, false, 'Provide a email address')
        return
    }
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    try {
        const userExist = await AdminUserModel.findOne({ email })
        if(userExist){
            sendResponse(res, 403, false, 'User with this email already exist')
            return
        }

        const otpCode = await generateOtp(email, 4, 'admin' )
        console.log('OTP CODE', otpCode)
        if(otpCode){

            const adminId = await generateUniqueCode(8)
            console.log('ADMIN ID', `RF${adminId}AD`)
            const newAdminId = `RF${adminId}AD`    
            
            const newUser = await AdminUserModel.create({
                adminId: newAdminId,
                firstName,
                lastName,
                email,

                blocked: true,
            })

            //convert otp code to array
            const codeArray = stringToNumberArray(otpCode)
            //send OtP email
            try {
                sendOtpEmail({
                    email,
                    name: `${firstName} ${lastName}`,
                    code: codeArray,
                    buttonLink: `${process.env.CLIENT_URL}/verify-otp/${otpCode}`
                })
            } catch (error) {
                console.log('UANBLE TO SEND OTP EMAIL TO USER', error)
                sendResponse(res, 400, false, 'Unable to send otp code to email address please try again')
            }

            sendResponse(res, 201, true, 'Account created. Verify Email, OTP sent to Email Address')
            return
        }

    } catch (error) {
        console.log('UNABLE TO CREATE ADMIN USER ACCOUNT', error)
        sendResponse(res, 500, false, 'Unable to create admin user account')
    }
}

//RESEND OTP
export async function resendOtp(req, res) {
    const { email } = req.body
    if(!email){
        sendResponse(res, 400, false, 'Email address is required')
    }
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    try {
        const getUser = await AdminUserModel.findOne({ email })
        if(!getUser){
            sendResponse(res, 404, false, 'Invalid Email address')
            return
        }
        const otpCode = await generateOtp(email, 4, 'admin' )
        console.log('OTP CODE', otpCode)
        if(otpCode){

            //convert otp code to array
            const codeArray = stringToNumberArray(otpCode)
            //send OtP email
            try {
                sendOtpEmail({
                    email,
                    name: `${getUser?.firstName} ${getUser?.lastName}`,
                    code: codeArray,
                })
            } catch (error) {
                console.log('UANBLE TO RESEND OTP EMAIL TO USER', error)
                sendResponse(res, 400, false, 'Unable to resend otp code to email address please try again')
            }

            sendResponse(res, 201, true, 'Verification OTP sent to Email Address')
            return
        }

    } catch (error) {
        console.log('UNABLE TO RESEND OTP TO USER EMAIL', error)
        sendResponse(res, 500, false, 'Unable to resend OTP code')
    }
}

//VERIFY OTP
export async function verifyOtp(req, res) {
    const { otp } = req.body
    if(!otp){
        sendResponse(res, 400, false, 'Provide OTP code')
        return
    }
    try {
        const getOtp = await OtpModel.findOne({ otp })
        if(!getOtp){
            console.log('INVALID OTP'),
            sendResponse(res, 404, false, 'Invalid otp code')
            return
        }

        const getUser = await AdminUserModel.findOne({ email: getOtp?.mobileNumber })
        getUser.verified = true
        getUser.status = 'Active'
        await getUser.save()

        const deleteOtp = await OtpModel.findByIdAndDelete({ _id: getOtp?._id })

        res.cookie('inrideaccessid', getUser?.adminId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        sendResponse(res, 200, true, 'Account Verfied')
    } catch (error) {
        console.log('UANBLE TO VERIFY USER OTP', error)
        sendResponse(res, 500, false, 'Unable to verify OTP')
    }
}

//CREATE PASSWORD
export async function createPassword(req, res) {
    const { password, confirmPassword } = req.body
    const accountId = req.cookies.inrideaccessid;

    try {
        if (!password || !confirmPassword) {
            sendResponse(res, 400, false, 'Password and confirm password are required')
            return
        }
        if (password.length < 6) {
            sendResponse(res, 400, false, 'Passwords must be at least 6 characters long')
            return
        }

        const specialChars = /[!@#$%^&*()_+{}[\]\\|;:'",.<>?]/;
        if (!specialChars.test(password)) {
            sendResponse(res, 400, false, 'Passwords must contain at least one special character')
            return
        }
    
        if (password !== confirmPassword) {
            sendResponse(res, 400, false, 'Passwords do not match')
            return
        }
    

        const user = await AdminUserModel.findOne({ adminId: accountId })

        if(!user){
            sendResponse(res, 404, false, 'Invalid User')
            return
        }

        user.password = password
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined

        await user.save();
        res.clearCookie(`inrideaccessid`)

        sendResponse(res, 200, true, 'Password created successful')
    } catch (error) {
        console.log('UANBLE TO CREATE PASSWORD', error)
        sendResponse(res, 500, false, 'Unable to create password')
    }
}

//LOGIN
export async function login(req, res) {
    const { password, email } = req.body
    if(!email){
        sendResponse(res, 400, false, 'Email address is required')
        return
    } 
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    if(!password){
        sendResponse(res, 400, false, 'Password is required')
        return
    } 
    try {
        const getUser = await AdminUserModel.findOne({ email })
        if(!getUser){
            sendResponse(res, 404, false, 'Invalid User')
            return
        }
        if(!getUser?.verified){
            sendResponse(res, 403, false, getUser?.verified, 'Account is not yet verified')
            return
        }
        if(getUser?.status !== 'Active'){
            sendResponse(res, 403, false, getUser?.verified, 'Account is not active')
            return
        }
        if (getUser?.accountSuspended && getUser?.temporaryAccountBlockTime) {
            const blockExpiration = moment(getUser.temporaryAccountBlockTime);
            const currentTime = moment();
        
            if (currentTime.isBefore(blockExpiration)) {
                // User is still blocked
                return sendResponse(res, 403, false, `Your account is suspended until ${blockExpiration.format('YYYY-MM-DD HH:mm:ss')}`);
            } else {
                // Unblock getUser after time has passed
                getUser.accountSuspended = false;
                getUser.noOfLoginAttempts = 0; 
                getUser.temporaryAccountBlockTime = null;
                await getUser.save();
            }
        }
        if(getUser?.blocked){
            sendResponse(res, 403, false, 'Account has been blocked')
            return
        }

        //const comparePassword = password
        const isMatch  = await getUser.matchPassword(req.body.password)
        //console.log('MATCH', isMatch, req.body.password)
        if(!isMatch){
            if(getUser?.noOfLoginAttempts !== MAX_LOGIN_ATTEMPTS){
                getUser.noOfLoginAttempts += 1
                await getUser.save()
                sendResponse(res, 403, false, `Invalid email or password. You have ${Number(MAX_LOGIN_ATTEMPTS - getUser?.noOfLoginAttempts)} login left`)
                return
            }
            if(getUser?.noOfLoginAttempts >= MAX_LOGIN_ATTEMPTS){
                //block user for 6hrs
                getUser.temporaryAccountBlockTime = moment().add(BLOCK_DURATION_HOURS, 'hours').toISOString();
                getUser.accountSuspended = true
                await getUser.save()

                //sendAccount suspended email
                sendAccountSuspendedEmail({
                    email: getUser?.email,
                    name: `${getUser?.firstName} ${getUser?.lastName}`,
                    time: `${BLOCK_DURATION_HOURS} hours`
                })

                //send response
                sendResponse(res, 403, false, `Account has been suspended for ${BLOCK_DURATION_HOURS} hours`)
                return
            }
        }

        getUser.accountSuspended = false;
        getUser.noOfLoginAttempts = 0; 
        getUser.temporaryAccountBlockTime = null;
        getUser.lastLogin = Date.now()
        await getUser.save()
        //get device info
        // Extract device information
        const agent = useragent.parse(req.headers['user-agent']);
        const deviceInfo = agent.toString(); // e.g., "Chrome 110.0.0 on Windows 10"

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

        getUser.lastLoginInfo.unshift({
            device: deviceInfo,
            location: locationInfo,
        });

        // Limit history to the last 5 logins
        getUser.lastLoginInfo = getUser.lastLoginInfo.slice(0, 5);
        await getUser.save();
        

        // Generate Tokens
        const accessToken = getUser.getAccessToken()
        const refreshToken = getUser.getRefreshToken()
        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: getUser.adminId })
        if(refreshTokenExist){
            refreshTokenExist.accountId = getUser.adminId,
            refreshTokenExist.refreshToken = refreshToken
            await refreshTokenExist.save()
        } else {
            const newRefreshToken = await RefreshTokenModel.create({
                accountId: getUser.adminId,
                refreshToken: refreshToken
            })
        }

        //send login email notification
        const loginTime = moment(getUser.lastLogin, 'x'); // Convert timestamp to Moment.js date
        console.log('TIME', loginTime.format('YYYY-MM-DD HH:mm:ss'), getUser.lastLogin);
        
        sendNewLoginEmail({
            email: getUser?.email,
            name: `${getUser?.firstName} ${getUser.lastName}`,
            time: loginTime.format('YYYY-MM-DD HH:mm:ss'),
            device: getUser.lastLoginInfo[0]
        });

        ///set and send cookies
        res.cookie('inrideauthtoken', accessToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie('inrideauthid', getUser?.adminId, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        
        const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, blocked, resetPasswordToken, resetPasswordExpire, _id, ...userData } = getUser._doc;
        return sendResponse(res, 200, true, userData, { accessId: getUser?.adminId });
    } catch (error) {
        console.log('UNABLE TO LOGIN USER', error)
        sendResponse(res, 500, false, 'Unable to login user')
    }
}

//FORGOT PASSWORD
export async function forgotPassword(req, res) {
    const { email } = req.body
    if(!email){
        sendResponse(res, 400, false, 'Provide a email address')
        return
    }
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    try {
        const getUser = await AdminUserModel.findOne({ email })
        if(!getUser){
            sendResponse(res, 404, false, 'Email does not exist')
        }

        const token = await getUser.getResetPasswordToken()
        await getUser.save()
        console.log('RESET TOKEN', token)
        try {
            //send token email
            sendForgotPasswordEmail({
                email: getUser.email,
                name: `${getUser?.firstName} ${getUser?.lastName}`,
                buttonLink: `${process.env.CLIENT_URL}/reset-password/${token}`
            })
            
            sendResponse(res, 200, true, 'Reset Email sent ')
            return
        } catch (error) {
            console.log('UNABLE TO SEND RESET EMAIL', error)
            sendResponse(res, 500, false, 'Unable to send reset email')
            return
        }
    } catch (error) {
        console.log('UNABLE TO PROCESS FORGOT PASSWORD REQUETS', error)
        sendResponse(res, 500, false, 'Unable to process forgot password')
    }
}

//RESET PASSWORD
export async function resetPassword(req, res){
    const { password, confirmPassword } = req.body
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex')

    try {
        if (!password || !confirmPassword) {
            sendResponse(res, 400, false, 'Password and confirm password are required')
            return
        }
        if (password.length < 6) {
            sendResponse(res, 400, false, 'Passwords must be at least 6 characters long')
            return
        }

        const specialChars = /[!@#$%^&*()_+{}[\]\\|;:'",.<>?]/;
        if (!specialChars.test(password)) {
            sendResponse(res, 400, false, 'Passwords must contain at least one special character')
            return
        }
    
        if (password !== confirmPassword) {
            sendResponse(res, 400, false, 'Passwords do not match')
            return
        }
    
        console.log('resetPasswordToken', resetPasswordToken, 'req.params.resetToken', req.params.resetToken)
        const user = await AdminUserModel.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now()} //time diffrence error
        })

        if(!user){
            sendResponse(res, 404, false, 'Invalid Reset Token')
            return
        }

        const isMatch = await user.matchPassword(password);
        if(isMatch){
            sendResponse(res, 400, false, 'Old Password must not match new password')
            return
        }

        user.password = password
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined

        await user.save();

        sendResponse(res, 200, true, 'Password Reset successful')
    } catch (error) {
        console.log('UANBLE TO RESET PASSWORD', error)
        sendResponse(res, 500, false, 'Unable to reset password')
    }
}

//VERIFY TOKEN
export async function verifyToken(req, res) {
    const accessToken = req.cookies.inrideauthtoken;
    const accountId = req.cookies.inrideauthid;
    try {
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                let user;
                if (decoded.accountType === 'admin') {
                    user = await AdminUserModel.findOne({ adminId: decoded.id });
                }
                if (!user) {
                    return sendResponse(res, 404, false, 'User not found');
                }
                if (!user.refreshToken) {
                    return sendResponse(res, 403, false, 'UnAuthenicated');
                }
                const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, blocked, resetPasswordToken, resetPasswordExpire, _id, ...userData } = user._doc;
                return sendResponse(res, 200, true, userData, accessToken);
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    if (accountId) {
                        let user = await AdminUserModel.findOne({ adminId: accountId });
                        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId })
                        if (user && refreshTokenExist) {
                            const accessToken = user.getAccessToken()
                            res.cookie('inrideauthtoken', accessToken, {
                                httpOnly: true,
                                sameSite: 'None',
                                secure: true,
                                maxAge: 15 * 60 * 1000, // 15 minutes
                            });
                            const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, blocked, resetPasswordToken, resetPasswordExpire, _id, ...userData } = user._doc;
                            return sendResponse(res, 200, true, userData, accessToken);
                        }
                    }
                    return sendResponse(res, 403, false, 'UnAuthenicated');
                }
            }
        } else if (accountId) {
            const user = await AdminUserModel.findOne({ adminId: accountId });
            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId })
            if (user && refreshTokenExist) {
                const accessToken = user.getAccessToken()
                res.cookie('inrideauthtoken', accessToken, {
                    httpOnly: true,
                    sameSite: 'None',
                    secure: true,
                    maxAge: 15 * 60 * 1000, // 15 minutes
                });
                const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, blocked, resetPasswordToken, resetPasswordExpire, _id, ...userData } = user._doc;
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
    const { accountId } = req.user || {}
    try {
        const getRefreshTokenToken = await RefreshTokenModel.findOne({ accountId: accountId })

        if(getRefreshTokenToken){
            const deleteToken = await RefreshTokenModel.findOneAndDelete({ accountId: accountId })
        }
        res.clearCookie(`inrideauthtoken`)
        res.clearCookie(`inrideauthid`)

        return sendResponse(res, 200, true, 'Signout success')
    } catch (error) {
        console.log('UNABLE TO SIGNOUT ACCOUNT', error)
        return sendResponse(res, 500, false, 'Unable to process signout')
    }
}