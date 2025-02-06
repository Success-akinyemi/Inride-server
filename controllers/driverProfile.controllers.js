import { sendResponse, uploadFile } from "../middlewares/utils.js"
import DriverModel from "../model/Driver.js"

export async function updateProfile(req, res) {

    const { language, pushNotification, mailNotification, firstName, lastName, email, homeAddress, workAddress } = req.body;
    const { accountImg } = req.files || {};
    const { driverId } = req.user;

    try {
        // Find the driver
        const getDriver = await DriverModel.findOne({ driverId });
        if (!getDriver) {
            sendResponse(res, 404, false, 'Passenger not found');
            return;
        }

        // Handle account image upload
        let accountImgUrl;
        if (accountImg) {
            accountImgUrl = await uploadFile(req.files.accountImg[0], 'driver-account-image');
            console.log('Uploaded Account Image URL:', accountImgUrl);
        }

        // Validate and check email
        const getEmail = email ? email.trim() : null;
        if (getEmail) {
            const checkEmailExist = await DriverModel.findOne({ email: getEmail });
            if (checkEmailExist && checkEmailExist.driverId !== passengerId) {
                sendResponse(res, 400, false, 'Email already exists');
                return;
            }
        }

        // Update profile fields
        if (language) getDriver.language = language;
        if (pushNotification) getDriver.pushNotification = pushNotification;
        if (mailNotification) getDriver.mailNotification = mailNotification;
        if (firstName) getDriver.firstName = firstName;
        if (lastName) getDriver.lastName = lastName;
        if (homeAddress) getDriver.homeAddress = homeAddress;
        if (workAddress) getDriver.workAddress = workAddress;
        if (accountImgUrl) getDriver.accountImg = accountImgUrl;
        if (getEmail) getDriver.email = getEmail;

        // Save changes
        await getDriver.save();

        sendResponse(res, 200, true, 'Profile updated successfully');
    } catch (error) {
        console.error('Error Updating Profile:', error);
        sendResponse(res, 500, false, 'An error occurred while updating the profile');
    }
}

export async function getProfile(req, res) {
    const { driverId } = req.user
    try {
        const getDriver = await DriverModel.findOne({ driverId })

        const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, driverLincenseImgFront, driverLincenseImgBack, _id, ...userData } = getDriver._doc;
        sendResponse(res, 200, true, userData)
    } catch (error) {
        console.log('UNABLE TO GET DRIVER PROFILE', error)
        sendResponse(res, 500, false, 'Unable to get driver profile')
    }
}