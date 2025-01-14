import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:10000/driver', {
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
  return (
    <div>
      <h2>Driver Home</h2>
      <p>Current Location: {userLocation.coordinates.join(', ')}</p>
      <p>Server Response: {locationUpdateMessage}</p>

      <button onClick={goOnline}>Go Online</button>
      <button onClick={goOffline}>Go Online</button>

    </div>
  );
}

export default DriverHome;
