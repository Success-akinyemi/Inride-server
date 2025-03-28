import { sendResponse, uploadBufferFile, uploadFile } from "../middlewares/utils.js";
import AppSettingsModel from "../model/AppSettings.js";
import CarDetailModel from "../model/CarDetails.js";
import DriverModel from "../model/Driver.js";
import DriverLocationModel from "../model/DriverLocation.js";
import driverPriceModel from "../model/DriverPrice.js";
import driverAroundrideRegionModel from "../model/DriversAroundRideRegion.js";
import NotificationModel from "../model/Notifications.js";
import PendingEditRideRequestModel from "../model/PendingEditRide.js";
import RideChatModel from "../model/RideChats.js";
import RideModel from "../model/Rides.js";
import RideTransactionModel from "../model/RideTransactions.js";
import { passengerConnections, passengerNamespace } from "../server.js";
import { sendNotificationToAccount } from "./pushNotification.controllers.js";

// UPDATE DRIVER LOCATION
export async function updateLocation({ data, socket, res }) {
  const { driverId } = socket.user;

  try {
    const updateLoc = await DriverLocationModel.updateOne(
      { driverId },
      {
        location: data,
        //isActive: true,
      },
      { upsert: true }
    );


    if (res) return sendResponse(res, 200, true, 'Location Updated');
    if (socket) socket.emit('locationUpdated', { success: true, message: 'Location Updated' });
  } catch (error) {
    console.log('UNABLE TO PROCESS DRIVER LOCATION', error);
    if (res) return sendResponse(res, 500, false, 'Unable to update location');
    if (socket) socket.emit('locationUpdated', { success: false, message: 'Unable to update location' });
  }
}

// GO ONLINE
export async function goOnline({ data, socket, res }) {
  const { driverId, locationData } = socket.user;
  console.log('object')
  try {
    const driverLoc = await DriverLocationModel.findOne({ driverId })
    if(driverLoc){
      driverLoc.isActive = true
      driverLoc.status = 'online'
      if(data) driverLoc.location = data
      await driverLoc.save()
    }
    const driverStats = await DriverModel.findOne({ driverId })
    if(driverStats){
      driverStats.status = 'online'
      await driverStats.save()
    }

    console.log('DRIVER UPDATED', driverStats?.status, driverId);
    const message = `Driver ${driverStats?.firstName} ${driverStats?.lastName} is online`;
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('statusUpdated', { success: true, message });
  } catch (error) {
    console.log('UNABLE TO MAKE DRIVER STATUS ONLINE', error);
    const message = 'Error updating online status';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('statusUpdated', { success: false, message });
  }
}

// GO OFFLINE
export async function goOffline({ data, socket, res }) {
  const { driverId } = socket.user;

  try {
    const driverLoc = await DriverLocationModel.findOne({ driverId })
    if(driverLoc){
      driverLoc.isActive = false
      driverLoc.status = 'offline'
      await driverLoc.save()
    }
    const driverStats = await DriverModel.findOne({ driverId })
    if(driverStats){
      driverStats.status = 'offline'
      await driverStats.save()
    }
    console.log('DRIVER UPDATED', driverStats?.status, driverId);
    const message = `Driver ${driverStats?.firstName} ${driverStats?.lastName} is offline`;
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('statusUpdated', { success: true, message });
  } catch (error) {
    console.log('UNABLE TO MAKE DRIVER STATUS OFFLINE', error);
    const message = 'Error updating offline status';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('statusUpdated', { success: false, message });
  }
}

// GET NEARBY DRIVERS
export async function getNearByDrivers({ data, socket, res }) {
  const { location, radius } = data; // Ensure radius defaults to 5 km
  //const radiusInKm = radius || 5;
  const radiusInKm =  1000;
  
  console.log('Coordinates:', location , radius);
  const [ longitude, latitude ] = location;

  try {
    const drivers = await DriverLocationModel.find({
      isActive: true,
      status: 'online',
      location: {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInKm / 6378.1], // Converting km to radians
        },
      },
    }).select(`-_id`);

    if (socket) socket.emit('nearbyDrivers', { success: true, drivers });
    return drivers;
  } catch (error) {
    console.log('ERROR FETCHING NEARBY DRIVERS', error);
    if (socket) socket.emit('nearbyDrivers', { success: false, message: 'Error fetching nearby drivers' });
  }
}

//HOME BREAK
export async function homeBreak(req, res) {
  const { autoAcceptRides, rideType, kmRange } = req.body;  
  const { driverId } = req.user;
  try {
    const driver = await DriverModel.findOne({ driverId });
    if(rideType){
      if(!['all', 'personal', 'group', 'split', 'delivery', 'reservation'].includes(rideType)){
        return sendResponse(res, 400, false, 'Ride Type is invalid')
      }
    }
    if (kmRange) {
      if (typeof kmRange !== 'number' || isNaN(kmRange)) {
          return sendResponse(res, 400, false, 'kmRange must be a valid number');
      }
    }
    
    if (autoAcceptRides !== undefined) {
        if (autoAcceptRides !== true && autoAcceptRides !== false) {
            return sendResponse(res, 400, false, 'autoAcceptRides must be either true or false');
        }
    }
    if(autoAcceptRides) driver.autoAcceptRides = autoAcceptRides;
    if(rideType) driver.rideType = rideType;
    if(kmRange) driver.kmRange = kmRange;
    
    await driver.save()

    return sendResponse(res, 200, true, 'Driver account updated')
  } catch (error) {
    console.log('UNABLE TO PROCESS DRIVER HOME BREAK DATA', error);
    return sendResponse(res, 500, false, 'Unable to update information');
  }
}

// ACCEPT RIDE
export async function acceptRideRequest({ data, socket, res }) {
  const { rideId, price } = data
  const { driverId } = socket.user;
  try {
    if(!rideId){
      const message = 'The ride Id is required'
      if(res) return sendResponse(res, 400, false, message)
      if(socket) return socket.emit('acceptRideRquest', { success: false, message })
      return
    }
    if(!price){
      const message = 'Your Price is required'
      if(res) return sendResponse(res, 400, false, message)
      if(socket) return socket.emit('acceptRideRquest', { success: false, message })
      return
    }

    const getRide = await RideModel.findOne({ rideId })
    if(!getRide){
      const message = 'No ride Found'
      if(res) return sendResponse(res, 404, false, message)
      if(socket) return socket.emit('acceptRideRquest', { success: false, message })
      return
    }

    //check if the time the response came in is more than 90 sec from the getRide createdAt
    const currentTime = new Date()
    const timeDiff = currentTime - getRide.createdAt
    if(timeDiff > 90000){
      const message = 'Time to respond to ride request has elapsed'
      if(res) return sendResponse(res, 400, false, message)
      if(socket) return socket.emit('acceptRideRquest', { success: false, message })
      return
    }

    //check if price is two dollar more price above or one dollar below
    const getAppAmount = await AppSettingsModel.findOne()
    const totalRideAmount = getAppAmount.pricePerKm * getRide?.kmDistance

    if(price > totalRideAmount + 5 || price < totalRideAmount - 5){
      const message = 'Price is not within the range'
      if(res) return sendResponse(res, 400, false, message)
      if(socket) return socket.emit('acceptRideRquest', { success: false, message })
      return
    }

    // Check if the driver has already submitted a price for this ride
    let driverPrice = await driverPriceModel.findOne({ rideId });

    let hasSubmittedPrice = false;

    if (driverPrice) {
      hasSubmittedPrice = driverPrice.prices.some((priceEntry) => priceEntry.driverId === driverId);
      
      if (hasSubmittedPrice) {
        const message = 'You have already submitted a price for this ride.'
        if(res) return sendResponse(res, 400, false, message)
        if(socket) return socket.emit('acceptRideRquest', { success: false, message })
        return
      } else {
        driverPrice.prices.push({ driverId, price });
        await driverPrice.save();
      }
    } else {
      // Create a new record if no prices exist for the ride
      driverPrice = await driverPriceModel.create({ rideId, prices: [{ driverId, price }] });
    }


    //remove driverId from driver around region
    const getDriverToRemove = await driverAroundrideRegionModel.findOne({ rideId })
    if(getDriverToRemove){
      getDriverToRemove.driversIds.pop(driverId)
      getDriverToRemove.save()
    }

        //new notification
        await NotificationModel.create({
          accountId: driverId,
          message: `You ride bid has been set for ride ${rideId}. Bid: ${price}`
        })

    const message = 'Your price bid has been recorded';
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('acceptRideRquest', { success: true, message });
    return
  } catch (error) {
    console.log('ERROR ACCEPTING RIDE', error);
    const message = 'Error accepting ride';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('acceptRideRquest', { success: false, message });
  }
}

//ACCEPT EDIT RIDE REQUEST FROM PASSENGER
export async function acceptEditRideRquest({ data, socket, res }) {
  const { rideId, price } = data
  const { driverId, firstName, lastName } = socket.user;
  try {
    if(!rideId){
      const message = 'The ride Id is required'
      if(res) return sendResponse(res, 400, false, message)
      if(socket) return socket.emit('acceptEditRideRquest', { success: false, message })
      return
    }
    if(!price){
      const message = 'Your Price is required'
      if(res) return sendResponse(res, 400, false, message)
      if(socket) return socket.emit('acceptEditRideRquest', { success: false, message })
      return
    }

    const getRide = await RideModel.findOne({ rideId })
    if(!getRide){
      const message = 'No ride Found'
      if(res) return sendResponse(res, 404, false, message)
      if(socket) return socket.emit('acceptEditRideRquest', { success: false, message })
      return
    }
    if(getRide.driverId !== driverId){
      const message = 'Only Driver assigned to this ride can accept this request'
      if(res) return sendResponse(res, 403, false, message)
      if(socket) return socket.emit('acceptEditRideRquest', { success: false, message })
      return
    }

    const getEditRideRequest = await PendingEditRideRequestModel.findOne({ rideId })
    if(!getEditRideRequest){
      const message = 'No edit ride request Found'
      if(res) return sendResponse(res, 404, false, message)
      if(socket) return socket.emit('acceptEditRideRquest', { success: false, message })
      return
    }

    //check if price is two dollar more price above or one dollar below
    const getAppAmount = await AppSettingsModel.findOne()
    const totalRideAmount = getAppAmount.pricePerKm * getEditRideRequest?.totalDistance

    if(price > totalRideAmount + 5 || price < totalRideAmount - 5){
      const message = 'Price is not within the range'
      if(res) return sendResponse(res, 400, false, message)
      if(socket) return socket.emit('acceptEditRideRquest', { success: false, message })
      return
    }

    getEditRideRequest.price = price
    await getEditRideRequest.save()

    //update ride price
    if(getRide.paid){
      Number(getEditRideRequest.price) -= Number(getRide.charge)
      await getEditRideRequest.save()
    } else {
      getRide.charge = getEditRideRequest.price
      await getRide.save()
    }

    //new notification
    await NotificationModel.create({
      accountId: driverId,
      message: `You accepted passenger ride edit request for ride ${rideId}.`
    })

    //push notification to passenger
    try {
      sendNotificationToAccount({
        accountId: getPassenger.passengerId,
        message : `${firstName} ${lastName} (Driver) has accepted your ride edit request.`
      })
    } catch (error) {
      console.log('UNABLE TO SEND SHARE RIDE WITH FRIENDS PUSH NOTIFICATION', error)
    }

    getEditRideRequest.status = 'Accepted'
    await getEditRideRequest.save()

    //send response back to passenger
    const passengerSocketId = passengerConnections.get(getRide.passengerId); // Fetch socket ID
          if (passengerSocketId) {
    
            // Emit to passenger if socket ID is found
            passengerNamespace.to(passengerSocketId).emit('editRideRequestAccepted', { 
              success: true, 
              message: `Driver has agreed to your ride update reqeuest. proceed to make payment`,
              price: getEditRideRequest.price,
              rideId: getRide.rideId
            });
          } else {
            // Log if connection is not found, and skip to the next
            console.log(`No active connection for passenger: ${getRide.passengerId}`);
          }

    const message = 'Your new price bid has been sent to the passenger';
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('acceptEditRideRquest', { success: true, message });
  } catch (error) {
    console.log('ERROR ACCEPTING RIDE', error);
    const message = 'Error accepting ride';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('acceptEditRideRquest', { success: false, message });
  }
}

// CANCEL RIDE REQUEST
export async function cancelRideRequest({ data, socket, res }) {
  const { rideId } = data
  const { driverId } = socket.user;
  try {
    const getRide = await RideModel.findOne({ rideId })
    if(!getRide){
      const message = 'No ride Found'
      if(res) return sendResponse(res, 404, false, message)
      if(socket) return socket.emit('acceptRideRquest', { success: false, message })
      return
    }

    //check if the time the response came in is more than 90 sec from the getRide createdAt
    const currentTime = new Date()
    const timeDiff = currentTime - getRide.createdAt
    if(timeDiff > 90000){
      const message = 'Time to respond to ride request has elapsed'
      if(res) return sendResponse(res, 400, false, message)
      if(socket) return socket.emit('cancelRideRequest', { success: false, message })
      return
    }

    //remove driverId from driver around region
    const getDriverToRemove = await driverAroundrideRegionModel.findOne({ rideId })
    if(getDriverToRemove){
      getDriverToRemove.driversIds.pop(driverId)
      getDriverToRemove.save()
    }

    //add to number of rejected ride to driver
    const getDriver = await DriverModel.findOne({ driverId })
    if (getDriver){
      if(getDriver.cancelRides !== 0){
        getDriver.cancelRides += 1
      }
    }

    const message = 'Ride canceled';
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('cancelRideRequest', { success: true, message });
  } catch (error) {
    console.log('ERROR CANCELING RIDE DRIVER', error);
    const message = 'Error canceling ride';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('cancelRideRequest', { success: false, message });
  }
}

//CANCEL EDIT RIDE REQUEST FROM PASSENGER
export async function rejectEditRideRquest({ data, socket, res }) {
  const { rideId } = data
  const { driverId } = socket.user;
  try {
    if(!rideId){
      const message = 'The ride Id is required'
      if(res) return sendResponse(res, 400, false, message)
      if(socket) return socket.emit('rejectEditRideRquest', { success: false, message })
      return
    }

    const getRide = await RideModel.findOne({ rideId })
    if(!getRide){
      const message = 'No ride Found'
      if(res) return sendResponse(res, 404, false, message)
      if(socket) return socket.emit('rejectEditRideRquest', { success: false, message })
      return
    }
    if(getRide.driverId !== driverId){
      const message = 'Only Driver assigned to this ride can accept this request'
      if(res) return sendResponse(res, 403, false, message)
      if(socket) return socket.emit('rejectEditRideRquest', { success: false, message })
      return
    }

    const getEditRideRequest = await PendingEditRideRequestModel.findOne({ rideId })
    if(!getEditRideRequest){
      const message = 'No edit ride request Found'
      if(res) return sendResponse(res, 404, false, message)
      if(socket) return socket.emit('rejectEditRideRquest', { success: false, message })
      return
    }

    getEditRideRequest.status = 'Rejected'
    await getEditRideRequest.save()

    //send response back to passenger
    const passengerSocketId = passengerConnections.get(getRide?.passengerId); // Fetch socket ID
          if (passengerSocketId) {
    
            // Emit to passenger if socket ID is found
            passengerNamespace.to(passengerSocketId).emit('editRideRequestAccepted', { 
              success: false, 
              message: `Driver has rejected your ride request`,
            });
          } else {
            // Log if connection is not found, and skip to the next
            console.log(`No active connection for passenger: ${getRide?.passengerId}`);
          }

                //PUSH NOTIFICATION
                try {
                  sendNotificationToAccount({
                    accountId: getRide.passengerId,
                    message:  `Driver has rejected your ride request`
                  })
                } catch (error) {
                  console.log('DRIVER REJECT RIDe', error)
                }

                    //new notification
        await NotificationModel.create({
          accountId: driverId,
          message: `You rejected passenger ride edit requset ${rideId}.`
        })

    const message = 'Your have rejected the edit ride reqeust from passenger';
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('rejectEditRideRquest', { success: true, message });
  } catch (error) {
    console.log('ERROR ACCEPTING RIDE', error);
    const message = 'Error accepting ride';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('rejectEditRideRquest', { success: false, message });
  }
}

//START RIDE
export async function startRide({ data, socket, res}) {
  const { rideId } = data
  const { driverId } = socket.user
  try {
        /**
     * 
        take ride to in progress
        */
    const getRide = await RideModel.findOne({ rideId })

    if(!getRide){
      const message = 'Ride with this Id does not exist'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('cancelRide', { success: false, message })
      return
    }
    if(getRide.status !== 'Active' ){
      const message = 'Cannot start ride as it is not Active'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('cancelRide', { success: false, message })
      return
    }
    await DriverLocationModel.updateOne({ driverId }, { status: 'busy', isActive: false });
    await DriverModel.updateOne({ driverId }, { status: 'busy', activeRide: rideId });
    await RideModel.updateOne({ rideId }, { status: 'In progress' });

    //new notification for passenger
    await NotificationModel.create({
      accountId: getRide?.passengerId,
      message: `Ride: ${getRide.rideId} has been started, heading to destination.`
    })

    //PUSH NOTIFICATION
    try {
      sendNotificationToAccount({
        accountId: getRide.passengerId,
        message:  `Ride: ${getRide.rideId} has been started, heading to destination.`
      })
    } catch (error) {
      console.log('PASSENGER RIDE STARTED', error)
    }
    try {
      sendNotificationToAccount({
        accountId: getRide.driverId,
        message:  `Ride: ${getRide.rideId} has been started, heading to destination.`
      })
    } catch (error) {
      console.log('PASSENGER RIDE STARTED', error)
    }

    const message = 'Ride has started'
    if(res) sendResponse(res, 200, true, message)
    if(socket) socket.emit('startRide', { success: true, message })
  } catch {
    const message ='Unable to Start Ride'
    if(res) sendResponse(res, 500, false, message)
    if(socket) socket.emit('startRide', { success: false, message })
  }
}

// COMPLETE RIDE
export async function rideComplete({ socket, res, data }) {
  const { driverId } = socket.user
  const { rideId } = data
  try {
    const getDriver = await DriverModel.findOne({ driverId })
    const getRide = await RideModel.findOne({ rideId })

    if(!getRide){
      const message = 'Ride with this Id does not exist'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('cancelRide', { success: false, message })
      return
    }
    if(getRide.status !== 'In progress' ){
      const message = 'Cannot complete ride as it is not in progress'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('cancelRide', { success: false, message })
      return
    }

    await DriverLocationModel.updateOne({ driverId }, { status: 'online', isActive: true });
    await DriverModel.updateOne({ driverId }, { status: 'online', totalRides: +1, activeRide: '' });
    await RideModel.updateOne({ rideId }, { status: 'Complete' });
    //fund driver acccount
    const getAppSetting = await AppSettingsModel.findOne()
    if(getRide?.rideType === 'delivery'){
      const amount = Number(Number(getAppSetting?.earningCommission) /100) * getRide?.charge
      const finalAmount = Number(getRide?.charge) - amount
      getDriver.earnings += finalAmount
      getDriver.activeRide = ''
      await getDriver.save()
    } else{
      const amount = Number(Number(getAppSetting?.earningCommission) /100) * getRide?.charge
      const finalAmount = Number(getRide?.charge) - amount
      getDriver.earnings += finalAmount
      getDriver.activeRide = ''
      await getDriver.save()
    }

    //new notification for driver
    await NotificationModel.create({
      accountId: driverId,
      message: `Hurray ride completed. Earnings updated`
    })

    //new notification for passenger
    await NotificationModel.create({
      accountId: getRide?.passengerId,
      message: `Ride: ${getRide.rideId} has been completed.`
    })

    //push notification
    try {
      sendNotificationToAccount({
        accountId: driverId,
        message: `Hurray ride completed. Earnings updated`
      })
    } catch (error) {
      console.log('UNABLE TO NOTIFY ridE COMPLETE', error)
    }
    try {
      sendNotificationToAccount({
        accountId: getRide?.passengerId,
        message: `Ride: ${getRide.rideId} has been completed.`
      })
    } catch (error) {
      console.log('UNABLE TO NOTIFY ridE COMPLETE', error)
    }

    const message = 'Ride completed, earings updated driver is now active for another ride';
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('rideComplete', { success: true, message });
  } catch (error) {
    console.log('ERROR COMPLETING RIDE', error);
    const message = 'Error completing ride';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('rideComplete', { success: false, message });
  }
}

//CANCEL RIDE
export async function cancelRide({ res, data, socket}) {

  const { rideId, reason } = data
  const { driverId } = socket.user

  try {
    const getRide = await RideModel.findOne({ rideId })
    if(!getRide){
      const message = 'Ride with this Id does not exist'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('cancelRide', { success: false, message })
      return
    }
    if(getRide.status === 'In progress' || getRide.status === 'Complete' ){
      const message = 'Cannot cancel ride in progress or completed ride'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('cancelRide', { success: false, message })
      return
    }

    const getPassengerId = getRide.passengerId
    const getPassenger = await PassengerModel.findOne({ getPassengerId })
    const appSettings = await AppSettingsModel.findOne()
    const getDriver = await DriverModel.findOne({ driverId: socket.user.driverId })
    const driverId = getDriver?.driverId
    const getDriverLocation = await DriverLocationModel.findOne({ driverId })
    const getRideTransaction =  await RideTransactionModel.findOne({ rideId })

    if(getRide?.paid){
      getRide.status === 'Canceled'
      getRide.driverCancelReason = reason
      await getRide.save()

      getPassenger.wallet += getRide.charge
      await getPassenger.save()

      //update driver
      getDriver.status = 'online'
      getDriver.activeRide = ''
      getDriver.cancelRides += 1
      await getDriver.save()
      getDriverLocation.status = 'online'
      getDriverLocation.isActive = true
      await getDriverLocation.save()
      
      getRideTransaction.status = 'Failed'
      await getRideTransaction.save()

      //aleart passenger
      const passengerSocketId = passengerConnections.get(getRide?.passengerId)
      if(passengerSocketId){
        passengerNamespace.to(passengerSocketId).emit('driverCancelRide', {
          success: false,
          message: `Driver has cancel the ride and you wallet refunded`
        })
      } else{
        console.log('Passenger Active connection not found')
      }

      const message = 'Ride has been canceled'
      if(res) sendResponse( res, 200, true, message)
      if(socket) socket.emit('cancelRide', { success: true, message })
        
      return
    } else {
      getRide.status === 'Canceled'
      getRide.driverCancelReason = reason
      await getRide.save()
      
      //update driver
      getDriver.status = 'online'
      getDriver.activeRide = ''
      getDriver.cancelRides += 1
      await getDriver.save()
      getDriverLocation.status = 'online'
      getDriverLocation.isActive = true
      await getDriverLocation.save()
      
      //aleart passenger
      const passengerSocketId = passengerConnections.get(getRide?.passengerId)
      if(passengerSocketId){
        passengerNamespace.to(passengerSocketId).emit('driverCancelRide', {
          success: false,
          message: `Driver has cancel the ride and your wallet refunded`
        })
      } else{
        console.log('Passenger Active connection not found')
      }

          //new notification
        await NotificationModel.create({
          accountId: driverId,
          message: `You Canceled ride ${rideId}.`
        })

      //PUSH NOTIFICATION
      try {
        sendNotificationToAccount({
          accountId: getRide?.passengerId,
          message: `Driver has cancel the ride and your wallet refunded`
        })
      } catch (error) {
        console.log('DRIVER CANCEL RIDE NOTIFICATION ERROR', error)
      }

      const message = 'Ride has been canceled'
      if(res) sendResponse( res, 200, true, message)
      if(socket) socket.emit('cancelRide', { success: true, message })
      return  
    }

  } catch (error) {
    const message = 'Unable to get ride'
    if(res) sendResponse( res, 500, false, message)
    if(socket) socket.emit('cancelRide', { success: false, message })
  }
}

//CHAT WITH PASSNEGER
export async function chatWithPassenger({ socket, data, res}) {
  const { rideId, message: driverMessage, file } = data
  const { driverId, firstName, lastName } = socket.user
  try {
    const getRide = await RideModel.findOne({ rideId })
    if(!getRide){
      const message = 'Ride does not exist'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('chatWithPassenger', { success: false, message })
      return
    }
    if(driverId !== getRide.driverId){
      const message = 'Not Allowed'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('chatWithPassenger', { success: false, message })
      return
    }

    // Upload image if present
    let imageUrl
    if (file) {
      imageUrl = await uploadBufferFile(file, 'chat-images');
    }

    let getChats
    getChats = await RideChatModel.findOne({ rideId })
    if(!getChats){
      const chatData = {
        message: driverMessage || '',
        from: 'Driver',
        senderId: driverId,
        mediaLink: imageUrl || ''
      }
      const newChat = await RideChatModel.create({
        rideId,
        chats: [chatData]
      })
    } else {
      const chatData = {
        message: driverMessage || '',
        from: 'Driver',
        senderId: driverId,
        mediaLink: imageUrl || ''
      }
      getChats.chats.push(chatData)
      await getChats.save()
    }

    //alert passenger
    const passengerSocketId = passengerConnections.get(getRide.passengerId)
    if(passengerSocketId){
      const message = getChats?.chats
      passengerNamespace.to(passengerSocketId).emit('chatWithDriver', { success: true, message })
    } else {
      console.log('PASSENGER SOCKET FOR CHATS NOT FOUND> PASSENGER NOT ONLINE')
    }

    //push notification
    try {
      sendNotificationToAccount({
        accountId: getRide.passengerId,
        message: `You have a new message from ${firstName} ${lastName}`
      })
    } catch (error) {
      console.log('UNABLE TO NOTIFY PASSENGER OF DRIVER CHAT', error)
    }

    const message = getChats?.chats
    if(res) sendResponse(res, 200, true, message)
    if(socket) socket.emit('chatWithPassenger', { success: true, message })

  } catch (error) {
    console.log('CHAT WITH PASSENGER ERROR', error)
    const message = 'Unable to send message to passenger'
    if(res) sendResponse(res, 500, false, message)
    if(socket) socket.emit('chatWithPassenger', { success: false, message })
  }
}