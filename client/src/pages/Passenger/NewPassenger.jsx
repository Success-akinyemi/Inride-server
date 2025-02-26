import { useState } from "react";
import { useNavigate } from "react-router-dom";

function NewPassenger() {
    const navigate = useNavigate()
  const [formData, setFormData] = useState({
    mobileNumber: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleVerifyNewUserOtp = async (e) => {
    e.preventDefault();
  
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/passenger/auth/registerNumber`, {
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
        navigate('/passenger/verifyOtp');
      } else {
        alert(`Error: ${result?.data || 'Failed to register user'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while signing in.');
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
      <button onClick={handleVerifyNewUserOtp} type="submit">register New User</button>
    </form>
  );
}

export default NewPassenger;
