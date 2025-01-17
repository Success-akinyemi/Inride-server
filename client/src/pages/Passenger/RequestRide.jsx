import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

// Create a function to load the Google Maps API dynamically
const loadGoogleMapsAPI = (apiKey) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
};

const socket = io('http://localhost:10000/passenger', {
  transports: ['websocket'],
  withCredentials: true,
});

const RequestRide = () => {
  const [rideDetails, setRideDetails] = useState({
    from: '',
    fromId: '',
    fromCoordinates: {
      type: 'Point',
      coordinates: [],
    },
    to: [],
    personnalRide: true,
    noOffPassengers: 1,
    pickupPoint: '',
  });
  const [responseMessage, setResponseMessage] = useState('');
  const [availbleDrivers, setAvailbleDrivers] = useState();
  const [ newRideId , setNewRideId] = useState()
  const [userLocation, setUserLocation] = useState({ type: 'Point', coordinates: [] });
  const [isMapsLoaded, setIsMapsLoaded] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY; // Replace with your actual API key
    loadGoogleMapsAPI(apiKey)
      .then(() => {
        console.log('Google Maps API loaded');
        setIsMapsLoaded(true); // Set state when the API is loaded
      })
      .catch((err) => {
        console.error('Error loading Google Maps API', err);
      });
  }, []);

  useEffect(() => {
    if (navigator.geolocation && isMapsLoaded) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ type: 'Point', coordinates: [longitude, latitude] });
        },
        (error) => console.error('Error getting location:', error)
      );
    } else if (!isMapsLoaded) {
      console.log('Waiting for Google Maps API to load...');
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }, [isMapsLoaded]);

  useEffect(() => {
    if (userLocation.coordinates.length > 0) {
      const data = { location: userLocation.coordinates, radius: 5 };
      socket.emit('getNearbyDrivers', data);
    }
  }, [userLocation]);

  useEffect(() => {
    socket.on('nearbyDrivers', (data) => {
      console.log('NEARBY DRIVER', data);
      setResponseMessage(data.success ? `Drivers found: ${data.drivers.length}` : 'No drivers found');
    });

    socket.emit('rideRequested', (data) => {
      console.log('RIDE REQUESTED SUCCESS', data)
      setResponseMessage(data.success ? 'Ride request successful!' : 'Error requesting ride');
    });

    socket.on('error', (data) => {
      setResponseMessage(data.message || 'Error fetching nearby drivers.');
    });

    return () => {
      socket.off('nearbyDrivers');
      socket.off('rideRequested');
      socket.off('error');
    };
  }, []);

  const handleFromSelect = async (description) => {
    try {
      const geocode = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(geocode[0]);
      setRideDetails((prev) => ({
        ...prev,
        from: description,
        fromId: geocode[0].place_id,
        fromCoordinates: { type: 'Point', coordinates: [lng, lat] },
      }));
    } catch (error) {
      console.error('Error fetching coordinates:', error);
    }
  };

  const handleToSelect = async (index, description) => {
    try {
      const geocode = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(geocode[0]);
      setRideDetails((prev) => {
        const newTo = [...prev.to];
        newTo[index] = {
          place: description,
          placeId: geocode[0].place_id,
          locationCoordinates: { type: 'Point', coordinates: [lng, lat] },
        };
        return { ...prev, to: newTo };
      });
    } catch (error) {
      console.error('Error fetching coordinates:', error);
    }
  };

  const addToPlace = () => setRideDetails((prev) => ({ ...prev, to: [...prev.to, {}] }));
  const removeToPlace = (index) => {
    setRideDetails((prev) => {
      const newTo = [...prev.to];
      newTo.splice(index, 1);
      return { ...prev, to: newTo };
    });
  };

  const handleSubmit = () => {
    const data = rideDetails;
    console.log('FINAL RIDE DATA', data)
    socket.emit('requestRide', data); // Emit ride request
  };

  socket.on('rideRequested', (response) => {
    console.log('Response from rideRequested:', response);
    setResponseMessage(`${response.message}. Distance is: ${response.totalDistanceKm} km`);
    setAvailbleDrivers(response?.drivers)
    setNewRideId(response.rideId)
  });

  //REQUEST RIDE FROM AVAILBLE DRIVERS
  const handleRequestDriver = (driverId, rideId) => {
    const data = { driverId, rideId }
    console.log(`Driver ${driverId} has been requested`, data)
    socket.emit('requestDriver', data)
  }

  socket.on('driverRequested', (response) => {
    console.log('Ride from driver reqeusted', response?.message)
  })

  useEffect(() => {
    console.log('RIDE DETAILS', rideDetails);
  }, [rideDetails]);

  return (
    <div>
      <h2>Request a Ride</h2>
      <form>
        <AutocompleteInput label="From" onSelect={handleFromSelect} isMapsLoaded={isMapsLoaded} />

        {rideDetails.to.map((_, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
            <AutocompleteInput label={`To ${index + 1}`} onSelect={(description) => handleToSelect(index, description)} isMapsLoaded={isMapsLoaded} />
            {index > 0 && <button type="button" onClick={() => removeToPlace(index)}>Remove</button>}
          </div>
        ))}
        <button type="button" onClick={addToPlace}>Add Destination</button>

        <div>
          <label>No. of Passengers</label>
          <input
            type="number"
            name="noOffPassengers"
            value={rideDetails.noOffPassengers}
            min="1"
            onChange={(e) => setRideDetails((prev) => ({ ...prev, noOffPassengers: e.target.value }))}
          />
        </div>

        <div>
          <label>Pickup Point</label>
          <input
            type="text"
            name="pickupPoint"
            value={rideDetails.pickupPoint}
            onChange={(e) => setRideDetails((prev) => ({ ...prev, pickupPoint: e.target.value }))}
          />
        </div>

        <button type="button" onClick={handleSubmit}>Submit Ride Request</button>
      </form>
      {responseMessage && <p>{responseMessage}</p>}

      {
        availbleDrivers && (
          <div className="">
            <h1>Availble Drivers (RIDE ID: {newRideId})</h1>
            <div>
              {
                availbleDrivers?.map((i) => (
                  <div onClick={ () => handleRequestDriver(i.driverId, newRideId)} key={i?.driverId} className="">
                    <p>Name: {i?.driverName}</p>
                    <p>Mobile {i?.mobileNumber}</p>
                    <p>Price: {i?.price}</p>
                    <p>Rating: {i?.ratings}</p>
                    <div>
                      Car Details: 
                      <p>Reg No: {i?.carDetails?.registrationNumber}</p>
                      <p>Model: {i?.carDetails?.model}</p>
                      <p>Color: {i?.carDetails?.color}</p>
                      <p>No of seats: {i?.carDetails?.noOfSeats}</p>
                    </div>
                    <hr />
                  </div>
                ))
              }
            </div>
          </div>
        )
      }
    </div>
  );
};

const AutocompleteInput = ({ label, onSelect, isMapsLoaded }) => {
  const { ready, value, suggestions: { status, data }, setValue, clearSuggestions } = usePlacesAutocomplete({
    debounce: 2000,
    componentRestrictions: { country: ['NG', 'US'] },
  });

  if (!isMapsLoaded) {
    return <div>Loading Google Maps...</div>;
  }

  return (
    <div>
      <label>{label}</label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!ready}
        placeholder={`Search ${label}`}
      />
      {status === 'OK' && (
        <ul>
          {data.map(({ place_id, description }) => (
            <li key={place_id} onClick={() => {
              onSelect(description);
              setValue(description, false);
              clearSuggestions();
            }}>
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RequestRide;
