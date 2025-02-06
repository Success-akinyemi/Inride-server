import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const socket = io(`${import.meta.env.VITE_APP_BASE_URL}/driver`, {
  transports: ['websocket'],
  withCredentials: true,
});

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err.message);
});

function DriverHome() {
  const [userLocation, setUserLocation] = useState({ type: 'Point', coordinates: [] });
  const [locationUpdateMessage, setLocationUpdateMessage] = useState('');
  const lastUpdateTime = useRef(Date.now());

  const [ newRideRequest, setNewRideRequest ] = useState({})

  useEffect(() => {
    let watchId;

    const startTrackingLocation = () => {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const locationData = {
              type: 'Point',
              coordinates: [longitude, latitude], // longitude first for GeoJSON
            };

            // Always update location state and log for real-time feedback
            setUserLocation(locationData);
            console.log('Real-time location:', longitude, latitude);

            // Throttle server update
            const currentTime = Date.now();
            if (currentTime - lastUpdateTime.current >= 5000) {
              lastUpdateTime.current = currentTime;
              socket.emit('updateLocation', locationData); // Emit to server
              console.log('Location sent to server:', locationData);
            }
          },
          (error) => {
            console.error('Error getting location:', error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000,
          }
        );
      } else {
        console.error('Geolocation is not supported by this browser.');
      }
    };

    startTrackingLocation();

    socket.on('locationUpdated', (data) => {
      setLocationUpdateMessage(data.message);
      console.log('Server response:', data);
    });

    socket.on('error', (error) => {
      console.error('Location update error:', error.message);
    });

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      socket.off('locationUpdated');
      socket.off('error');
    };
  }, []);

  const goOnline = () => {
    socket.emit('goOnline',(data) => {
      console.log(data.message);
      alert(data.message);
    });
  }

  const goOffline = () => {
    socket.emit('goOffline',(data) => {
      console.log(data.message);
      alert(data.message);
    });
  }
  
  useEffect(() => {
    socket.on('statusUpdated', (data) => {
      console.log('Status Updated:', data.message);
      alert(data.message);
    });

        // Listen for the 'error' event
        socket.on('error', (data) => {
          console.error('Error:', data.message);
          alert(data.message);
        });
    
        // Cleanup on component unmount
        return () => {
          socket.off('statusUpdated');
          socket.off('error');
        };
  }, [])

  //NEW RIDE REQUEST
  // Driver socket connection setup
socket.on('newRideRequest', (data) => {
  if (data.success) {
    // Display ride request popup or handle ride details
    console.log('New ride request:', data.ride);
    setNewRideRequest(data?.ride)
  } else {
    console.log('Failed to receive ride request');
  }
});

const [ priceRange, setPriceRange ] = useState()
const acceptRide = (rideId) => {
  if(!priceRange){
    alert('Enter price range')
    return
  }
  const data = { rideId, price: priceRange }
  socket.emit('acceptRideRequest',data);
}

socket.on('acceptRideRquest', (data) => {
  console.log('acceptRideRquest response', data)
  if(data?.success){
    alert(`Accepted ride Response', ${data?.message}`)
    return
  } else {
    console.log('data?.message', data?.message)
    alert(`Accepted ride error:',${data?.message}`)
  }
})

const rejectRide = (rideId) => {
  const data = { rideId }
  socket.emit('cancelRideRequest',data);
}

socket.on('cancelRideRequest', (data) => {
  console.log('cancelRideRequest response', data)
  if(data?.success){
    alert(`Cancel ride Response, ${data?.message}`)
  } else {
    console.log('data?.message', data?.message)
    alert(`Cancel ride error:,${data?.message}`)
  }
})

//DRIVER REQUESTED FLOR RIDE
const [ driverRequested, setDriverRequested ] = useState()
socket.on('driverRequested', (data) => {
  if (data.success) {
    // Display ride request popup or handle ride details
    console.log('Driver requested for ride:', data);
    setNewRideRequest()
    setDriverRequested(data)
  } else {
    console.log('Failed to receive driver ride request');
  }
});

  return (
    <div>
      <h2>Driver Home</h2>
      <p>Current Location: {userLocation.coordinates.join(', ')}</p>
      <p>Server Response: {locationUpdateMessage}</p>

      <button onClick={goOnline}>Go Online</button>
      <button onClick={goOffline}>Go Offline</button>

      {
        newRideRequest?.from && (
          <div className="">
            <h1>New ride request</h1>
            <p>
              You have a new ride request from {newRideRequest?.passengerName}
              from <b>{newRideRequest?.from}</b> to <b>{newRideRequest?.to?.map((i, idx) => ( <span key={idx}>{i.place},</span> ))}</b>
              Pick up Point is {newRideRequest?.pickupPoint}
              <br />
              Price range is <b>{newRideRequest?.priceRange}</b>
              <br />
              Approximate Distance is <b>{newRideRequest?.kmDistance}</b> milies
            </p>

            <div className="">
              <input onChange={(e) => setPriceRange(e.target.value)} type="text" placeholder='Enter price range' />
              <button onClick={() => acceptRide(newRideRequest?.rideId)}>Accepts Ride</button>
              <button onClick={() => rejectRide(newRideRequest?.rideId)} >Reject Ride</button>
            </div>
          </div>
        )
      }

      {
        driverRequested?.success && (
          <div className="">
            <h1>You have been requested for a ride</h1>
            <div className="">
              <p>{driverRequested?.message}</p>
              <div className="">
                <h2>Details</h2>
                <p>Ride Id: {driverRequested?.data?.rideId}</p>
                <p>Passenger Details: {driverRequested?.data?.passengerName} | {driverRequested?.data?.mobileNumber}</p>
                <p>From: {driverRequested?.data?.from}</p>
                <p>to: {newRideRequest?.to?.map((i, idx) => ( <span key={idx}>{i.place},</span> ))},</p>
                <p>Distance: {driverRequested?.data?.distance} miles</p>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}

export default DriverHome;
