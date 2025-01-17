import { sendResponse } from "../middlewares/utils.js";
import CarDetailModel from "../model/CarDetails.js";
import DriverModel from "../model/Driver.js";
import DriverLocationModel from "../model/DriverLocation.js";
import RideModel from "../model/Rides.js";

// UPDATE DRIVER LOCATION
export async function updateLocation({ data, socket, res }) {
  const { driverId } = socket.user;

  try {
    const updateLoc = await DriverLocationModel.updateOne(
      { driverId },
      {
        location: data,
        isActive: true,
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
  const { driverId } = socket.user;

  try {
    const driverLoc = await DriverLocationModel.findOne({ driverId })
    if(driverLoc){
      driverLoc.isActive = true
      driverLoc.status = 'online'
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

// ACCEPT RIDE
export async function rideAccepted({ driverId, rideId, socket, res }) {
  try {
    await DriverLocationModel.updateOne({ driverId }, { status: 'busy' });
    await DriverModel.updateOne({ driverId }, { status: 'busy' });
    await RideModel.updateOne({ rideId }, { status: 'Active' });

    const message = 'Ride accepted, driver is now busy';
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('rideStatusUpdated', { success: true, message });
  } catch (error) {
    console.log('ERROR ACCEPTING RIDE', error);
    const message = 'Error accepting ride';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('error', { success: false, message });
  }
}

// CANCEL RIDE
export async function rideCancel({ driverId, rideId, socket, res }) {
  try {
    await DriverLocationModel.updateOne({ driverId }, { status: 'online' });
    await DriverModel.updateOne({ driverId }, { status: 'online' });
    await RideModel.updateOne({ rideId }, { status: 'Canceled' });

    const message = 'Ride canceled, driver is now active';
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('rideStatusUpdated', { success: true, message });
  } catch (error) {
    console.log('ERROR CANCELING RIDE', error);
    const message = 'Error canceling ride';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('rideStatusUpdated', { success: false, message });
  }
}

// COMPLETE RIDE
export async function rideComplete({ driverId, rideId, socket, res }) {
  try {
    await DriverLocationModel.updateOne({ driverId }, { status: 'online' });
    await DriverModel.updateOne({ driverId }, { status: 'online' });
    await RideModel.updateOne({ rideId }, { status: 'Complete' });

    const message = 'Ride completed, driver is now active for another ride';
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('rideStatusUpdated', { success: true, message });
  } catch (error) {
    console.log('ERROR COMPLETING RIDE', error);
    const message = 'Error completing ride';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('rideStatusUpdated', { success: false, message });
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

//ACTIVATE CARS
export async function activateCar(req, res) {
  const { _id } = req.body;  // Car's unique ID (or registration number, etc.)
  const { driverId } = req.user;  // Driver's ID from user info

  try {
    // Find the driver's car details
    const findCars = await CarDetailModel.findOne({ driverId });

    // Check if the driver has any cars
    if (!findCars) {
      return sendResponse(res, 404, false, 'Cars not found for this driver');
    }

    // Find the car that needs to be activated
    const carToActivate = findCars.cars.find(car => car._id.toString() === _id);

    // Check if the car exists
    if (!carToActivate) {
      return sendResponse(res, 404, false, 'Car not found');
    }

    // Deactivate any currently active car
    findCars.cars.forEach(car => {
      if (car.active) {
        car.active = false;  // Deactivate the currently active car
      }
    });

    // Activate the selected car
    carToActivate.active = true;

    // Save the updated car details
    await findCars.save();

    return sendResponse(res, 200, true, 'Car activated successfully');
  } catch (error) {
    console.log('UNABLE TO MAKE CAR ACTIVE', error);
    return sendResponse(res, 500, false, 'Unable to make car active');
  }
}
