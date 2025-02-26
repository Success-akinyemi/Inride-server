import { useState } from "react";
import { useNavigate } from "react-router-dom";

function DriverNewUser() {
    const navigate = useNavigate()
  const [formData, setFormData] = useState({
    mobileNumber: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNewDriver = async (e) => {
    e.preventDefault();
  
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/driver/auth/registerNewDriver`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',  // Set content type for JSON
        },
        body: JSON.stringify({ mobileNumber: formData.mobileNumber }),  // Send data as JSON
      });
  
      const result = await response.json();
      if (response.ok) {
        alert(`Success: ${result?.data}`);
        navigate('/driver/verifyOtp');
      } else {
        alert(`Error: ${result?.data || 'Failed to Register new driver'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while signing in.');
    }
  };
  

  const handleDriverToPassenger = async (e) => {
    e.preventDefault();
  
    const getUserLocation = () => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject('Geolocation is not supported by your browser.');
        } else {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              const location = {
                type: 'Point',
                coordinates: [longitude, latitude]  // GeoJSON format: [longitude, latitude]
              };
              resolve(location);
            },
            (error) => {
              reject('Location access is required for this action.');
            }
          );
        }
      });
    };
  
    try {
      const location = await getUserLocation();
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/driver/auth/registerWithPassengerAccount`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',  // Set content type for JSON
        },
        body: JSON.stringify({
          mobileNumber: formData.mobileNumber,
          location: location,  // Attach location to the request
        }),
      });
  
      const result = await response.json();
      if (response.ok) {
        alert(`Success: ${result?.data}`);
        navigate('/driver/verifyOtp');
      } else {
        alert(`Error: ${result?.data || 'Failed to sign in with passenger account'}`);
      }
    } catch (error) {
      alert(error || 'An error occurred while retrieving location.');
    }
  };
  

  return (
    <form encType="multipart/form-data">
      <div>
        <label>Mobile Number:</label>
        <input
          type="text"
          name="mobileNumber"
          value={formData.mobileNumber}
          onChange={handleInputChange}
        />
      </div>
      <button onClick={handleNewDriver} type="submit">New Driver</button>
      <button onClick={handleDriverToPassenger} type="submit">Passenger to Driver</button>
    </form>
  );
}

export default DriverNewUser;
