import { useState } from "react";
import { useNavigate } from "react-router-dom";

function DriverVerifyOtp() {
    const navigate = useNavigate()
  const [formData, setFormData] = useState({
    otp: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleVerifyNewUserOtp = async (e) => {
    e.preventDefault();
  
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/auth/verifyOtp`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',  // Set content type for JSON
        },
        body: JSON.stringify({ otp: formData.otp }),  // Send data as JSON
      });
  
      const result = await response.json();
      if (response.ok) {
        alert(`Success: ${result?.data}`);
        navigate('/passenger/register');
      } else {
        alert(`Error: ${result?.data || 'Failed to verify'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while signing in.');
    }
  };
  

  const handleVerifyLoginOtp = async (e) => {
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
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/driver/auth/verifyLoginOtp`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',  // Set content type for JSON
        },
        body: JSON.stringify({
          otp: formData.otp,
          location: location,  // Attach location to the request
        }),
      });
  
      const result = await response.json();
      if (response.ok) {
        alert(`Success: ${result?.data}`);
        navigate('/driver/home');
      } else {
        alert(`Error: ${result?.data || 'Failed to sign in'}`);
      }
    } catch (error) {
      alert(error || 'An error occurred while retrieving location.');
    }
  };
  

  return (
    <form encType="multipart/form-data">
      <div>
        <label>Otp:</label>
        <input
          type="text"
          name="otp"
          value={formData.otp}
          onChange={handleInputChange}
        />
      </div>
      <button onClick={handleVerifyNewUserOtp} type="submit">Verify New User Otp</button>
      <button onClick={handleVerifyLoginOtp} type="submit">Verify Login Otp</button>
    </form>
  );
}

export default DriverVerifyOtp;
