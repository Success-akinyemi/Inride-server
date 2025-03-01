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

const socket = io(`${import.meta.env.VITE_SOCKET_BASE_URL}/passenger`, {
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
    rideType: 'personal'
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
      alert(data)
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
    setResponseMessage(`${response.message}. Distance is: ${response.totalDistanceKm} miles`);
    setAvailbleDrivers(response?.drivers)
    setNewRideId(response.rideId)
  });

  useEffect(() => {
    console.log('RIDE DETAILS', rideDetails);
  }, [rideDetails]);

  const [ availableDriversForRide, setAvailableDriversForRide ] = useState()
  //GETTING AVAILBLE DRIVERS
  socket.on('availableDriversForRide', (data) => {
    console.log('AVAILABLE DRIVERS FOR RIDE', data)
    setAvailableDriversForRide(data?.finalResult)
  })

    //REQUEST RIDE FROM AVAILBLE DRIVERS AND MAKE PAYMENT
    const handleRequestDriver = (rideId, driverId) => {
      const data = { driverId, rideId }
      console.log(`Driver ${driverId} has been requested`, data)
      socket.emit('requestDriver', data)
    }
    
    const [ driverRequested, setDriverRequested ] = useState()
    socket.on('requestDriver', (response) => {
      setAvailableDriversForRide()
      setDriverRequested(response)
      console.log('Ride from driver reqeusted', response)
    })

    //HANDLE RIDE PAYMENT
    const handleRidePayment = (rideId, type) => {
      const cardDetails = {
        cardHolderName: 'Ade one', 
        cardNumber: '4242424242424242', 
        cvv: '456', 
        expiryDate: '12/25',
      }
      let data
      if(type === 'card'){
        data = { rideId, paymentType: 'card', cardId: '67952582bf03f1fa37e65fbd' }
      }
      if(type === 'direct'){
        data = { rideId, paymentType: 'direct', cardDetails }
      }
      if(type === 'wallet'){
        data = { rideId, paymentType: 'wallet' }
      }
      socket.emit('payForRide', data)
    }
    socket.on('payForRide', (response) => {

      console.log('PAYMENT OF RIDE RESPONSE', response)
    })

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
  availableDriversForRide?.length && (
    <div className="">
      <h1>Available Drivers</h1>

      <div className="">
        {
          availableDriversForRide?.map((item, idx) => (
            <div key={idx} onClick={() => handleRequestDriver(item?.rideId, item?.driver?.driverId)} className="">
              <div className="">
                {/* Display driver name */}
                <p>{`${item?.driver?.firstName} ${item?.driver?.lastName}`}</p>
              </div>
              <div className="">
                {/* Display car details */}
                <p>{`${item?.car?.model} | ${item?.car?.color} | ${item?.car?.registrationNumber} | ${item?.car?.noOfSeats}`}</p>
              </div>
              <p>Price: <b>{item?.price}</b></p>
              <p>Est Time: <b>{((item?.estimatedTimeToPickup)/60).toFixed(2)}mins to pickup</b></p>
              <hr />
            </div>
          ))
        }
      </div>
    </div>
  )
}

  {
    driverRequested?.success && (
      <div className="">
        <button onClick={() => handleRidePayment(driverRequested?.rideId, 'card')} >Pay For Ride Now (card)</button>
        <button onClick={() => handleRidePayment(driverRequested?.rideId, 'direct')} >Pay For Ride Now (direct)</button>
        <button onClick={() => handleRidePayment(driverRequested?.rideId, 'wallet')} >Pay For Ride Now (wallet)</button>
      </div>
    )
  }

    </div>
  );
};

const AutocompleteInput = ({ label, onSelect, isMapsLoaded }) => {
  const { ready, value, suggestions: { status, data }, setValue, clearSuggestions } = usePlacesAutocomplete({
    debounce: 2000,
    componentRestrictions: { country: ['US'] },
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
