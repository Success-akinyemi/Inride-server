import { calculateAverageRating, decrypt, generateUniqueCode, initiatePayment, sendResponse, uploadBufferFile, uploadFile } from "../middlewares/utils.js";
import CarDetailModel from "../model/CarDetails.js";
import DriverModel from "../model/Driver.js";
import DriverLocationModel from "../model/DriverLocation.js";
import PendingRideRequestModel from "../model/PendingRideRequest.js";
import RideModel from "../model/Rides.js";
import { Client } from '@googlemaps/google-maps-services-js';
import { driverConnections, driverNamespace, passengerConnections, passengerNamespace } from "../server.js";
import driverAroundrideRegionModel from "../model/DriversAroundRideRegion.js";
import AppSettingsModel from "../model/AppSettings.js";
import driverPriceModel from "../model/DriverPrice.js";
import PassengerModel from "../model/Passenger.js";
import PendingEditRideRequestModel from "../model/PendingEditRide.js";
import CardDetailModel from "../model/CardDetails.js";
import cron from 'node-cron';
import moment from 'moment';
import Stripe from 'stripe';
import RideTransactionModel from "../model/RideTransactions.js";
import RideChatModel from "../model/RideChats.js";
import NotificationModel from "../model/Notifications.js";
import AvailableActiveRideModel from "../model/AvailableActiveRide.js";
import { sendNotificationToAccount } from "./pushNotification.controllers.js";
import UserRideModel from "../model/UserRides.js";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); 
const client = new Client({});

async function calculateTotalDistance({ fromId, to }) {
  console.log('DTAT', fromId, to)
  try {
    const placeIds = [fromId, ...to.map(destination => destination.placeId)];
    let totalDistance = 0;

    for (let i = 0; i < placeIds.length - 1; i++) {
      const originId = placeIds[i];
      const destinationId = placeIds[i + 1];

      const response = await client.distancematrix({
        params: {
          origins: [`place_id:${originId}`],
          destinations: [`place_id:${destinationId}`],
          key: process.env.GOOGLE_MAPS_API_KEY, // Use environment variable for security
        },
      });

      const distance = response.data.rows[0].elements[0].distance?.value; // Distance in meters
      totalDistance += distance;
    }
    //return to 2d.p
    return (totalDistance / 1609.34).toFixed(2); // Convert to miles
  } catch (error) {
    console.error('Error calculating distance:', error);
    throw new Error('Failed to calculate distance');
  }
}

function calculateDistanceInMiles(coord1, coord2) {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const R = 3958.8; // Radius of the Earth in miles
  const toRadians = (deg) => (deg * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function filterDriverIdsByRideType(driverIdForType, rideType) {
  try {
    let query = { driverId: { $in: driverIdForType } };

    // Log the initial query for debugging
    console.log('Initial Query:', query);

    // Determine filter for rideType
    if (rideType) {
      const formattedRideType = rideType.toLowerCase();
      console.log('Ride Type:', formattedRideType);
      query.rideType = { $in: ['all', formattedRideType] };
    } else {
      query.rideType = 'all';
    }

    // Fetch drivers matching the criteria
    const filteredDrivers = await DriverModel.find(query, 'driverId').lean();

    // Log the results of the query
    console.log('Filtered Drivers:', filteredDrivers);

    // Extract and return only driverIds from the filtered drivers
    const filteredDriverIds = filteredDrivers.map(driver => driver.driverId);

    // Log the filtered driver IDs
    console.log('Filtered Driver IDs:', filteredDriverIds);

    return filteredDriverIds;
  } catch (error) {
    console.error('Error filtering driverIds by rideType:', error);
    throw error;
  }
}

// GET NEARBY DRIVERS
export async function getNearByDrivers({ data, socket }) {
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

// REQUEST RIDE
export async function requestRide({ socket, data, res }) {
  const { from, fromId, fromCoordinates, to, personnalRide, noOffPassengers, pickupPoint, rideType, scheduleRide, scheduleTime, scheduleDate } = data;

  if (!from) {
    const message = 'Ride starting point is required';
    if (res) return sendResponse(res, 400, false, message);
    if (socket) socket.emit('rideRequested', { success: false, message });
    return;
  }
  if (!to || to.length < 1) {
    const message = 'At least one destination is required';
    if (res) return sendResponse(res, 400, false, message);
    if (socket) socket.emit('rideRequested', { success: false, message });
    return;
  }
  if (!fromCoordinates || !fromCoordinates.coordinates || fromCoordinates?.coordinates?.length !== 2) {
    const message = 'Coordinates of starting point are required';
    if (res) return sendResponse(res, 400, false, message);
    if (socket) socket.emit('rideRequested', { success: false, message });
    return;
  }
  if(!rideType){
    const message = 'Ride Type is Required'
    if(res) sendResponse(res, 400, false, message)
    if (socket) socket.emit('rideRequested', { success: false, message })
    return
  }
  if(!['personal', 'delivery', 'schedule'].includes(rideType)){
    const message = 'Ride Type is invalid: available ride type: ["personal", "delivery", "schedule"] '
    if(res) sendResponse(res, 400, false, message)
    if (socket) socket.emit('rideRequested', { success: false, message })
    return
  }
  console.log('RIDE TYPE', rideType)
  if(rideType === 'schedule'){ 
    if(!scheduleTime || !scheduleDate){
      const message = 'For scheduled ride, scheduleTime and scheduleDate is required'
      if(res) sendResponse(res, 400, false, message)
      if (socket) socket.emit('rideRequested', { success: false, message })
      return
    }
  }
  if(rideType === 'schedule'){
    // Regular expression for validating date in YYYY-MM-DD format
    const isValidDate = /^\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])$/;

    // Regular expression for validating time in HH:mm (24-hour) format
    const isValidTime = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!isValidDate.test(scheduleDate)) {
        console.error('Invalid scheduleDate format. Expected format: YYYY-MM-DD');
    } else if (!isValidTime.test(scheduleTime)) {
        console.error('Invalid scheduleTime format. Expected format: HH:mm (24-hour)');
        const message = `Invalid scheduleTime format. Expected format: HH:mm (24-hour)`
        if(res) sendResponse(res, 400, false, message)
        if (socket) socket.emit('rideRequested', { success: false, message })
        return
    } else {
        console.log('scheduleDate and scheduleTime are in the correct format.');
        const message = `scheduleDate and scheduleTime are in the correct format.`
        if(res) sendResponse(res, 400, false, message)
        if (socket) socket.emit('rideRequested', { success: false, message })
        return
    }
  }

  try {
    const passenger = socket.user;
    let passengerId =  passenger.passengerId

    const getRideId = await generateUniqueCode(8);
    const rideId = `RF${getRideId}RI`;

    const totalDistanceKm = await calculateTotalDistance({ fromId, to });

    console.log('Total Ride Distance:', totalDistanceKm, 'miles');
    const passengersArray = [passenger.passengerId]
    const newRideRequest = await RideModel.create({
      passengerId: passenger.passengerId || passengersArray[0],
      rideId,
      noOffPassengers,
      personnalRide,
      from,
      fromId,
      passengers: passengersArray,
      fromCoordinates: { type: 'Point', coordinates: fromCoordinates.coordinates },
      to,
      pickupPoint,
      rideType,
      kmDistance: totalDistanceKm,
      scheduleRide: rideType === 'schedule' ? true : false,
      scheduleDate,
      scheduleTime,
    });

    //UPDATE USER RIDE ARRAY
    const getRideUserArray = await UserRideModel.findOne({ accountId: passengerId })
    if(!getRideUserArray){
      await UserRideModel({
        accountId: passengerId,
        rides: [rideId]
      })
    } else {
      getRideUserArray.rides.push(rideId)
      await getRideUserArray.save()
    }

    //new notification
    await NotificationModel.create({
      accountId: passengerId,
      message: `You have Booked a new ride from: ${from}. Ride ID: ${rideId}`
    })

    // Get nearest drivers
    const nearbyDrivers = await DriverLocationModel.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: fromCoordinates.coordinates,
          },
          //$maxDistance: 10000, // 10 km range; adjust as needed
          $maxDistance: 10000000000, // 1000 km range; adjust as needed
        },
      },
      isActive: true,
      status: 'online',
    })
      .exec();

      //get drivers details
      const driverIdForType = nearbyDrivers.map(driver => driver.driverId);
      console.log('driverIdForType', driverIdForType, rideType)
      
      const dirverArray = await filterDriverIdsByRideType(driverIdForType, rideType)
      
      // Get driver details
      //const driverIds = dirverArray.map(driver => driver.driverId);
      const driverIds = dirverArray;
      
      //save nearest drivers
      console.log('nearbyDrivers', driverIds)
      const newDriversAroundRideRegionExist = await driverAroundrideRegionModel.findOne({ rideId: rideId })
      if(newDriversAroundRideRegionExist){
        newDriversAroundRideRegionExist.driversIds = driverIds
        await newDriversAroundRideRegionExist.save()
      } else {

        const newDriversAroundRideRegion = await driverAroundrideRegionModel.create({
          rideId: rideId,
          driversIds: driverIds,
        })
      }

      const getAppAmount = await AppSettingsModel.findOne()
      let price
      if(rideType === 'delivery'){
        price = (getAppAmount?.deliveryPricePerKm * newRideRequest?.kmDistance).toFixed(2)
      } else {
        price = (getAppAmount?.pricePerKm * newRideRequest?.kmDistance).toFixed(2)
      }
      const driverRideRequest = {
        from: newRideRequest?.from,
        kmDistance: newRideRequest?.kmDistance,
        passengerName: `${passenger?.firstName} ${passenger?.lastName}`,
        to: newRideRequest?.to.map(destination => ({
          place: destination.place
        })),
        pickupPoint: newRideRequest?.pickupPoint,
        priceRange: `${price - 5} - ${price + 5}`,
        rideId: newRideRequest?.rideId,
        rideType: newRideRequest?.rideType,
        scheduleTime: newRideRequest?.scheduleTime || '',
        scheduleDate: newRideRequest?.scheduleDate || ''
      }
      //update ride status
      newRideRequest.status = 'Pending'
      await newRideRequest.save()
      //get driver within range and broadcast to them the ride request
      for (const driver of driverIds) {
        console.log('DRIVER ID:', driver);
        const driverSocketId = driverConnections.get(driver); // Fetch socket ID
        console.log('object driver connections:', driverConnections);
        console.log('object driver id:', driverSocketId);
      
        if (driverSocketId) {
          // Emit to driver if socket ID is found
          driverNamespace.to(driverSocketId).emit('newRideRequest', {
            success: true,
            message: `You have a new ${rideType === 'personal' ? 'Personal' : rideType === 'delivery' ? 'Delivery' : 'Schedule'} ride request`,
            ride: driverRideRequest,
          });
        } else {
          // Log if connection is not found, and skip to the next
          console.log(`No active connection for driver ID: ${driver}`);
        }
      
        // notify driver via push notification
        try{
          sendNotificationToAccount({
            accountId: driver,
            message: `You have a new ${rideType === 'personal' ? 'Personal' : rideType === 'delivery' ? 'Delivery' : 'Schedule'} ride request`,
          })
        } catch {
          console.log('UNABLE TO SEND PUSH NOTIFICATION TO DRIVER RIDE REQUEST')
        }
      
        // add ride to driver available ride
        const availableRide = await AvailableActiveRideModel.findOne({ driverId: driver });
        if(availableRide){
          availableRide.rideIds.push(rideId)
          await availableRide.save()
        } else {
          await AvailableActiveRideModel.create({
            driverId: driver,
            rideIds: [rideId]
          })
        }
      }      

    
    const message = 'Ride request successful. driver response would take up to a minute';
    const responsePayload = { rideId, totalDistanceKm, ride: newRideRequest };
    if (res) return sendResponse(res, 200, true, message, responsePayload);
    if (socket) socket.emit('rideRequested', { success: true, message, ...responsePayload });
  
    // 90-second monitoring logic
    setTimeout(async () => {
      try {
        const rideRegion = await driverAroundrideRegionModel.findOne({ rideId });
        if (rideRegion) {
          const driverIds = rideRegion.driversIds;
          await Promise.all(
            driverIds.map(async (driverId) => {
              const driver = await DriverModel.findOne({ driverId });
              if (driver) {
                driver.cancelRides = (driver.cancelRides || 0) + 1;
                await driver.save();
              }
            })
          );
          await driverAroundrideRegionModel.deleteOne({ rideId });
          console.log(`Processed and cleaned up rideId: ${rideId}`);
        }

        //send top three drivers with the lowest price to the user
        const getRidePrices = driverPriceModel.findOne({ rideId })
        if(getRidePrices){
          const ride = await RideModel.findOne({ rideId });
          if (!ride){
            const message = 'Ride not found'
            if (res) return sendResponse(res, 404, false, message);
            if (socket) socket.emit('rideRequested', { success: false, message });
          }
        
          const driverPrices = await driverPriceModel.findOne({ rideId });
          if (!driverPrices || driverPrices.prices.length === 0){
            console.log('NO DRIVERS WITH PRICES')
            const message = 'Could not get drivers for your ride request. Please try again';
            if (res) return sendResponse(res, 404, false, message);
            if (socket) socket.emit('rideRequested', { success: false, message });
            return
          }

          // Get top 3 lowest prices
          const topPrices = driverPrices?.prices
          .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
          .slice(0, 3);

          //new notification
          await NotificationModel.create({
            accountId: passengerId,
            message: `Drivers for Ride: ${rideId} are availble.`
          })

          //Arange Result
          const results = await Promise?.all(
            topPrices?.map(async (priceEntry) => {
              const { driverId, price } = priceEntry;
              
              // Fetch driver details
              const driver = await DriverModel.findOne({ driverId });
              if (!driver) return null;
        
              // Fetch driver location
              const driverLocation = await DriverLocationModel.findOne({ driverId });
              const distance = driverLocation && ride.fromCoordinates.coordinates
                ? calculateDistanceInMiles(ride.fromCoordinates.coordinates, driverLocation.location.coordinates)
                : null;
        
              // Fetch car details, select active car or the first one if only one car exists
              const carDetails = await CarDetailModel.findOne({ driverId });
              const activeCar = carDetails?.cars.find(car => car.active) || carDetails?.cars[0];
              
              //Avearge time to reach
              const averageSpeed = 30;
              let estimatedTimeToPickup = null;
              if (distance !== null) {
                // Time in hours = distance / speed
                const timeInHours = distance / averageSpeed;
                // Convert time in hours to minutes
                estimatedTimeToPickup = timeInHours * 60;
                // Round the result to a reasonable number of minutes
                estimatedTimeToPickup = Math.round(estimatedTimeToPickup); // Round to nearest minute
              }

              return {
                driver: {
                  firstName: driver.firstName,
                  lastName: driver.lastName,
                  email: driver.email,
                  mobileNumber: driver.mobileNumber,
                  totalRides: driver.totalRides,
                  ratings: calculateAverageRating(driver.ratings),
                  driverId: driver.driverId
                },
                car: activeCar ? {
                  model: activeCar.model,
                  year: activeCar.year,
                  color: activeCar.color,
                  registrationNumber: activeCar.registrationNumber,
                  noOfSeats: activeCar.noOfSeats,
                  carImgUrl: activeCar.carImgUrl,
                } : null,
                distanceToPickupPoint: distance !== null ? distance.toFixed(2) : 'Unknown',
                estimatedTimeToPickup: estimatedTimeToPickup !== null ? `${estimatedTimeToPickup}` : 'Unknown',
                price,
                rideId
              };
            })
          );

          let passengerSocketId = passengerConnections.get(passenger.passengerId); // Fetch socket ID
          console.log('object driver connections:', passengerConnections);
          console.log('object driver id:', passengerSocketId);  

          const finalResult = results?.filter(result => result !== null); // Filter out null results
          const message = 'Drivers Available'
          if(res) return sendResponse(res, 200, true, finalResult, message)
          if(socket) return passengerNamespace.to(passengerSocketId).emit('availableDriversForRide', { success: true, message, finalResult})
        
        } else {
          //new notification
          await NotificationModel.create({
            accountId: passengerId,
            message: `Could not get drivers for ride: ${rideId}. Please try again`
          })
          const message = 'Could not get drivers for your ride request. Please try again';
          if (res) return sendResponse(res, 400, false, message);
          if (socket) passengerNamespace.to(passengerSocketId).emit('rideRequested', { success: false, message });
        }
      } catch (error) {
        console.error(`Failed to process ride after 90 seconds for rideId: ${rideId}`, error);
      }
    }, 60000); // 60 seconds

  } catch (error) {
    console.log('UNABLE TO REQUEST RIDE', error);
    const message = 'Unable to request ride';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('rideRequested', { success: false, message });
  }
}

//REQUEST DRIVER
export async function requestDriver({ data, socket, res }) {
  const { driverId, rideId } = data
  const { passengerId, firstName, lastName, mobileNumber } = socket.user
  try {
    //find ride
    const findRide = await RideModel.findOne({ rideId })
    if(!findRide){
      const message = 'Ride with this Id does not exist';
      if (res) return sendResponse(res, 404, false, message);
      if (socket) socket.emit('requestDriver', { success: false, message });
    }

    //ensure passenger id matches passenger id on ride
    if(findRide?.passengerId !== passengerId ){
      const message = 'Passenger only allowed to request ride';
      if (res) return sendResponse(res, 403, false, message);
      if (socket) socket.emit('requestDriver', { success: false, message });
    }

    let newRideRequest
    newRideRequest = await PendingRideRequestModel.findOne({ rideId: findRide?.rideId, })
    console.log('newRideRequest', newRideRequest)
    if(!newRideRequest){
      
      newRideRequest = PendingRideRequestModel.create({
        rideId: findRide?.rideId,
        driverId: driverId
      })
  
      findRide.driverId = driverId
      findRide.status = 'Requested'
      await findRide.save()

      //UPDATE USER RIDE ARRAY
      const getRideUserArray = await UserRideModel.findOne({ accountId: driverId })
      if(!getRideUserArray){
        await UserRideModel({
          accountId: driverId,
          rides: [rideId]
        })
      } else {
        getRideUserArray.rides.push(rideId)
        await getRideUserArray.save()
      }
  
      const getDriverPrice = await driverPriceModel.findOne({ rideId  })
      if(!getDriverPrice){
        const message = 'Driver Price not found';
        if (res) return sendResponse(res, 404, false, message);
        if (socket) socket.emit('requestDriver', { success: false, message });
        return
      }

      // Fetch car details, select active car or the first one if only one car exists
      const carDetails = await CarDetailModel.findOne({ driverId });
      const activeCar = carDetails?.cars.find(car => car.active) || carDetails?.cars[0];
      
      const car = {
        model: activeCar?.model,
        year: activeCar?.year,
        color: activeCar?.color,
        registrationNumber: activeCar?.registrationNumber,
        noOfSeats: activeCar?.noOfSeats,
        carImgUrl: activeCar?.carImgUrl,
      }

      //get the specific price of the driver with the driverId from the prices array of getDriverPrice
      const driverPrice = getDriverPrice.prices.find(price => price.driverId === driverId)
      findRide.charge = driverPrice.price
      findRide.carDetails = car
      
      await findRide.save()
    
  
      /**
       Get Driver
      */
      const driverSocketId = driverConnections.get(driverId)
      console.log('object driver connections', driverConnections)
      console.log('object alerted driver id', driverSocketId)
      //Alert Driver
      const rideRequestData = {
        success: true,
        message: 'You have a new ride request',
        data: {
          rideId,
          passengerName: `${firstName} ${lastName}`,
          mobileNumber: mobileNumber,
          from: findRide?.from,
          to: findRide?.to.map(destination => ({
            place: destination.place
          })),
          distance: findRide?.kmDistance
        }
      }
  
      driverNamespace.to(driverSocketId).emit('driverRequested', rideRequestData)

      //PUSH  NOTIFICATIONS
      try{
        sendNotificationToAccount({
          accountId: driverId,
          message: `New Ride Request`
        })
      } catch {
        console.log('UNABLE TO SEND PUSH NOTIFICATION TO DRIVER')
      }

      //alert other drivers that passenger has gotten a driver
      const otherDrivers = getDriverPrice.prices.filter(
        (price) => price.driverId !== driverId
      );

      const otherDriversData = otherDrivers.map(({ driverId }) => ({
        driverId,
        socketId: driverConnections.get(driverId),
      }));

      otherDriversData.forEach(({ socketId }) => {
        if (socketId) {
          driverNamespace.to(socketId).emit("passengerFoundDriver", {
            success: true,
            message: "The passenger has already chosen another driver.",
          });
        }
      });
  
      const message = 'Driver Request and Booking Updated. Proceed to payment to start ride';
      if (res) return sendResponse(res, 200, true, message);
      if (socket) socket.emit('requestDriver', { success: true, message, rideId: rideId, price: findRide?.charge });
      
      return
    } else {
      const message = 'Driver Already Requested';
      if (res) return sendResponse(res, 200, false, message);
      if (socket) socket.emit('requestDriver', { success: false, message });
      return
    }

  } catch (error) {
    console.log('ERROR REQUESTING DRIVER', error);
    const message = 'Error requesting driver';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('requestDriver', { success: false, message });
  }
}

//MAKE PAYMENT FOR RIDE
export async function payForRide({ socket, data, res }) {
  const { rideId, paymentType, cardDetails, cardId } = data
  const { passengerId } = socket.user
  if(!rideId){
    const message = 'Ride Id is required'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForRide', { success: false, message})
    return
  }
  if(!paymentType){
    const message = 'Payment type is required'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForRide', { success: false, message})
    return
  }
  if(!(['card', 'wallet', 'direct']).includes(paymentType)){
    const message = 'Invalid payment type. ["card", "wallet", "direct"]'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForRide', { success: false, message})
    return
  }

  try {
    const getRide = await RideModel.findOne({ rideId })
    if(!getRide){
      const message = 'Ride with this Id does not exist'
      if(res) sendResponse(res, 400, false, message)
      if(socket) socket.emit('payForRide', { success: false, message})
      return
    }
    if(getRide?.passengerId !== passengerId){
      const message = 'not allowed to edit this ride'
      if(res) sendResponse(res, 400, false, message)
      if(socket) socket.emit('payForRide', { success: false, message})
      return
    }
    const driverId = getRide.driverId
    const getPassenger = await PassengerModel.findOne({ passengerId })
    const getDriver = await DriverModel.findOne({ driverId })
    const getDriverLocation = await DriverLocationModel.findOne({ driverId })

    //RIDE DETAILS TO DRIVER
    const rideDetails = {
      from: getRide?.from,
      fromCoordinates: getRide?.fromCoordinates,
      to: getRide?.to,
      pickupPoint: getRide?.pickupPoint,
      kmDistance: getRide?.kmDistance,
      charge: getRide?.charge,
      status: 'Active',
      noOffPassengers: getRide?.passengers?.length,
      rideType: getRide?.rideType,
      nameOfPassenger: `${getPassenger?.firstName} ${getPassenger?.lastName}`,
      nameOfDriver: `${getDriver?.firstName} ${getDriver?.lastName}`
    }

    //MAKE PAYMENT
    if(paymentType === 'card' || paymentType === 'direct'){
      const makePayment = await initiatePayment({
        amount: getRide.charge,
        accountId: passengerId,
        paymentfor: 'ridebooking',
        rideId
      })

      if(!makePayment.success){
        const message = makePayment.data || 'Unable to process payment'
        if(res) sendResponse(res, false, 400, message)
        if(socket) socket.emit('payForRide', { success: false, message })
        return
      }

      const data = makePayment.data
      const message = makePayment.message
      if(res) sendResponse(res, false, 400, message)
      if(socket) socket.emit('payForRide', { success: true, data, message })
      
        return
    }

    if(paymentType === 'wallet'){
      if(getPassenger.wallet < getRide.charge){
        const message = 'Insufficient wallet balance to complete ride payment'
        if(res) sendResponse(res, false, 400, message)
        if(socket) socket.emit('payForRide', { success: false, message })
        return
      }
      getPassenger.wallet -= getRide.charge
      getPassenger.wallet.toFixed(2)
      await getPassenger.save()

      getRide.status = 'Active'
      getRide.paid = true
      getRide.paymentMethod = 'Wallet'
      await getRide.save()

      //update driver
      getDriver.status = 'busy'
      getDriver.activeRide = rideId
      await getDriver.save()
      getDriverLocation.status = 'busy'
      getDriverLocation.isActive = false
      await getDriverLocation.save()

      //new payment transaction
      const newPayment = await RideTransactionModel.create({
        rideId: getRide.rideId,
        driverId: getRide.driverId,
        amount: getRide.charge,
        payableAmount: Number(0.7 * Number(getRide.charge)),
        status: 'Successful'
      })

      //new notification for passenger
      await NotificationModel.create({
        accountId: passengerId,
        message: `Ride: ${getRide.rideId} has been paid for and it is now active`
      })

      //new notification for driver
      await NotificationModel.create({
        accountId: getRide?.driverId,
        message: `Ride: ${getRide.rideId} has been paid for and it is now active`
      })

      //inform driver ride ride has bee activated
      const driverSocketId = driverConnections.get(getRide?.driverId); // Fetch socket ID
  
      if (driverSocketId) {
        // Emit to driver if socket ID is found
        driverNamespace.to(driverSocketId).emit('newRideActivated', { 
          success: true, 
          message: `New ${getRide?.rideType === 'schedule' && 'Scheduled'} ride has been activated. ${getRide?.rideType === 'schedule' && `This ride ride has been scheduled to the pickup time.`}`,
          ride: rideDetails,
          driverLocation: getDriverLocation
        });
        console.log('DRIVER', { 
          success: true, 
          message: `New ${getRide?.rideType === 'schedule' && 'Scheduled'} ride has been activated. ${getRide?.rideType === 'schedule' && `This ride ride has been scheduled to the pickup time.`}`,
          ride: rideDetails,
          driverLocation: getDriverLocation
        })
        //update driver location for personal and deliver ride
        if(getRide?.rideType !== 'schedule') getDriverLocation.status = 'busy'
        if(getRide?.rideType !== 'schedule') getDriverLocation.isActive = false
        await getDriverLocation.save()
        if(getRide?.rideType !== 'schedule') getDriver.status = 'busy'
        await getDriver.save()
      } else {
        console.log(`No active connection for driver ID: ${getRide?.driverId}`);
      }

      //inform passenger ride has been activated payment complete
      const message = 'Payment succesful ride has been activated'
      socket.emit('payForRide', { 
        success: true, 
        message,
        ride: rideDetails,
        driverLocation: getDriverLocation
      })

      //PUSH NOTIFICATIONS
      try {
        sendNotificationToAccount({
          accountId: passengerId,
          message: 'Payment succesful ride has been activated',
        })

      } catch (error) {
        console.log('UNABLE SEND NOTIFICATION', error)
      }
      try {
        sendNotificationToAccount({
          accountId: getRide?.driverId,
          message: `New ${getRide?.rideType === 'schedule' && 'Scheduled'} ride has been activated. ${getRide?.rideType === 'schedule' && `This ride ride has been scheduled to the pickup time.`}`,
        })
        
      } catch (error) {
        console.log('UNABLE SEND NOTIFICATION DRIVER', error)
      }
      
      return
    }

  } catch (error) {
    console.log('UNABLE TO PROCESS PAYMENT FOR RIDE', error)
    const message = 'Unable to process payment for ride'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForRide', { success: false, message})
  }
}

//MAKE PAYMENT FOR EDIT RIDE WITH UPDATED PRICE
export async function payForEditRide({ socket, data, res }) {
  const { rideId, paymentType, cardDetails, cardId } = data
  const { passengerId } = socket.user
  if(!rideId){
    const message = 'Ride Id is required'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForEditRide', { success: false, message})
    return
  }
  if(!paymentType){
    const message = 'Payment type is required'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForEditRide', { success: false, message})
    return
  }
  if(!(['card', 'wallet', 'direct']).includes(paymentType)){
    const message = 'Invalid payment type. ["card", "wallet", "direct"]'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForEditRide', { success: false, message})
    return
  }

  try {
    const getRide = await RideModel.findOne({ rideId })
    const getPendingRide = await PendingEditRideRequestModel.findOne({ rideId })
    if(!getRide){
      const message = 'Ride with this Id does not exist'
      if(res) sendResponse(res, 400, false, message)
      if(socket) socket.emit('payForEditRide', { success: false, message})
      return
    }
    if(getRide?.passengerId !== passengerId){
      const message = 'not allowed to edit this ride'
      if(res) sendResponse(res, 400, false, message)
      if(socket) socket.emit('payForEditRide', { success: false, message})
      return
    }
    const driverId = getRide.driverId
    const getPassenger = await PassengerModel.findOne({ passengerId })
    const getDriver = await DriverModel.findOne({ driverId })
    const getDriverLocation = await DriverLocationModel.findOne({ driverId })

    //RIDE DETAILS TO DRIVER
    const rideDetails = {
      from: getRide?.from,
      fromCoordinates: getRide?.fromCoordinates,
      to: getRide?.to,
      pickupPoint: getRide?.pickupPoint,
      kmDistance: getRide?.kmDistance,
      charge: Number(getRide?.charge) + Number(getPendingRide?.price),
      status: 'Active',
      noOffPassengers: getRide?.passengers?.length,
      rideType: getRide?.rideType,
      nameOfPassenger: `${getPassenger?.firstName} ${getPassenger?.lastName}`,
      nameOfDriver: `${getDriver?.firstName} ${getDriver?.lastName}`
    }

    //MAKE PAYMENT
    if(paymentType === 'card' || paymentType === 'direct'){
      const makePayment = await initiatePayment({
        amount: getRide.paid ? getPendingRide.price : getRide.charge,
        accountId: passengerId,
        paymentfor: 'ridebooking',
        rideId
      })

      if(!makePayment.success){
        const message = makePayment.data || 'Unable to process payment'
        if(res) sendResponse(res, false, 400, message)
        if(socket) socket.emit('payForEditRide', { success: false, message })
        return
      }

      const data = makePayment.data
      const message = makePayment.message
      if(res) sendResponse(res, false, 400, message)
      if(socket) socket.emit('payForEditRide', { success: true, data, message })
      return
    }

    if(paymentType === 'wallet'){
      if(getPassenger.wallet < getRide.charge){
        const message = 'Insufficient wallet balance to complete ride payment'
        if(res) sendResponse(res, false, 400, message)
        if(socket) socket.emit('payForEditRide', { success: false, message })
        return
      }
      if(getRide.paid){
        getPassenger.wallet -= getPendingRide.price
        await getPassenger.save()
      } else {
        getPassenger.wallet -= getRide.charge
        await getPassenger.save()
      }

      getRide.status = 'Active'
      getRide.paid = true
      getRide.charge += getPendingRide?.price
      getRide.paymentMethod = 'Wallet'
      await getRide.save()

      //new payment transaction
      const newPayment = await RideTransactionModel.create({
        rideId: getRide.rideId,
        driverId: getRide.driverId,
        amount: getPendingRide.price,
        payableAmount: Number(0.7 * Number(getPendingRide.price)),
        status: 'Successful'
      })

      //new notification for passenger
      await NotificationModel.create({
        accountId: passengerId,
        message: `Ride: ${getRide.rideId} has been paid for and it is now active`
      })

      //new notification for driver
      await NotificationModel.create({
        accountId: getRide?.driverId,
        message: `Ride: ${getRide.rideId} has been paid for and it is now active`
      })
      

      //inform driver ride ride has bee activated
      const driverSocketId = driverConnections.get(getRide?.driverId); // Fetch socket ID
  
      if (driverSocketId) {
        // Emit to driver if socket ID is found
        driverNamespace.to(driverSocketId).emit('newRideActivated', { 
          success: true, 
          message: `New ${getRide?.rideType === 'schedule' && 'Scheduled'} ride has been activated. ${getRide?.rideType === 'schedule' && `This ride ride has been scheduled to the pickup time.`}`,
          ride: rideDetails,
          driverLocation: getDriverLocation
        });

        //update driver location for personal and deliver ride
        if(getRide?.rideType !== 'schedule') getDriverLocation.status = 'busy'
        if(getRide?.rideType !== 'schedule') getDriverLocation.isActive = false
        await getDriverLocation.save()
        if(getRide?.rideType !== 'schedule') getDriver.status = 'busy'
        await getDriver.save()
      } else {
        console.log(`No active connection for driver ID: ${getRide?.driverId}`);
      }

      //inform passenger ride has been activated payment complete
      const message = 'Payment succesful ride has been updated'
      socket.emit('payForEditRide', { 
        success: true, 
        message,
        ride: rideDetails,
        driverLocation: getDriverLocation
      })

      try {
        sendNotificationToAccount({
          accountId: passengerId,
          message: 'Payment succesful ride has been updated'
        })
      } catch (error) {
        console.log('NOTIFUCATION ERROR', error)
      }
      try {
        sendNotificationToAccount({
          accountId: getRide?.driverId,
          message: `New ${getRide?.rideType === 'schedule' && 'Scheduled'} ride has been activated. ${getRide?.rideType === 'schedule' && `This ride ride has been scheduled to the pickup time.`}`
        })
      } catch (error) {
        console.log('DRIVER NOTIFUCATION ERROR', error)
      }
      return
    }

  } catch (error) {
    console.log('UNABLE TO PROCESS PAYMENT FOR RIDE TO BE UPDATED')
    const message = 'Unable to process payment for ride to be updated'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForEditRide', { success: false, message})
  }
}

//HANDLE SCHEDULED RIDE
export function scheduleRideAlerts() {
  // Run every 60 seconds
  cron.schedule('* * * * *', async () => {
    try {
      // Get current date and time
      const currentDate = moment().format('YYYY-MM-DD');
      const currentTime = moment().format('HH:mm');

      // Find all rides with rideType: 'schedule' or scheduleRide: true, whose scheduleDate and scheduleTime match the current time
      const rides = await RideModel.find({
        rideType: 'schedule',
        scheduleRide: true,
        scheduleDate: currentDate,
        scheduleTime: currentTime,
        status: 'Pending', // Ensure only rides not yet activated are considered
      });

      if (rides.length === 0) {
        console.log('No scheduled rides at this time.');
        return;
      }

      
      for (const ride of rides) {
        const { driverId, passengerId } = ride;

        // Fetch driver location, passenger, and driver details
        const getDriverLocation = await DriverLocationModel.findOne({ driverId });
        const getPassenger = await PassengerModel.findOne({ passengerId });
        const getDriver = await DriverModel.findOne({ driverId });

        if (!getPassenger || !getDriver) {
          console.log(`Passenger or Driver not found for Ride ID: ${ride.rideId}`);
          continue;
        }

        // Prepare ride details
        const rideDetails = {
          from: ride.from,
          fromCoordinates: ride.fromCoordinates,
          to: ride.to,
          pickupPoint: ride.pickupPoint,
          kmDistance: ride.kmDistance,
          charge: ride.charge,
          status: 'Active',
          noOffPassengers: ride.passengers?.length || 1,
          rideType: ride.rideType,
          nameOfPassenger: `${getPassenger.firstName} ${getPassenger.lastName}`,
          nameOfDriver: `${getDriver.firstName} ${getDriver.lastName}`,
        };

        //new notification for passenger
        await NotificationModel.create({
          accountId: ride?.passengerId,
          message: `Scheduled Ride: ${ride.rideId} is now active, get ready for pickup`
        })

        //new notification for driver
        await NotificationModel.create({
          accountId: ride?.driverId,
          message: `Scheduled Ride: ${ride.rideId} is now active head over to pick passenger`
        })

        // Driver socket notification
        const driverSocketId = driverConnections.get(driverId);
        if (driverSocketId) {
          driverNamespace.to(driverSocketId).emit('newRideActivated', {
            success: true,
            message: `Schedule Ride is now active. Head over to the pickup location to start the ride.`,
            ride: rideDetails,
            driverLocation: getDriverLocation,
          });
        } else {
          console.log(`No active connection for Driver ID: ${driverId}`);
        }

        // Passenger socket notification
        const passengerSocketId = passengerConnections.get(passengerId);
        if (passengerSocketId) {
          passengerNamespace.to(passengerSocketId).emit('payForRide', {
            success: true,
            message: `Schedule Ride is now active. The driver has been notified to come to the pickup location.`,
            ride: rideDetails,
            driverLocation: getDriverLocation,
          });
        } else {
          console.log(`No active connection for Passenger ID: ${passengerId}`);
        }

        try {
          sendNotificationToAccount({
            accountId: driverId,
            message: 'Schedule Ride is now active. Head over to the pickup location to start the ride.'
          })

        } catch (error) {
          console.log('UNABLE TO SEND PUSH NOTIFICATION SCHEDULED', error)
        }
        try {
          sendNotificationToAccount({
            accountId: passengerId,
            message: 'Schedule Ride is now active. The driver has been notified to come to the pickup location.'
          })
          
        } catch (error) {
          console.log('UNABLE TO SEND PUSH NOTIFICATION SCHEDULED PASSENGER', error)
        }

        // Update ride status to "Active"
        ride.status = 'Active';
        await ride.save();
      }
    } catch (error) {
      console.error('Error processing scheduled rides:', error);
    }
  });
}

//SHARE RIDE WITH FRIENDS
export async function shareRideWithFriends({ data, socket, res}) {
  const { friends, rideId } = data
  const { passengerId, firstName, lastName } = socket.user
  if(friends?.length < 1){
    const message = 'No Friends number sent'
    if(res) sendResponse(res, 404, false, message)
    if(socket) socket.emit('shareRideWithFriends', { success: false, message })
    return
  }
  try {
    const getRide = RideModel.findOne({ rideId })
    if(!getRide){
      const message = 'No ride with this Id found'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('shareRideWithFriends', { success: false, message })
      return
    }
    if(passengerId !== getRide?.passengerId ){
      const message = 'You can only share you ride'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('shareRideWithFriends', { success: false, message })
      return
    }
    if(getRide.status === 'Complete' || getRide.status === 'In progress'){
      const message = 'Cannot share this ride as it is completed or in progress'
      if(res) sendResponse(res, 400, false, message)
      if(socket) socket.emit('shareRideWithFriends', { success: false, message})
      return
    }
    //get users who also have an account with ridefuze
    const existingPassengers = await PassengerModel.find({
      mobileNumber: { $in: friends },
    });

    // Extract only the mobileNumber from the found passengers
    const foundFriends = existingPassengers.map((passenger) => passenger.mobileNumber);
    
    const totalPassengers = Number(getRide?.passengers?.length) + Number(foundFriends?.length)

    //ensure they are no more than car capcity
    if(totalPassengers > getRide?.carDetails?.noOfSeats ){
      const message = `This Ride car can only take ${getRide?.carDetails?.noOfSeats} number of people`
      if(res) sendResponse(res, 400, false, message)
      if(socket) socket.emit('shareRideWithFriends', { success: false, message })
    }

    //add them in
    getRide?.passengers.push(foundFriends)
    //update ride
    await getRide.save()
    
    // Notify friends
    for (const mobileNumber of foundFriends) {
      console.log('FRIEND MOBILE ID:', mobileNumber);

      // Fetch passenger
      const getPassenger = await PassengerModel.findOne({ mobileNumber });
      if (!getPassenger) {
        console.log(`No passenger found for mobile number: ${mobileNumber}`);
        continue; // Skip to the next iteration
      }

      // Fetch socket ID
      const passengerSocketId = passengerConnections.get(getPassenger.passengerId);
      console.log('Passenger Connections:', passengerConnections);
      console.log('Passenger ID:', passengerSocketId);

      const toPlaces = getRide?.to.map(destination => ({
        place: destination.place
      }));

      // Store notification
      await NotificationModel.create({
        accountId: getPassenger.passengerId,
        message: `${firstName} ${lastName} shared a ride with you from ${getRide?.from} to ${toPlaces.map(i => i.place)}.`
      });

      if (passengerSocketId) {
        // Emit to passenger if socket ID is found
        passengerNamespace.to(passengerSocketId).emit('newRideShared', { 
          success: true, 
          message: `${firstName} ${lastName} has shared a ride with you.`,
          ride: {
            from: getRide?.from,
            to: toPlaces,
          }, 
        });
      } else {
        console.log(`No active connection for passenger mobile number: ${mobileNumber}`);
      }

      try {
        sendNotificationToAccount({
          accountId: getPassenger.passengerId,
          message : `${firstName} ${lastName} shared a ride with you.`
        })
      } catch (error) {
        console.log('UNABLE TO SEND SHARE RIDE WITH FRIENDS PUSH NOTIFICATION', error)
      }
    }

    await NotificationModel.create({
      accountId: passengerId,
      message: `You have shared you ride with ${totalPassengers} of your loved ones`
    })

    try {
      sendNotificationToAccount({
        accountId: passengerId,
        message: `You have shared you ride with ${totalPassengers} of your loved ones`
      })
    } catch (error) {
      console.log('UNABLE TO SEND PUSH NOTIFICATION OF SHARE RIDE', error)
    }

    getRide.rideType = 'group'
    await getRide.save()
    const message = `${foundFriends?.length} of your loveds ones have been added to the ride`
    if(res) sendResponse(res, 200, true, message)
    if(socket) socket.emit('shareRideWithFriends', { success: true, message })
  } catch (error) {
    console.log('ERROR SHARING RIDE WITH FRIENDS', error);
    const message = 'Error sharing ride with friends';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('requestDriver', { success: false, message });
  } 
}

//EDIT RIDE
export async function editRide({ data, socket, res}) {
  const { to, rideId } = data
  const { passengerId, firstName, lastName } = socket.user
  if (!to || to.length < 1) {
    const message = 'At least one destination to add is required';
    if (res) return sendResponse(res, 400, false, message);
    if (socket) socket.emit('editRide', { success: false, message });
    return;
  }
  try {
    const getRide = await RideModel.findOne({ rideId })
    if(!getRide){
      const message = 'No ride with this Id found'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('editRide', { success: false, message })
      return
    }
    if(passengerId !== getRide?.passengerId ){
      const message = 'You can only edit your ride'
      if(res) sendResponse(res, 403, false, message)
      if(socket) socket.emit('editRide', { success: false, message })
      return
    }
    if(getRide.status === 'Complete'){
      const message = 'Cannot share this ride as it is completed'
      if(res) sendResponse(res, 400, false, message)
      if(socket) socket.emit('editRide', { success: false, message})
      return
    }

    const getAppAmount = await AppSettingsModel.findOne()
    
    const pendingRideRequest = await PendingEditRideRequestModel.findOne({ rideId })
    if(!pendingRideRequest){      
      let newDestinations = [...(getRide?.to || []), ...(to || [])];
      
      const fromId = getRide?.fromId
      console.log('FROM ID', fromId, 'NEW DESTINATIONS', newDestinations, 'TO', to)
      const totalDistanceMiles = await calculateTotalDistance({ fromId, to: newDestinations });
      
      console.log('New Total Ride Distance:', totalDistanceMiles, 'miles');

      const newPendingRideRequest = await PendingEditRideRequestModel.create({
        rideId,
        to: newDestinations,
        totalDistance: totalDistanceMiles
      }) 

      //make request to driver
      const driverSocketId = driverConnections.get(getRide?.driverId);
      if (driverSocketId) {

        // Emit to driver if socket ID is found
        driverNamespace.to(driverSocketId).emit('newEditRideRequest', { 
          success: true, 
          message: `${firstName} ${lastName} has requested to edit the ride destinations`,
          ride: {
            from: getRide?.from,
            to: newPendingRideRequest?.to.map(destination => ({
              place: destination.place
            })),
          }, 
          totalDistance: newPendingRideRequest?.totalDistance,
          priceRange: getAppAmount?.pricePerKm * newPendingRideRequest?.totalDistance,
        });
      } else {
        // Log if connection is not found, and skip to the next
        console.log(`No active connection for driver ID: ${driver}`);
      }

      //update passenger
      const message = 'Edit ride request has been sent to the driver'
      if(res) sendResponse(res, true, 201, message)
      if(socket) socket.emit('editRide', { success: true, message })
      return
    } else {
      pendingRideRequest?.to.push(to)
      await pendingRideRequest.save()
      
      const fromId = getRide?.fromId
      const destination = pendingRideRequest?.to
      const totalDistanceMiles = await calculateTotalDistance({ fromId, destination });
      
      console.log('New Total Ride Distance:', totalDistanceMiles, 'miles');

      pendingRideRequest.totalDistance = totalDistanceMiles
      pendingRideRequest.status = 'Pending'
      await pendingRideRequest.save()

            //make request to driver
            const driverSocketId = driverConnections.get(getRide?.driverId);
            if (driverSocketId) {
      
              // Emit to driver if socket ID is found
              driverNamespace.to(driverSocketId).emit('newEditRideRequest', { 
                success: true, 
                message: `${firstName} ${lastName} has requested to edit the ride destinations. Enter a new price for the entire ride`,
                ride: {
                  from: getRide?.from,
                  to: pendingRideRequest?.to.map(destination => ({
                    place: destination.place
                  })),
                }, 
                totalDistance: pendingRideRequest?.totalDistance,
                priceRange: getAppAmount?.pricePerKm * pendingRideRequest?.totalDistance,
              });
            } else {
              // Log if connection is not found, and skip to the next
              console.log(`No active connection for driver ID: ${driver}`);
            }
      
            //update passenger
            const message = 'Edit ride request has been sent to the driver'
            if(res) sendResponse(res, true, 201, message)
            if(socket) socket.emit('editRide', { success: true, message })
            return
    }

  } catch (error) {
    const message = 'Unable to edit ride'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('editRide', { success: false, message})
    return
  }
}

//CANCEL RIDE
export async function cancelRide({ data, socket, res}) {
  const { rideId, reason } = data
  const { passengerId } = socket.user
  if(!reason){
    const message = 'Please provide a reason for canceling the ride'
    if(res) sendResponse(res, 404, false, message)
    if(socket) socket.emit('cancelRide', { success: false, message })
    return
  }
  try {
    const getRide = await RideModel.findOne({ rideId })
    const getRideTransaction = await RideTransactionModel.findOne({ rideId })

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

    const getPassenger = await PassengerModel.findOne({ passengerId })
    const appSettings = await AppSettingsModel.findOne()

    const rideCreatedAt = new Date(getRide.createdAt);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    //check that the ride is not more than 5min old based on the createdAt of the getRide
    if(rideCreatedAt < fiveMinutesAgo){
      //deduct 5%
      //cancel ride
      //fund user 95%
      //alert driver
      //return response to passenger
      const deductPercent = Number(appSettings?.cancelationRidePercent) /100
      const serviceFee = getRide?.charge * deductPercent
      const finalAmount = getRide.charge - serviceFee

      getRide.status === 'Canceled'
      getRide.cancelReason = reason
      await getRide.save()

      getPassenger += finalAmount
      await getPassenger.save()

      const getDriverId = getRide?.driverId
      const getDriver = await DriverModel.findOne({ getDriverId })
      const getDriverLocation = await DriverLocationModel.findOne({ getDriverId })

      //update driver
      getDriver.status = 'online'
      getDriver.activeRide = ''
      await getDriver.save()
      getDriverLocation.status = 'online'
      getDriverLocation.isActive = true
      await getDriverLocation.save()
      
      getRideTransaction.status = 'Failed'
      await getRideTransaction.save()

      //new notification
      await NotificationModel.create({
        accountId: passengerId,
        message: `You cancel you ride. ${getRide?.rideId}`
      })

      //alreat driver
      const driverId = getRide.driverId
      const driverSocketId = driverConnections.get(driverId)
      if(driverSocketId){
        const messsage = 'Passenger has canceled the Ride with you'
        driverNamespace.to(driverSocketId).emit('passengerCancelRide', messsage)
      }
      
      const message = `Your Ride has been Canceled and ${appSettings?.cancelationRidePercent}% has been deducted as cacelation fee. Your wallet has been funded with the balance`
      if(res) sendResponse(res, 200, true, message)
      if(socket) socket.emit('cancelRide', { success: true, message })
      return

    } else {
      getRide.status === 'Canceled'
      getRide.cancelReason = reason
      await getRide.save()

      getPassenger.wallet += getRide.charge
      await getPassenger.save()

      //update driver
      getDriver.status = 'online'
      getDriver.activeRide = ''
      await getDriver.save()
      getDriverLocation.status = 'online'
      getDriverLocation.isActive = true
      await getDriverLocation.save()
      
      getRideTransaction.status = 'Failed'
      await getRideTransaction.save()

      //new notification
      await NotificationModel.create({
        accountId: passengerId,
        message: `You cancel you ride. ${getRide?.rideId}`
      })

      //alreat driver
      const driverId = getRide.driverId
      const driverSocketId = driverConnections.get(driverId)
      if(driverSocketId){
        const messsage = 'Passenger has canceled the Ride with you'
        driverNamespace.to(driverSocketId).emit('passengerCancelRide', messsage)
      }

      //PUSH NOTIFICATION
      try {
        sendNotificationToAccount({
          accountId: getRide.driverId,
          message:  'Passenger has canceled the Ride with you'
        })
      } catch (error) {
        console.log('PASSENGER CANCEL RIDE', error)
      }

      const message = 'Your Ride has been Canceled. Your wallet has been funded with the balance'
      if(res) sendResponse(res, 200, true, message)
      if(socket) socket.emit('cancelRide', { success: true, message })
      return
    }
  
    } catch (error) {
      console.log('CANCEL RIDE ERROR PASSENGER', error)
      const message = 'Unable to cancel ride'
      if(res) sendResponse(res, 404, false, message)
        if(socket) socket.emit('cancelRide', { success: false, message })
        return 
    }
}

//TRACK RIDE
export async function trackRide({ data, res, socket }) {
  const { rideId } = data
  if(!rideId){
    const message = 'Ride Id is required'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('trackRide', { success: false, message })
    return
  }
  try {
    const getRide = await RideModel.findOne({ rideId })
    if(!getRide){
      const message = 'Ride does not exist'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('trackRide', { success: false, message })
      return
    }
  const driverId = getRide?.driverId
  if(!driverId){
    const message = 'No driver associated with this ride yet'
    if(res) sendResponse(res, 404, false, message)
    if(socket) socket.emit('trackRide', { success: false, message })
    return
  }
  const getDriverLocation = DriverLocationModel.findOne({ driverId })
  if(!getDriverLocation){
    const message = 'No Location found'
    if(res) sendResponse(res, 404, false, message)
    if(socket) socket.emit('trackRide', { success: false, message })
    return
  }

  //send driver location
  socket.emit('trackRide', { success: true, getDriverLocation })
  return
  } catch (error) {
    console.log('UNABLE TO TRACK RIDE', error)
    const message = 'Unable to track ride'
    if(res) sendResponse(res, 500, false, message)
    if(socket) socket.emit('trackRide', { success: false, message })
  }
}

//SAFTEY
export async function saftey({ data, res, socket }) {
  const { rideId } = data
  try {
    
  } catch (error) {
    
  }
}

//CHAT WITH DRIVER
export async function chatWithDriver({ socket, data, res}) {
  const { rideId, message: passengerMessage, file } = data
  const { passengerId, firstName, lastName } = socket.user
  try {
    const getRide = await RideModel.findOne({ rideId })
    if(!getRide){
      console.log('NO RIDE')
      const message = 'Ride does not exist'
      if(res) sendResponse(res, 404, false, message)
        if(socket) socket('chatWithDriver', { success: false, message })
          return
      }
    if(passengerId !== getRide.passengerId){
      const message = 'Not Allowed'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket('chatWithDriver', { success: false, message })
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
        message: passengerMessage || '',
        from: 'Passenger',
        senderId: passengerId,
        mediaLink: imageUrl || ''
      }
      const newChat = await RideChatModel.create({
        rideId,
        chats: [chatData]
      })
    } else {
      const chatData = {
        message: passengerMessage,
        from: 'Passenger',
        senderId: passengerId,
        mediaLink: imageUrl || ''
      }
      getChats.chats.push(chatData)
      await getChats.save()
    }
    console.log('CHATS', getChats.chats )
    //alert driver
    const driverSocketId = driverConnections.get(getRide.driverId)
    if(driverSocketId){
      const message = getChats.chats
      driverNamespace.to(driverSocketId).emit('chatWithPassenger', { success: true, message })
    } else {
      console.log('DRIVER SOCKET FOR CHATS NOT FOUND> DRIVER NOT ONLINE')
    }

    //push notification
    try {
      sendNotificationToAccount({
        accountId: getRide.driverId,
        message: `You have a new message from ${firstName} ${lastName}`
      })
    } catch (error) {
      console.log('UNABLE TO NOTIFY DRIVER OF USER CHAT', error)
    }

    const message = getChats.chats
    if(res) sendResponse(res, 200, true, message)
    if(socket) socket.emit('chatWithDriver', { success: true, message })

  } catch (error) {
    console.log('CHAT WITH DRIVER ERROR', error)
    const message = 'Unable to send message to passenger'
    if(res) sendResponse(res, 500, false, message)
    if(socket) socket.emit('chatWithDriver', { success: false, message })
  }
}

