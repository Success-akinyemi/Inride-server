import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Register from './pages/Passenger/Register'
import RequestRide from './pages/Passenger/RequestRide'
import Login from './pages/Passenger/Login'
import VerifyOtp from './pages/Passenger/VerifyOtp'
import DriverLogin from './pages/Driver/DriverLogin'
import DriverVerifyOtp from './pages/Driver/DriverVerifyOtp'
import DriverHome from './pages/Driver/DriverHome'
import Test from './pages/Driver/Test'
import RideChat from './pages/Passenger/RideChat'
import DriverRideChat from './pages/Driver/DriverRideChat'
import LiveCall from './pages/General/LiveCall'
import './App.css'
import LiveVideoCall from './pages/General/LiveVideoCall'
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripePayment from './pages/Passenger/StripePayment'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISH_KEY);

function App() {

  return (
    <Elements stripe={stripePromise}>
      <div className="app">

      <BrowserRouter>
        <Routes>
          <Route path='/passenger/register' element={<Register />} />
          <Route path='/passenger/requestRide' element={<RequestRide />} />
          <Route path='/passenger/rideChat' element={<RideChat />} />
          <Route path='/passenger/login' element={<Login />} />
          <Route path='/passenger/verifyOtp' element={<VerifyOtp />}  />
          <Route path='/passenger/fundWallet' element={<StripePayment />}  />

          <Route path='/driver/login' element={<DriverLogin />}  />
          <Route path='/driver/verifyOtp' element={<DriverVerifyOtp />}  />
          <Route path='/driver/home' element={<DriverHome />}  />
          <Route path='/driver/rideChat' element={<DriverRideChat />}  />


          <Route path='/' element={<Test />} />
          <Route path='/general/liveCall' element={<LiveCall />} />
          <Route path='/general/liveVideo' element={<LiveVideoCall />} />

          
        </Routes>
      </BrowserRouter>
      </div>
    </Elements>
  )
}

export default App
