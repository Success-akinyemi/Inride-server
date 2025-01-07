import DriverLocationModel from "../model/DriverLocation.js";

// GET NEARBY DRIVERS
export async function getNearByDrivers({ longitude, latitude, socket }) {
    const radiusInKm = 5;
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

// REQUEST RIDE
export async function requestRide({ socket, res }) {
    try {
        //process request ride
        
      const message = 'ride request successfull'
      if (res) return sendResponse(res, 200, true, message);
      if (socket) socket.emit('rideRequested', { success: true, message });
    } catch (error) {
      console.log('UNABLE TO REQUEST RIDE', error);
      const message = 'Unable to request ride';
      if (res) return sendResponse(res, 500, false, message );
      if (socket) socket.emit('error', { success: false, message });
    }
}