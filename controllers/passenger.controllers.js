import { generateUniqueCode } from "../middlewares/utils.js";
import DriverLocationModel from "../model/DriverLocation.js";
import RideModel from "../model/Rides.js";

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

// REQUEST RIDE
export async function requestRide({ socket, pickupPoint, fromLongitude, fromLatitude, from, to, res }) {
    if(!from){
        const message = 'Ride Strating point is required'
        if (res) return sendResponse(res, 200, false, message);
        if (socket) socket.emit('rideRequested', { success: false, message });
        return
    }
    if(!to || to.length < 1){
        const message = 'At least on destination is required'
        if (res) return sendResponse(res, 200, false, message);
        if (socket) socket.emit('rideRequested', { success: false, message });
        return
    }
    if(!fromLongitude || !fromLatitude){
        const message = 'coordina'
        if (res) return sendResponse(res, 200, false, message);
        if (socket) socket.emit('rideRequested', { success: false, message });
        return
    }
    
    try {
        //process request ride
        const passenger = socket.user

        //Generate ride Id
        const getRideId = await generateUniqueCode(8)
        const rideId = `RF${getRideId}RI`

        const newRide = await RideModel.create({
            userId: passenger?.passengerId,
            rideId: rideId,
            from: from,
            fromCoordinates: { type: 'Point', coordinates: [fromLongitude, fromLatitude] },
            to: to,
            pickupPoint,
        })
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