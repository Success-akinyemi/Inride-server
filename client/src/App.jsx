import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Register from './pages/Passenger/Register'
import RequestRide from './pages/Passenger/RequestRide'
import Login from './pages/Passenger/Login'
import VerifyOtp from './pages/Passenger/VerifyOtp'
import DriverLogin from './pages/Driver/DriverLogin'
import DriverVerifyOtp from './pages/Driver/DriverVerifyOtp'
import DriverHome from './pages/Driver/DriverHome'
import Test from './pages/Driver/Test'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/passenger/register' element={<Register />} />
        <Route path='/passenger/requestRide' element={<RequestRide />} />
        <Route path='/passenger/login' element={<Login />} />
        <Route path='/passenger/verifyOtp' element={<VerifyOtp />}  />

        <Route path='/driver/login' element={<DriverLogin />}  />
        <Route path='/driver/verifyOtp' element={<DriverVerifyOtp />}  />
        <Route path='/driver/home' element={<DriverHome />}  />

        <Route path='/' element={<Test />} />
        
      </Routes>
    </BrowserRouter>
  )
}

export default App
