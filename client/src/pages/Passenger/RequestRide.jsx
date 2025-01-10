import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:10000/passenger', {
    transports: ['websocket'],
    withCredentials: true,  // Match server CORS credentials
  });
const RequestRide = () => {
  const [rideDetails, setRideDetails] = useState({
    from: '',
    to: [],
    fromLatitude: '',
    fromLongitude: '',
    pickupPoint: '', 
  });
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    // Listen for requestRide event from the server
    socket.on('requestRide', (data) => {
      setResponseMessage(data.message);
      console.log('Ride Requested Response:', data);
    });

    // Listen for error event from the server
    socket.on('error', (data) => {
      setResponseMessage(data.message);
      console.error('Error:', data);
    });

    return () => {
      socket.off('requestRide');
      socket.off('error');
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRideDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequestRide = () => {
    if (!rideDetails.pickupLocation || !rideDetails.destination) {
      setResponseMessage('Please provide all required details.');
      return;
    }
    socket.emit('requestRide', rideDetails);
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
            name="destination"
            value={rideDetails.destination}
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
        <button type="button" onClick={handleRequestRide}>
          Request Ride
        </button>
      </form>
      {responseMessage && <p>{responseMessage}</p>}
    </div>
  );
};

export default RequestRide;
