import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Register from './pages/Passenger/Register'
import RequestRide from './pages/Passenger/RequestRide'
import Login from './pages/Passenger/Login'
import VerifyOtp from './pages/Passenger/VerifyOtp'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/passenger/register' element={<Register />} />
        <Route path='/passenger/requestRide' element={<RequestRide />} />
        <Route path='/passenger/login' element={<Login />} />
        <Route path='/passenger/verifyOtp' element={<VerifyOtp />}  />
      </Routes>
    </BrowserRouter>
  )
}

export default App
