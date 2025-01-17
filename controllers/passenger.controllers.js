import { generateUniqueCode } from "../middlewares/utils.js";
import CarDetailModel from "../model/CarDetails.js";
import DriverModel from "../model/Driver.js";
import DriverLocationModel from "../model/DriverLocation.js";
import RideModel from "../model/Rides.js";
import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

async function calculateTotalDistance({ fromId, to }) {
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

      const distance = response.data.rows[0].elements[0].distance.value; // Distance in meters
      totalDistance += distance;
    }
    return totalDistance / 1000; // Convert to kilometers
  } catch (error) {
    console.error('Error calculating distance:', error);
    throw new Error('Failed to calculate distance');
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
  const { from, fromId, fromCoordinates, to, personnalRide, noOffPassengers, pickupPoint } = data;

  if (!from) {
    const message = 'Ride starting point is required';
    if (res) return sendResponse(res, 200, false, message);
    if (socket) socket.emit('rideRequested', { success: false, message });
    return;
  }
  if (!to || to.length < 1) {
    const message = 'At least one destination is required';
    if (res) return sendResponse(res, 200, false, message);
    if (socket) socket.emit('rideRequested', { success: false, message });
    return;
  }
  if (!fromCoordinates || !fromCoordinates.coordinates || fromCoordinates?.coordinates?.length !== 2) {
    const message = 'Coordinates of starting point are required';
    if (res) return sendResponse(res, 200, false, message);
    if (socket) socket.emit('rideRequested', { success: false, message });
    return;
  }

  try {
    const passenger = socket.user;

    const getRideId = await generateUniqueCode(8);
    const rideId = `RF${getRideId}RI`;

    const totalDistanceKm = await calculateTotalDistance({ fromId, to });

    console.log('Total Ride Distance:', totalDistanceKm, 'km');

    const newRideRequest = await RideModel.create({
      passengerId: passenger.passengerId,
      rideId,
      noOffPassengers,
      personnalRide,
      from,
      fromId,
      fromCoordinates: { type: 'Point', coordinates: fromCoordinates.coordinates },
      to,
      pickupPoint,
      kmDistance: totalDistanceKm,
    });

    // Get top 10 nearest drivers
    const nearbyDrivers = await DriverLocationModel.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: fromCoordinates.coordinates,
          },
          //$maxDistance: 10000, // 10 km range; adjust as needed
          $maxDistance: 10000000, // 1000 km range; adjust as needed
        },
      },
      status: 'online',
    })
      .limit(10)
      .exec();

    // Get driver details
    const driverIds = nearbyDrivers.map(driver => driver.driverId);
    const driverDetails = await DriverModel.find({ driverId: { $in: driverIds } }).exec();
    const carDetails = await CarDetailModel.find({ driverId: { $in: driverIds } }).exec();

    // Match driver details with car details and calculate the price
    const driverArray = driverDetails.map(driver => {
      const driverCarDetails = carDetails.filter(carDetail => carDetail.driverId === driver.driverId);
      
      // If there's only one car, use it, otherwise find the active car
      const driverCar = driverCarDetails.length === 1
        ? driverCarDetails[0].cars[0] // Take the only car available if there's only one
        : driverCarDetails?.find(carDetail => carDetail.cars.some(car => car.active === true))?.cars.find(car => car.active === true) || driverCarDetails[0]?.cars[0]; // Find the active car if available, or the first car
    
      const price = driver.pricePerKm * totalDistanceKm;
    
      // Calculate average ratings
      const ratings = driver.ratings.reduce((acc, rating) => acc + rating.number, 0) / driver.ratings.length || 0;
    
      return {
        driverName: `${driver.firstName} ${driver.lastName}`,
        driverId: driver.driverId,
        carDetails: driverCar, // Only one car (either active or the only one)
        price,
        mobileNumber: driver.mobileNumber,
        profileImg: driver.profileImg,
        totalRides: driver.totalRides,
        ratings: ratings.toFixed(1), // Ensure it’s rounded to one decimal place
      };
    });
    

    const message = 'Ride request successful';
    const responsePayload = { rideId, totalDistanceKm, drivers: driverArray };
    if (res) return sendResponse(res, 200, true, message, responsePayload);
    if (socket) socket.emit('rideRequested', { success: true, message, ...responsePayload });
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
  try {
    //find ride
    //ensure passenger id matches passenger id on ride
    //make request to driver
    console.log('object', driverId, rideId)
    
    const message = 'Request sent to driver waiting for driver response';
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('driverRequested', { success: true, message });
  } catch (error) {
    console.log('ERROR REQUESTING DRIVEr', error);
    const message = 'Error requesting driver';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('driverRequested', { success: false, message });
  }
}
