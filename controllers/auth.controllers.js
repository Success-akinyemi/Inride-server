import { sendResponse } from "../middlewares/utils.js"
import DriverModel from "../model/Driver.js"
import DriverLocationModel from "../model/DriverLocation.js"
import OtpModel from "../model/Otp.js"
import PassengerModel from "../model/Passenger.js"
import RefreshTokenModel from "../model/RefreshToken.js"

export async function verifyOtp(req, res) {
    const { otp } = req.body
    if(!otp){
        return sendResponse(res, 400, false, 'Otp is required')
    }
    try {
        const code = await OtpModel.find()
        console.log('object', code)
        const getOtp = await OtpModel.findOne({ otp })
        if(!getOtp){
            return sendResponse(res, 404, false, 'Invalid Otp Code')
        }
        console.log('OTP'. getOtp)
        if(getOtp?.accountType === 'passenger'){
            const getPassenger = await PassengerModel.findOne({ mobileNumber: getOtp?.mobileNumber })
            getPassenger.verified = true
            getPassenger.otpCode = getOtp?.otp
            await getPassenger.save()
            //console.log('PASS', getPassenger)
            return sendResponse(res, 200, true, 'Otp Verified', getOtp?.mobileNumber )
        }
        if(getOtp?.accountType === 'driver'){
            const getDriver = await DriverModel.findOne({ mobileNumber: getOtp?.mobileNumber })
            getDriver.verified = true
            getDriver.otpCode = getOtp?.otp
            await getDriver.save()
            //console.log('DRIV', getDriver)
            return sendResponse(res, 200, true, 'Otp Verified', getOtp?.mobileNumber)
        }

    } catch (error) {
        console.log('UNABLE TO VERIFY OTP', error)
        return sendResponse(res, 500, false, 'Unable to verify otp code')
    }
}

//SIGNOUT
export async function signout(req, res) {
    const { accountId } = req.user || {}
    try {
        const getRefreshTokenToken = await RefreshTokenModel.findOne({ accountId: accountId })
        const getDriver = await DriverModel.findOne({ driverId: getRefreshTokenToken?.accountId })
        if(getDriver){
            const getDriverLocation = await DriverLocationModel.findOne({ driverId: getDriver?.driverId  })
            getDriver.status = 'offline',
            await getDriver.save()
            getDriverLocation.status = 'offline',
            getDriverLocation.isActive = false
            await getDriverLocation.save()
        }
        if(getRefreshTokenToken){
            const deleteToken = await RefreshTokenModel.findOneAndDelete({ accountId: accountId })
        }
        res.clearCookie(`inrideaccesstoken`)
        res.clearCookie(`inrideaccessid`)

        return sendResponse(res, 200, true, 'Signout success')
    } catch (error) {
        console.log('UNABLE TO SIGNOUT PASSENGER', error)
        return sendResponse(res, 500, false, 'Unable to process signout')
    }
}
