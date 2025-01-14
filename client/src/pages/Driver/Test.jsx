import useGeolocation from 'react-use-geolocation';

function LocationComponent() {
  const [position, error] = useGeolocation();

  if (error) {
    return <p>Error getting location: {error.message}</p>;
  }

  if (!position) {
    return <p>Fetching location...</p>;
  }

  const { latitude, longitude } = position.coords;
  return (
    <p>
      Latitude: {latitude}, Longitude: {longitude}
    </p>
  );
}

export default LocationComponent;
