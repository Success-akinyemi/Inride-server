import { useState } from "react";
import { useNavigate } from "react-router-dom";

function DriverLogin() {
    const navigate = useNavigate()
  const [formData, setFormData] = useState({
    mobileNumber: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/driver/auth/signin`, {
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
        alert(`Error: ${result?.data || 'Failed to sign in'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while signing in.');
    }
  };
  

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      <div>
        <label>Mobile Number:</label>
        <input
          type="text"
          name="mobileNumber"
          value={formData.mobileNumber}
          onChange={handleInputChange}
        />
      </div>
      <button type="submit">Register</button>
    </form>
  );
}

export default DriverLogin;
