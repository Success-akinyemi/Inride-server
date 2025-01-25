import { sendResponse } from "../middlewares/utils.js"
import DriverModel from "../model/Driver.js"

export async function updateProfile(req, res) {
    const { language, pushNotification, mailNotification, firstName, lastName, email, homeAddress, workAddress } = req.body
    const { accountImg } = req.files
    const { driverId } = req.user
    try {
        const getDriver = await DriverModel.findOne({ driverId })
        let accountImgUrl
        if(accountImg){
            accountImgUrl = await uploadFile(req.files.carImg[0], 'driver-account-image');
        }

        if(language) getDriver.language = language
        if(pushNotification) getDriver.pushNotification = pushNotification
        if(mailNotification) getDriver.mailNotification = mailNotification
        if(firstName) getDriver.firstName = firstName
        if(lastName) getDriver.lastName = lastName
        if(homeAddress) getDriver.homeAddress = homeAddress
        if(workAddress) getDriver.workAddress = workAddress
        if(accountImgUrl) getDriver.accountImg = accountImgUrl

        await getDriver.save()
        
        sendResponse(res, 200, true, 'Profile Updated Successful')
    } catch (error) {
        
    }
}