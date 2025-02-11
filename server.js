import express from 'express';
import { config } from 'dotenv';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

config();
import PassengerAuthRoute from './routes/PassengerAuth.routes.js';
import PassengerCardRoute from './routes/passengerCardDeatil.routes.js';
import PassengerProfileRoutes from './routes/passengerProfile.routes.js';

import DriverAuthRoute from './routes/driverAuth.routes.js';
import appSettingsRoute from './routes/handleappSettings.routes.js';
import authRoute from './routes/auth.routes.js';
import driverRoutes from './routes/driver.routes.js';
import rideRoutes from './routes/rides.routes.js';
import driverBankDetailsRoutes from './routes/driverBankDetails.routes.js';
import driverPayoutRoutes from './routes/driverPayout.routes.js';
import driverProfileRoutes from './routes/driverProfile.routes.js';
import carRoutes from './routes/car.routes.js';
import adminAuthRoutes from './routes/adminAuth.routes.js';
import statsRoutes from './routes/stats.routes.js';



import './connection/db.js';

import * as driverController from './controllers/driver.controllers.js';
import * as passengerController from './controllers/passenger.controllers.js';
import * as generalLiveCallController from './controllers/liveCall.controllers.js';
import * as generalLiveVideoCallController from './controllers/liveVideoCall.controllers.js';

import { AuthenticateDriverSocket, AuthenticatePassengerSocket, AuthenticateUserSocket } from './middlewares/auth.js'; 

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, process.env.ADMIN_URL, process.env.SERVER_URL, '*'],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors({
  origin: [process.env.CLIENT_URL, process.env.ADMIN_URL],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

//DOCs
import swaggerUI from 'swagger-ui-express';
import YAML from 'yamljs';
const swaggerJSDocs = YAML.load('./api.yaml');
const swaggerAdminJSDocs = YAML.load('./admin-api.yaml');

app.use('/api-doc', swaggerUI.serve, swaggerUI.setup(swaggerJSDocs));
app.use('/api/admin-doc', swaggerUI.serve, swaggerUI.setup(swaggerAdminJSDocs));


// Routes
app.use('/api/auth', authRoute);
app.use('/api/appSettings', appSettingsRoute);

app.use('/api/passenger/auth', PassengerAuthRoute);
app.use('/api/passenger/card', PassengerCardRoute);
app.use('/api/passenger/profile', PassengerProfileRoutes);


app.use('/api/rides', rideRoutes);

app.use('/api/driver/auth', DriverAuthRoute);
app.use('/api/driver/bank', driverBankDetailsRoutes);
app.use('/api/driver/payout', driverPayoutRoutes);
app.use('/api/driver/car', carRoutes);
app.use('/api/driver/profile', driverProfileRoutes);
app.use('/api/driver', driverRoutes);

app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/stats', statsRoutes);



// Namespaces for Driver and Passenger
export const driverNamespace = io.of('/driver');
export const passengerNamespace = io.of('/passenger');
export const generalNamespace = io.of('/general');


export const driverConnections = new Map()
export const passengerConnections = new Map()
export const generalConnections = new Map()


// Apply socket-specific authentication middleware for Driver
driverNamespace.use(AuthenticateDriverSocket);
driverNamespace.on('connection', (socket) => {
  console.log('Driver connected:', socket.id);

  const { driverId } = socket.user

  if(driverId){
    driverConnections.set(driverId, socket.id)
  }
  console.log('CONNECTING DRIVER ID TO SOCKET ID', driverConnections)

  socket.on('updateLocation', (data) => driverController.updateLocation({ data, socket }));
  socket.on('goOnline', (data) => driverController.goOnline({ data, socket }));
  socket.on('goOffline', (data) => driverController.goOffline({ data, socket }));
  socket.on('getNearbyDrivers', (data) => passengerController.getNearByDrivers({ data, socket }));
  socket.on('acceptRideRequest', (data) => driverController.acceptRideRequest({ data, socket }));
  socket.on('acceptEditRideRquest', (data) => driverController.acceptEditRideRquest({ data, socket }));
  socket.on('cancelRideRequest', (data) => driverController.cancelRideRequest({ data, socket }));
  socket.on('rejectEditRideRquest', (data) => driverController.rejectEditRideRquest({ data, socket }));  
  socket.on('startRide', (data) => driverController.startRide({ data, socket }));
  socket.on('rideComplete', (data) => driverController.rideComplete({ data, socket }));
  socket.on('cancelRide', (data) => driverController.cancelRide({ data, socket }));
  socket.on('chatWithPassenger', (data) => driverController.chatWithPassenger({ data, socket }));


  socket.on('disconnect', () => {
    console.log('Driver disconnected:', socket.id);
    if(driverId){
      driverConnections.delete(driverId)
    }
  });
});

// Apply socket-specific authentication middleware for Passenger
passengerNamespace.use(AuthenticatePassengerSocket);
passengerNamespace.on('connection', (socket) => {
  console.log('Passenger connected:', socket.id);

  const { passengerId } = socket.user

  if(passengerId){
    passengerConnections.set(passengerId, socket.id)
  }
  console.log('CONNECTING PASSENGER ID TO SOCKET ID', passengerConnections)

  
  socket.on('getNearbyDrivers', (data) => passengerController.getNearByDrivers({ data, socket }));
  socket.on('requestRide', (data) => passengerController.requestRide({ data, socket }));
  socket.on('requestDriver', (data) => passengerController.requestDriver({ data, socket }));
  socket.on('payForRide', (data) => passengerController.payForRide({ data, socket }));
  socket.on('payForEditRide', (data) => passengerController.payForEditRide({ data, socket }));
  socket.on('shareRideWithFriends', (data) => passengerController.shareRideWithFriends({ data, socket }));
  socket.on('editRide', (data) => passengerController.editRide({ data, socket }));
  socket.on('cancelRide', (data) => passengerController.cancelRide({ data, socket }));
  socket.on('trackRide', (data) => passengerController.trackRide({ data, socket }));
  socket.on('chatWithDriver', (data) => passengerController.chatWithDriver({ data, socket }));


  socket.on('disconnect', () => {
    console.log('Passenger disconnected:', socket.id);
    if(passengerId){
      passengerConnections.delete(passengerId)
    }
  });
});


// Apply socket-specific authentication middleware for General
generalNamespace.use(AuthenticateUserSocket);
generalNamespace.on('connection', (socket) => {
  console.log('Passenger connected:', socket.id);

  const { accountId } = socket.user

  if(accountId){
    generalConnections.set(accountId, socket.id)
  }
  console.log('CONNECTING USER ID TO SOCKET ID', generalConnections)

  //sockets for live call
  socket.on('callUser', (data) => generalLiveCallController.callUser({ data, socket }));
  socket.on('acceptCall', (data) => generalLiveCallController.acceptCall({ data, socket }));
  socket.on('rejectCall', (data) => generalLiveCallController.rejectCall({ data, socket }));
  socket.on('endCall', (data) => generalLiveCallController.endCall({ data, socket }));
  socket.on('webrtcOffer', (data) => generalLiveCallController.webrtcOffer({ data, socket }));
  socket.on('webrtcAnswer', (data) => generalLiveCallController.webrtcAnswer({ data, socket }));
  socket.on('iceCandidate', (data) => generalLiveCallController.iceCandidate({ data, socket }));


  //sockets for live call
  socket.on('videocallUser', (data) => generalLiveVideoCallController.videocallUser({ data, socket }));
  socket.on('acceptVideoCall', (data) => generalLiveVideoCallController.acceptVideoCall({ data, socket }));
  socket.on('rejectVideoCall', (data) => generalLiveVideoCallController.rejectVideoCall({ data, socket }));
  socket.on('endVideoCall', (data) => generalLiveVideoCallController.endVideoCall({ data, socket }));
  socket.on('videoCallOffer', (data) => generalLiveVideoCallController.videoCallOffer({ data, socket }));
  socket.on('answerVideoCall', (data) => generalLiveVideoCallController.answerVideoCall({ data, socket }));
  socket.on('videoCallIceCandidate', (data) => generalLiveVideoCallController.videoCallIceCandidate({ data, socket }));
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if(accountId){
      generalConnections.delete(accountId)
    }
  });

});

//SCEHDULED functions
import { scheduleRideAlerts } from './controllers/passenger.controllers.js'

scheduleRideAlerts()

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
