import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:10000/passenger', {
  transports: ['websocket'],
  withCredentials: true,
});

const RequestRide = () => {
  const [rideDetails, setRideDetails] = useState({
    pickupLocation: '',
    to: '',
    passengerId: '',
  });
  const [responseMessage, setResponseMessage] = useState('');
  const [userLocation, setUserLocation] = useState({ type: 'Point', coordinates: [] });

  useEffect(() => {
    // Fetch user location when the component loads
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationData = {
            type: 'Point',
            coordinates: [longitude, latitude], // longitude first for GeoJSON format
          };
          setUserLocation(locationData);
          console.log('User Location:', locationData);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }, []);

  useEffect(() => {
    // Emit a request for nearby drivers when coordinates are available
    if (userLocation.coordinates.length > 0) {
      const data = {
        location: userLocation.coordinates,
        radius: 5, // Desired radius (e.g., 5 km)
      };
      console.log('Requesting nearby drivers with data:', data);
      socket.emit('getNearbyDrivers', data);
    }
  }, [userLocation]);

  useEffect(() => {
    // Listen for server responses
    socket.on('nearbyDrivers', (data) => {
      setResponseMessage(data.success ? `Drivers found: ${data.drivers.length}` : 'No drivers found');
      console.log('Nearby Drivers:', data);
    });

    socket.on('error', (data) => {
      setResponseMessage(data.message || 'Error fetching nearby drivers.');
      console.error('Error:', data);
    });

    return () => {
      socket.off('nearbyDrivers');
      socket.off('error');
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRideDetails((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <h2>Request a Ride</h2>
      <form>
        <label>
          Pickup Location:
          <input
            type="text"
            name="pickupLocation"
            value={rideDetails.pickupLocation}
            onChange={handleInputChange}
          />
        </label>
        <br />
        <label>
          Destination:
          <input
            type="text"
            name="to"
            value={rideDetails.to}
            onChange={handleInputChange}
          />
        </label>
        <br />
        <label>
          Passenger ID:
          <input
            type="text"
            name="passengerId"
            value={rideDetails.passengerId}
            onChange={handleInputChange}
          />
        </label>
        <br />
      </form>
      {responseMessage && <p>{responseMessage}</p>}
    </div>
  );
};

export default RequestRide;
