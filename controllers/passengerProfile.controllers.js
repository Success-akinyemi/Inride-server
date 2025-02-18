import { initiatePayment, sendResponse, uploadFile } from "../middlewares/utils.js"
import NotificationModel from "../model/Notifications.js";
import PassengerModel from "../model/Passenger.js"
import Stripe from 'stripe';
import PaymentIntentModel from "../model/PaymentIntents.js";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); 

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

//GET PASSNEGER NOTIFICATIONS
export async function getNotifications(req, res) {
  const { passengerId } = req.user
  try {
      const notifications = await NotificationModel.find({ accountId: passengerId })

      sendResponse(res, 200, true, notifications)
  } catch (error) {
      console.log('UNABLE TO GET PASSENGER NOTIFICATIONS', error)
      sendResponse(res, 500, false, 'Unable to get passenger notifications')
  }
}

//FUND WALLET
export async function fundWallet(req, res) {
  const { amount } = req.body
  const { passengerId } = req.user
  if(!amount){
    return sendResponse(res, 400, false, 'Provide an amount')
  }
  if(isNaN(amount)){
    return sendResponse(res, 400, false, 'Provide a amount is number')
  }
  try {
    const makePayment = await initiatePayment({
      amount,
      accountId: passengerId,
      paymentfor: 'funding'
    })

    if(!makePayment.success){
        return sendResponse(res, 400, false, makePayment.data )
    }
    console.log('PAYMENT INTENT', makePayment, makePayment.data)

    sendResponse(res, 201, true, makePayment.data, makePayment.message)
  } catch (error) {
    console.log('UNABLE TO MAKE PAYMENT', error)
    sendResponse(res, 500, false, 'Unable to make payment')
  }
}

//GET FUNDING HISTROY
export async function getFundingHistroy(req, res) {
  const { limit = 10, page = 1, status } = req.query
  try {
      const pageNumber = Number(page)
      const limitNumber = Number(limit)
      const query = {}

      if(status && status.toLowerCase() === 'pending'){
          query.status = 'Pending'
      }
      if(status && status.toLowerCase() === 'successful'){
          query.status = 'Successful'
      }        
      if(status && status.toLowerCase() === 'failed'){
          query.status = 'Failed'
      }
      if(status && status.toLowerCase() === 'processing'){
        query.status = 'Processing'
      }

      const skip = (pageNumber -1) * limitNumber;

      const data = await PaymentIntentModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)

      const totalData = await PaymentIntentModel.countDocuments(query)

      //transaform data
      const transformedPaymentHistroy = data.map((data) => {
  
        return {
          _id: data._id,
          paymentId: data.paymentId,
          paymentfor: data.paymentfor,
          amount: data.amount,
          accountId: data.accountId,
          status: data.status,
          createdAt: data.createdAt
        };
      });
  

      sendResponse(
          res,
          200,
          true,
          {
              data:  transformedPaymentHistroy,
              totalData,
              totalPages: Math.ceil(totalData / limitNumber),
              currentPage: pageNumber
          },
          'Funding histroy Data fetched successful'
      )
  } catch (error) {
      console.log('UNABLE TO GET ALL FUNDING HSITROY', error)
      res.status(500).json({ success: false, data: 'Unable to get funding histroy data' })
  }
}

//GET A FUNDING HISTROY
//GET CMS
export async function getAPaymentData(req, res) {
  const { paymentId } = req.params
  if(!paymentId){
      return sendResponse(res, 400, false, 'Provide a cms Id')
  }
  try {
      const getPaymentData = await PaymentIntentModel.findById({ _id: paymentId })
      if(!getPaymentData){
          return sendResponse(res, 404, false, 'Payment data with this Id not found')
      }

      const { client_secret, ...restOfData } = getPaymentData._doc
      sendResponse(res, 200, true, restOfData)
  } catch (error) {
      console.log('UNABLE TO GET PAYMENT DATA', error)
      sendResponse(res, 500, false, 'Unable to get payment data')
  }
}

//ADMIN
//GET PASSENGERS
export async function getPassengers(req, res) {
  const { limit = 10, page = 1, startDate, endDate, status } = req.query;

  try {
    // Convert limit and page to numbers
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

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
    switch (status) {
      case "active":
        query.active = true;
        query.verified = true;
        break;
      case "inactive":
        query.active = false;
        query.verified = false;
        break;
      case "pending":
        query.verified = false;
        break;
      case "deactivated":
        query.isBlocked = true;
        break;
      case "all":
      case undefined:
        // Do nothing, fetch all passengers
        break;
      default:
        return sendResponse(res, 400, false, "Invalid status parameter");
    }

    // Calculate the number of documents to skip
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch passengers from the database
    const passengers = await PassengerModel.find(query)
      .sort({ createdAt: -1 }) // Sort by latest passengers
      .skip(skip)
      .limit(limitNumber);

    // Get the total count of passengers for pagination metadata
    const totalPassengers = await PassengerModel.countDocuments(query);

    // Transform passenger data
    const transformedPassengers = passengers.map((passenger) => {
      let status = "";

      if (passenger.isBlocked) {
        status = "Blocked";
      } else if (!passenger.verified) {
        status = "Inactive";
      } else if (!passenger.verified && !passenger.active) {
        status = "Pending";
      } else if (passenger.verified && passenger.active) {
        status = "Active";
      }

      return {
        passengerId: passenger.passengerId,
        name: `${passenger.firstName} ${passenger.lastName}`,
        email: passenger.email,
        createdAt: passenger.createdAt,
        status,
      };
    });

    return sendResponse(res, 200, true, "Passengers fetched successfully", {
      passengers: transformedPassengers,
      totalPassengers,
      totalPages: Math.ceil(totalPassengers / limitNumber),
      currentPage: pageNumber,
    });
  } catch (error) {
    console.error("UNABLE TO GET PASSENGERS", error);
    return sendResponse(res, 500, false, "Unable to get passengers");
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

      const { password, ...userData } = getPassenger._doc
      sendResponse(res, 200, true, userData)
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