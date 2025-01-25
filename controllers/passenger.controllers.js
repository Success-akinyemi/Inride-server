import { calculateAverageRating, generateUniqueCode, sendResponse } from "../middlewares/utils.js";
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
  const { from, fromId, fromCoordinates, to, personnalRide, noOffPassengers, pickupPoint, rideType } = data;

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
  if(rideType){
      if(!['personal', 'group', 'split', 'delivery', 'reservation'].includes(rideType)){
        const message = 'Ride Type is invalid'
        if(res) sendResponse(res, 400, false, message)
        if (socket) socket.emit('rideRequested', { success: false, message })
        return
      }
  }

  try {
    const passenger = socket.user;

    const getRideId = await generateUniqueCode(8);
    const rideId = `RF${getRideId}RI`;

    const totalDistanceKm = await calculateTotalDistance({ fromId, to });

    console.log('Total Ride Distance:', totalDistanceKm, 'miles');
    const passengersArray = [passenger.passengerId]
    const newRideRequest = await RideModel.create({
      passengerId: passenger.passengerId,
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
    });

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
      const price = (getAppAmount?.pricePerKm * newRideRequest?.kmDistance).toFixed(2)
      const driverRideRequest = {
        from: newRideRequest?.from,
        kmDistance: newRideRequest?.kmDistance,
        passengerName: `${passenger?.firstName} ${passenger?.lastName}`,
        to: newRideRequest?.to.map(destination => ({
          place: destination.place
        })),
        pickupPoint: newRideRequest?.pickupPoint,
        priceRange: `${price - 1} - ${price + 2}`,
        rideId: newRideRequest?.rideId
      }
      //update ride status
      newRideRequest.status = 'Pending'
      await newRideRequest.save()
      //get driver within range and broadcast to them the ride request
      driverIds.forEach(driver => {
        console.log('DRIVER ID:', driver);
        const driverSocketId = driverConnections.get(driver); // Fetch socket ID
        console.log('object driver connections:', driverConnections);
        console.log('object driver id:', driverSocketId);

        if (driverSocketId) {

          // Emit to driver if socket ID is found
          driverNamespace.to(driverSocketId).emit('newRideRequest', { 
            success: true, 
            ride: driverRideRequest, 
           // driverId: driverSocketId 
          });
        } else {
          // Log if connection is not found, and skip to the next
          console.log(`No active connection for driver ID: ${driver}`);
        }
      });

    
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
          }

          // Get top 3 lowest prices
          const topPrices = driverPrices.prices
          .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
          .slice(0, 3);

          //Arange Result
          const results = await Promise.all(
            topPrices.map(async (priceEntry) => {
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

          const finalResult = results.filter(result => result !== null); // Filter out null results
          const message = 'Drivers Available'
          if(res) return sendResponse(res, 200, true, finalResult, message)
          if(socket) return passengerNamespace.to(passengerSocketId).emit('availableDriversForRide', { success: true, message, finalResult})
        
        } else {
          const message = 'Could not get drivers for your ride request. Please try again';
          if (res) return sendResponse(res, 400, false, message);
          if (socket) passengerNamespace.to(passengerSocketId).emit('rideRequested', { success: false, message });
        }
      } catch (error) {
        console.error(`Failed to process ride after 90 seconds for rideId: ${rideId}`, error);
      }
    }, 90000); // 90 seconds

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
export async function payForRdie({ socket, data, res }) {
  const { rideId, paymentType, cardDetails } = data
  if(!rideId){
    const message = 'Ride Id is required'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForRdie', { success: false, message})
    return
  }
  if(!paymentType){
    const message = 'Payment type is required'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForRdie', { success: false, message})
    return
  }
  if(!(['card', 'wallet', 'direct']).includes(payForRdie)){
    const message = 'Invalid payment type. ["card", "wallet", "direct"]'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForRdie', { success: false, message})
  
  }
  if(paymentType === 'direct' && !cardDetails){
    const message = 'Card details is required for payment type'
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForRdie', { success: false, message})
  }
  const { nameofCard, cardNumber, cvv, expiryDate} = cardDetails 
  if(!nameofCard || !cardNumber || !cvv || !expiryDate){
    const message = `Provide all deatils of the card. ${!nameofCard && 'Name of Card'} ${!cardNumber && 'card number'} ${!cvv && 'cvv'} ${!expiryDate && 'Expiry Date'} is/are required`
    if(res) sendResponse(res, 400, false, message)
    if(socket) socket.emit('payForRdie', { success: false, message})
    return
  }
}

//MAKE PAYMENT FOR EDIT RIDE WITH UPDATED PRICE

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
    
    //notify them
    foundFriends.forEach(mobileNumber => {
      console.log('DRIVER ID:', mobileNumber);
      const getPassenger = PassengerModel.findOne({ mobileNumber })
      const passengerSocketId = passengerConnections.get(getPassenger?.passengerId); // Fetch socket ID
      console.log('object passenger connections:', driverConnections);
      console.log('object passenger id:', passengerSocketId);

      if (passengerSocketId) {

        // Emit to passenger if socket ID is found
        passengerNamespace.to(passengerSocketId).emit('newRideShared', { 
          success: true, 
          message: `${firstName} ${lastName} has shared a ride with you.`,
          ride: {
            from: getRide?.from,
            to: getRide?.to.map(destination => ({
              place: destination.place
            })),
          }, 
        });
      } else {
        // Log if connection is not found, and skip to the next
        console.log(`No active connection for passenger mobile number: ${mobileNumber}`);
      }
    });

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
    const getRide = RideModel.findOne({ rideId })
    if(!getRide){
      const message = 'No ride with this Id found'
      if(res) sendResponse(res, 404, false, message)
      if(socket) socket.emit('editRide', { success: false, message })
      return
    }
    if(passengerId !== getRide?.passengerId ){
      const message = 'You can only edit you ride'
      if(res) sendResponse(res, 404, false, message)
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
      let newDestinations = getRide?.to
      newDestinations.push(to)
      
      const fromId = getRide?.fromId
      const totalDistanceMiles = await calculateTotalDistance({ fromId, newDestinations });
      
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
