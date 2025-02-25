import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    idCardType: '',
    ssn: '',
    mobileNumber: '+2341059309831',
  });
  const [idCardImgFront, setIdCardFrontImg] = useState(null);
  const [idCardImgBack, setIdCardBackImg] = useState(null);
  const [profileImg, setProfileImg] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (type === 'idCardImgFront') {
      setIdCardFrontImg(file);
    } else if (type === 'idCardImgBack') {
      setIdCardBackImg(file);
    } else if (type === 'profileImg') {
      setProfileImg(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('mobileNumber', '+2349059309831');
    form.append('firstName', formData.firstName);
    form.append('lastName', formData.lastName);
    form.append('email', formData.email);
    form.append('ssn', formData.ssn);
    form.append('idCardType', formData.idCardType);
    form.append('idCardImgFront', idCardImgFront);
    form.append('idCardImgBack', idCardImgBack);
    form.append('profileImg', profileImg);

    try {
      const response = await fetch(`${import.meta.env.VITE_APP_BASE_URL}/passenger/auth/registerUser`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });

      const result = await response.json();
      if (response.ok) {
        alert(`Success: ${result?.data}`);
        navigate('/passenger/requestRide')
      } else {
        alert(`Error: ${result.data}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while registering the user.');
    }
  };

  useEffect(() => {
    console.log('REGISTER USER DATA', formData)
  }, [formData])
  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      <div>
        <label>First Name:</label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleInputChange}
          required
        />
      </div>
      <div>
        <label>Last Name:</label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleInputChange}
          required
        />
      </div>
      <div>
        <label>Email:</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
      </div>
      <div>
        <label>SSN:</label>
        <input
          type="text"
          name="ssn"
          value={formData.ssn}
          onChange={handleInputChange}
          required
        />
      </div>
      <div>
        <label>ID Card Type:</label>
        <select
          name="idCardType"
          value={formData.idCardType}
          onChange={handleInputChange}
          required
        >
          <option value="">SELECT ID CARD TYPE</option>
          <option value="driverLicense">Driver License</option>
          <option value="internationalPassport">International Passport</option>
          <option value="voterCard">Voter Card</option>
        </select>
      </div>
      <div>
        <label>ID Card Front Image:</label>
        <input type="file" name="idCardImgFront" onChange={(e) => handleFileChange(e, 'idCardImgFront')} />
      </div>
      <div>
        <label>ID Card Back Image:</label>
        <input type="file" name="idCardImgBack" onChange={(e) => handleFileChange(e, 'idCardImgBack')} />
      </div>
      <div>
        <label>Profile Image:</label>
        <input type="file" name="profileImg" onChange={(e) => handleFileChange(e, 'profileImg')} />
      </div>
      <button type="submit">Register</button>
    </form>
  );
}

export default Register;
