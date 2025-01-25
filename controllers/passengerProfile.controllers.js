import { sendResponse, uploadFile } from "../middlewares/utils.js"
import PassengerModel from "../model/Passenger.js"

export async function updateProfile(req, res) {
    console.log('Request Body:', req.body);

    const { language, pushNotification, mailNotification, firstName, lastName, email, homeAddress, workAddress } = req.body;
    const { accountImg } = req.files || {};
    const { passengerId } = req.user;

    try {
        // Find the passenger
        const getPassenger = await PassengerModel.findOne({ passengerId });
        if (!getPassenger) {
            sendResponse(res, 404, false, 'Passenger not found');
            return;
        }
        console.log('Passenger Found:', getPassenger);

        // Handle account image upload
        let accountImgUrl;
        if (accountImg) {
            accountImgUrl = await uploadFile(req.files.accountImg[0], 'passenger-account-image');
            console.log('Uploaded Account Image URL:', accountImgUrl);
        }

        // Validate and check email
        const getEmail = email ? email.trim() : null;
        if (getEmail) {
            const checkEmailExist = await PassengerModel.findOne({ email: getEmail });
            if (checkEmailExist && checkEmailExist.passengerId !== passengerId) {
                sendResponse(res, 400, false, 'Email already exists');
                return;
            }
        }

        // Update profile fields
        if (language) getPassenger.language = language;
        if (pushNotification) getPassenger.pushNotification = pushNotification;
        if (mailNotification) getPassenger.mailNotification = mailNotification;
        if (firstName) getPassenger.firstName = firstName;
        if (lastName) getPassenger.lastName = lastName;
        if (homeAddress) getPassenger.homeAddress = homeAddress;
        if (workAddress) getPassenger.workAddress = workAddress;
        if (accountImgUrl) getPassenger.accountImg = accountImgUrl;
        if (getEmail) getPassenger.email = getEmail;

        // Save changes
        await getPassenger.save();
        console.log('Updated Passenger:', getPassenger);

        sendResponse(res, 200, true, 'Profile updated successfully', getPassenger);
    } catch (error) {
        console.error('Error Updating Profile:', error);
        sendResponse(res, 500, false, 'An error occurred while updating the profile');
    }
}
