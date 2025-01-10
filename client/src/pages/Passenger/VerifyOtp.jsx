import { useState } from "react";
import { useNavigate } from "react-router-dom";

function VerifyOtp() {
    const navigate = useNavigate()
  const [formData, setFormData] = useState({
    otp: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/passenger/auth/verifyLoginOtp`, {
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
        alert(`Error: ${result?.message || 'Failed to sign in'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while signing in.');
    }
  };
  

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      <div>
        <label>Otp:</label>
        <input
          type="text"
          name="otp"
          value={formData.otp}
          onChange={handleInputChange}
        />
      </div>
      <button type="submit">Verify Otp</button>
    </form>
  );
}

export default VerifyOtp;
