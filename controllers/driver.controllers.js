import { sendResponse } from "../middlewares/utils.js";
import DriverModel from "../model/Driver.js";
import DriverLocationModel from "../model/DriverLocation.js";
import RideModel from "../model/Rides.js";

// UPDATE DRIVER LOCATION
export async function updateLocation({ driverId, longitude, latitude, socket, res }) {
  try {
    await DriverLocationModel.updateOne(
      { driverId },
      {
        location: { type: 'Point', coordinates: [longitude, latitude] },
        isActive: true,
      },
      { upsert: true }
    );

    if (res) return sendResponse(res, 200, true, 'Location Updated');
    if (socket) socket.emit('locationUpdated', { success: true, message: 'Location Updated' });
  } catch (error) {
    console.log('UNABLE TO PROCESS DRIVER LOCATION', error);
    if (res) return sendResponse(res, 500, false, 'Unable to update location');
    if (socket) socket.emit('error', { success: false, message: 'Unable to update location' });
  }
}

// GO ONLINE
export async function goOnline({ driverId, socket, res }) {
  try {
    await DriverLocationModel.updateOne({ driverId }, { isActive: true, status: 'online' });
    const driver = await DriverModel.updateOne({ driverId }, { status: 'online' });

    const message = `Driver ${driver?.firstName} ${driver?.lastName} is online`;
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('statusUpdated', { success: true, message });
  } catch (error) {
    console.log('UNABLE TO MAKE DRIVER STATUS ONLINE', error);
    const message = 'Error updating online status';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('error', { success: false, message });
  }
}

// GO OFFLINE
export async function goOffline({ driverId, socket, res }) {
  try {
    await DriverLocationModel.updateOne({ driverId }, { isActive: false, status: 'offline' });
    const driver = await DriverModel.updateOne({ driverId }, { status: 'offline' });

    const message = `Driver ${driver?.firstName} ${driver?.lastName} is offline`;
    if (res) return sendResponse(res, 200, true, message);
    if (socket) socket.emit('statusUpdated', { success: true, message });
  } catch (error) {
    console.log('UNABLE TO MAKE DRIVER STATUS OFFLINE', error);
    const message = 'Error updating offline status';
    if (res) return sendResponse(res, 500, false, message);
    if (socket) socket.emit('error', { success: false, message });
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
    if (socket) socket.emit('error', { success: false, message });
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
    if (socket) socket.emit('error', { success: false, message });
  }
}

// GET NEARBY DRIVERS
export async function getNearByDrivers({ longitude, latitude, radius, socket }) {
  const radiusInKm = radius || 5;
  try {
    const drivers = await DriverLocationModel.find({
      isActive: true,
      status: 'online',
      location: {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInKm / 6378.1],
        },
      },
    });

    if (socket) socket.emit('nearbyDrivers', { success: true, drivers });
    return drivers;
  } catch (error) {
    console.log('ERROR FETCHING NEARBY DRIVERS', error);
    if (socket) socket.emit('error', { success: false, message: 'Error fetching nearby drivers' });
  }
}
