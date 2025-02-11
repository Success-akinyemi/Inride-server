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

export async function getProfile(req, res) {
  const { passengerId } = req.user
  try {
      const getPassenger = await PassengerModel.findOne({ passengerId })

      const { password, ssn, idCardImgFront, idCardImgBack, idCardType, verified, resetPasswordToken, resetPasswordExpire, _id, ...userData } = getPassenger._doc;
      sendResponse(res, 200, true, userData)
  } catch (error) {
      console.log('UNABLE TO GET PASSENGER PROFILE', error)
      sendResponse(res, 500, false, 'Unable to get passenger profile')
  }
}

//ADMIN
//GET PASSENGERS
export async function getPassengers(req, res) {
  const { limit = 10, page = 1, startDate, endDate, status } = req.query;

  try {
    // Build the query object
    const query = {};

    // Handle date filtering
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(endDate) };
    }

    // Handle status filtering
    if (status === "active") {
      query.active = true; // Fetch only active passengers
      query.verified = true
    }
    if (status === "inactive") {
      query.active = false; // Fetch only inactive passengers
    }
    if (status === "pending") {
      query.verified = false; // Fetch only pending passengers
    }
    if (status === "deactivated") {
      query.isBlocked = true; // Fetch only blocked passengers
    }
    if (status === "all" || !status) {

    }

    // Calculate the number of documents to skip
    const skip = (Number(page) - 1) * Number(limit);

    // Fetch rides from the database
    const passenger = await PassengerModel.find(query)
      .sort({ createdAt: -1 }) // Sort by latest rides
      .skip(skip) // Skip the documents for pagination
      .limit(Number(limit)); // Limit the results for pagination

    // Get the total count of rides for pagination metadata
    const totalPassenger = await PassengerModel.countDocuments(query);

    // Transform passenger data
    const transformedPassenger = passenger.map((passenger) => ({
      passengerId: passenger.passengerId,
      name: `${passenger.firstName} ${passenger.lastName}`,
      email: passenger.email,
      createdAt: passenger.createdAt,
      status: `${passenger.verified && passenger.active ? 'Active' : passenger.verified && !passenger.active ? 'Pending' : !passenger.verified ? 'In active' : passenger.isBlocked ? 'Blocked' : ''}`
    }));

    return sendResponse(res, 200, true, 'Rides fetched successfully', {
      passenger: transformedPassenger,
      totalPassenger,
      totalPages: Math.ceil(totalPassenger / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error('UNABLE TO GET RIDES', error);
    return sendResponse(res, 500, false, 'Unable to get rides');
  }
}

//GET A PASSNEGER
export async function getAPassenger(req, res) {
  const { passengerId } = req.params
  if(!passengerId){
    sendResponse(res, 400, false, 'Provide an Id')
    return
  }
    try {
      const getPassenger = await PassengerModel.findOne({ passengerId })
      if(!getPassenger){
        sendResponse(res, 404, false, 'Passenger with this Id does not exist')
        return
      }
      sendResponse(res, 200, true, getPassenger)
    } catch (error) {
      console.log('UNABLE TO GET PASSENGER', error)
      sendResponse(res, 500, false, 'Unable to get passenger details')
    }
  }

//BLOCK A PASSENGER
export async function blockPassenger(req, res) {
  const { passengerId } = req.body
  if(!passengerId){
    sendResponse(res, 400, false, 'Provide an ID')
    return
  }
  try {
    const getPassenger = await PassengerModel.findOne({ passengerId })
    if(!getPassenger){
      sendResponse(res, 404, false, 'Passenger with this Id not found')
    }

    getPassenger.isBlocked = true
    await getPassenger.save()

    sendResponse(res, 200, true, `${getPassenger?.firstName} ${getPassenger.lastName} account has been blocked`)
  } catch (error) {
    console.log('UNABLE TO BLOCK PASSENGER', error)
    sendResponse(res, 500, false, 'Uanble to block passengerc account')
  }
}

//UNBLOCK A PASSENGER
export async function unBlockPassenger(req, res) {
  const { passengerId } = req.body
  if(!passengerId){
    sendResponse(res, 400, false, 'Provide an ID')
    return
  }
  try {
    const getPassenger = await PassengerModel.findOne({ passengerId })
    if(!getPassenger){
      sendResponse(res, 404, false, 'Passenger with this Id not found')
    }

    getPassenger.isBlocked = false
    getPassenger.verified = true
    getPassenger.active = true
    await getPassenger.save()

    sendResponse(res, 200, true, `${getPassenger?.firstName} ${getPassenger.lastName} account has been unblocked`)
  } catch (error) {
    console.log('UNABLE TO UNBLOCK PASSENGER', error)
    sendResponse(res, 500, false, 'Uanble to unblock passengerc account')
  }
}