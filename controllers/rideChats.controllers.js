import { sendUserAccountBlockedEmail } from "../middlewares/mailTemplate.js.js";
import { sendResponse } from "../middlewares/utils.js";
import AppSettingsModel from "../model/AppSettings.js";
import DriverModel from "../model/Driver.js";
import NotificationModel from "../model/Notifications.js";
import PassengerModel from "../model/Passenger.js";
import RideChatModel from "../model/RideChats.js";
import RideModel from "../model/Rides.js";
import WarningMessageModel from "../model/WarningMessages.js";

//GET ALL CHATS
export async function getChats(req, res) {
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
        if (status) {
            const formattedStatus = status.toLowerCase();
            const validStatuses = ["active", "complete", "in progress", "canceled"];
            if (validStatuses.includes(formattedStatus)) {
                query.status = formattedStatus.charAt(0).toUpperCase() + formattedStatus.slice(1);
            }
        }

        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit);

        // Fetch rides from the database
        const rides = await RideModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const totalRides = await RideModel.countDocuments(query);

        // Fetch ride chats and user details
        const rideData = await Promise.all(rides.map(async (ride) => {
            const rideChat = await RideChatModel.findOne({ rideId: ride.rideId });

            const passenger = await PassengerModel.findById(ride.passengerId).select("firstName lastName");
            const driver = ride.driverId ? await DriverModel.findById(ride.driverId).select("firstName lastName") : null;

            return {
                rideId: ride.rideId,
                messageId: ride.rideId,
                passengerName: passenger ? `${passenger.firstName} ${passenger.lastName}` : "Unknown",
                driverName: driver ? `${driver.firstName} ${driver.lastName}` : "Unknown",
                startDate: rideChat ? rideChat.createdAt : null,
                endDate: rideChat ? rideChat.updatedAt : null,
                status: ride.status,
                currentPage: page,
                totalPages: Math.ceil(totalRides / limit)
            };
        }));

        sendResponse(res, 200, true, "Ride chats fetched successfully", {
            currentPage: page,
            totalPages: Math.ceil(totalRides / limit),
            totalRides,
            rides: rideData
        });

    } catch (error) {
        console.error('UNABLE TO GET RIDE CHATS:', error);
        sendResponse(res, 500, false, 'Unable to get ride chats');
    }
}

//GET A CHATS
export async function getAchat(req, res) {
    const { rideId } = req.params
    if(!rideId){
        sendResponse(res, 400, false, 'Ride Id is required')
        return
    }
    try {
        const getRideChat = await RideChatModel.findOne({ rideId })
        const getRide = await RideModel.findOne({ rideId })

        if(!getRideChat){
            sendResponse(res, 404, false, 'Chat with this Id does not exist')
        }
        let getDriver = {}
        let getPassenger = {}
        if(getRide){
            const driverId = getRide?.driverId
            const passengerId = getRide?.passengerId
            getDriver =  await DriverModel.findOne({ driverId })
            getPassenger =  await PassengerModel.findOne({ passengerId })
        }

        const finalData = {
            rideId,
            messageId: rideId,
            chats: getRideChat?.chats,
            passengerName: `${getPassenger?.firstName} ${getPassenger?.lastName}`,
            driverName: `${getDriver?.firstName} ${getDriver?.lastName}`,
            passengerNoOfWarnings: getPassenger?.warningCount,
            driverNoOfWarnings: getDriver?.warningCount,
            startDate: getRideChat?.createdAt,
            endDate: getRideChat?.updatedAt
        }

        sendResponse(res, 200, finalData)
    } catch (error) {
        console.log('UANBLE TO GET CHAT DETAILS', error)
        sendResponse(res, 500, false, 'Unable to get chat details')
    }
}

//SEND WARNING TO DRIVER OR PASSENGER
export async function sendChatWarning(req, res) {
    const { accountId, reason, accountType } = req.body
    if(!['driver', 'passenger'].includes(accountType.toLowercase())){
        return sendResponse(res, 400, false, 'Account type is must be either a passenger or a driver')
    }
    if(!accountId){
        return sendResponse(res, 400, false, 'Account Id is required')
    }
    if(!reason){
        return sendResponse(res, 400, false, 'Reason for deactivated account is required')
    }

    try {
        let user
        if(accountType.toLowercase() === 'passenger') {
            user = await PassengerModel.findOne({ passengerId: accountId })
        } else if(accountType.toLowercase() === 'driver'){
            user = await DriverModel.findOne({ driverId: accountId })
        } else {
            return sendResponse(res, 400, false, 'Invalid account type')
        }

        //new notification
        await NotificationModel.create({
            accountId: user.passengerId ? user.passengerId : user.driverId,
            message: `WARNING: ${reason}`
        }) 

        //new warning message
        await WarningMessageModel.create({
            accountId: user.passengerId ? user.passengerId : user.driverId,
            reason
        })

        const getAppSetting = await AppSettingsModel.findOne()
        if(user.warningCount < getAppSetting?.warningCount){
            user.warningCount += 1
            await user.save()

            sendResponse(res, 200, true, 'Account warning sent to user')
            return
        } else{
            user.isBlocked = true
            user.active = false
            await user.save()

            if(user.email){
                //send blocked notification email
                sendUserAccountBlockedEmail({
                    email: user?.email,
                    name: `${user?.firstName} ${user?.lastName}`,
                    reason,
                })
            }

            sendResponse(res, 200, true, 'User account has been blocked')
            return
        }

    } catch (error) {
        console.log('UANALE TO CREATE A NEW WARNING TO USER', error)
        sendResponse(res, 500, false, 'Unable to create warning on user account')
    }
}