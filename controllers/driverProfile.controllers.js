import axios from "axios";
import { decrypt, sendResponse, uploadFile } from "../middlewares/utils.js"
import CandidateReportModel from "../model/CandidateReport.js";
import DriverModel from "../model/Driver.js"
import DriverBankDetailModel from "../model/DriverBankDetails.js";
import NotificationModel from "../model/Notifications.js";
import PayoutModel from "../model/Payout.js";

const checkrApiKey = process.env.CHECKR_SECRET
const checkrBaseUrl = process.env.CHECKR_URL

export async function updateProfile(req, res) {

    const { language, pushNotification, mailNotification, firstName, lastName, middleName, email, homeAddress, workAddress } = req.body;
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
            if (checkEmailExist && checkEmailExist.driverId !== driverId) {
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
        if( middleName) getDriver.middleName = middleName;
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

//GET DRIVER NOTIFICATIONS
export async function getNotifications(req, res) {
  const { driverId } = req.user
  try {
      const notifications = await NotificationModel.find({ accountId: driverId })

      sendResponse(res, 200, true, notifications)
  } catch (error) {
      console.log('UNABLE TO GET DRIVER NOTIFICATIONS', error)
      sendResponse(res, 500, false, 'Unable to get driver notifications')
  }
}

//ADMIN
//GET DRIVER
export async function getDrivers(req, res) {
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
  
      // Fetch drivers from the database
      const driver = await DriverModel.find(query)
        .sort({ createdAt: -1 }) // Sort by latest drivers
        .skip(skip) // Skip the documents for pagination
        .limit(Number(limit)); // Limit the results for pagination
  
      // Get the total count of drivers for pagination metadata
      const totalDriver = await DriverModel.countDocuments(query);
  
      // Transform driver data
      const transformedDriver = driver.map((driver) => ({
        driverId: driver.driverId,
        name: `${driver.firstName} ${driver.lastName}`,
        email: driver.email,
        createdAt: driver.createdAt,
        status: `${driver.verified && driver.active ? 'Active' : driver.verified && !driver.active ? 'Pending' : !driver.verified ? 'In active' : driver.isBlocked ? 'Blocked' : ''}`,
        isBlocked: driver.isBlocked
      }));
  
      return sendResponse(res, 200, true, 'Drivers fetched successfully', {
        driver: transformedDriver,
        totalDriver,
        totalPages: Math.ceil(totalDriver / limit),
        currentPage: Number(page),
      });
    } catch (error) {
      console.error('UNABLE TO GET DRIVERS', error);
      return sendResponse(res, 500, false, 'Unable to get drivers');
    }
  }
  
  //GET A DRIVER
  export async function getADriver(req, res) {
    const { driverId } = req.params;

    if (!driverId) {
        sendResponse(res, 400, false, 'Provide an Id');
        return;
    }

    try {
        const getDriver = await DriverModel.findOne({ driverId });

        if (!getDriver) {
            sendResponse(res, 404, false, 'Driver with this Id does not exist');
            return;
        }

        const getDriverPayoutDetails = await DriverBankDetailModel.findOne({ driverId });

        // Get latest payout request
        const payoutRequest = await PayoutModel.findOne({ driverId })
            .sort({ createdAt: -1 })
            .limit(1);

        let reportData;
        if (getDriver.candidateId) {
            const candidateId = getDriver.candidateId;
            const getReport = await CandidateReportModel.findOne({ candidateId });
            if (getReport) {
                const reportUrl = getReport.uri;
                try {
                    const authReq = await axios.get(`${checkrBaseUrl}${reportUrl}`, {
                        auth: {
                            username: checkrApiKey,
                            password: "",
                        },
                    });
                    reportData = authReq?.data;
                } catch (error) {
                    console.log('UNABLE TO GET USER REPORT FROM CHECKR', error);
                    reportData = 'Unable to get user report data from checkr';
                }
            }
        }

        // Decrypt SSN and mask it
        let maskedSSNNumber = null;
        try {
            if (getDriver.ssn) {
                const decryptedSSNNumber = decrypt(getDriver.ssn);
                maskedSSNNumber = `*** ** ${decryptedSSNNumber.slice(-4)}`; // Mask all but the last 4 digits
            }
        } catch (error) {
            maskedSSNNumber = ''
        }

        // Construct response object
        const driverData = {
            ...getDriver.toObject(),
            payoutDetails: getDriverPayoutDetails || null,
            latestPayout: payoutRequest?.amount,
            latestPayoutStatus: payoutRequest?.status,
            driverCheckrReport:
                typeof reportData === 'string'
                    ? reportData
                    : {
                          status: reportData?.status,
                          result: reportData?.result,
                          dueTime: reportData?.due_time,
                          package: reportData?.package,
                          uri: reportData?.uri,
                          motorReport: reportData?.motor_vehicle_report_id,
                          workLocation: reportData?.work_locations,
                      },
            ssn: maskedSSNNumber, // Send only the masked SSN
        };

        sendResponse(res, 200, true, driverData);
    } catch (error) {
        console.error('UNABLE TO GET DRIVER', error);
        sendResponse(res, 500, false, 'Unable to get driver details');
    }
}  
  
  //BLOCK A DRIVER
  export async function blockDriver(req, res) {
    const { driverId } = req.body
    if(!driverId){
      sendResponse(res, 400, false, 'Provide an ID')
      return
    }
    try {
      const getDriver = await DriverModel.findOne({ driverId })
      if(!getDriver){
        sendResponse(res, 404, false, 'Driver with this Id not found')
      }
  
      getDriver.isBlocked = true
      await getDriver.save()
  
      sendResponse(res, 200, true, `${getDriver?.firstName} ${getDriver.lastName} account has been blocked`)
    } catch (error) {
      console.log('UNABLE TO BLOCK DRIVER', error)
      sendResponse(res, 500, false, 'Unable to block driver account')
    }
  }
  
  //UNBLOCK A DRIVER
  export async function unBlockDriver(req, res) {
    const { driverId } = req.body
    if(!driverId){
      sendResponse(res, 400, false, 'Provide an ID')
      return
    }
    try {
      const getDriver = await DriverModel.findOne({ driverId })
      if(!getDriver){
        sendResponse(res, 404, false, 'Driver with this Id not found')
      }
  
      getDriver.isBlocked = false
      getDriver.verified = true
      getDriver.active = true
      getDriver.approved = true
      getDriver.warningCount = 0
      await getDriver.save()
  
      sendResponse(res, 200, true, `${getDriver?.firstName} ${getDriver.lastName} account has been unblocked`)
    } catch (error) {
      console.log('UNABLE TO UNBLOCK DRIVER', error)
      sendResponse(res, 500, false, 'Uanble to unblock driver account')
    }
  }