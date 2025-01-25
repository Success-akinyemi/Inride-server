import express from 'express';
import { config } from 'dotenv';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

config();
import PassengerAuthRoute from './routes/PassengerAuth.routes.js';
import DriverAuthRoute from './routes/driverAuth.routes.js';
import appSettingsRoute from './routes/handleappSettings.routes.js';
import authRoute from './routes/auth.routes.js';
import driverRoutes from './routes/driver.routes.js';
import rideRoutes from './routes/rides.routes.js';
import driverBankDetailsRoutes from './routes/driverBankDetails.routes.js';
import driverPayoutRoutes from './routes/driverPayout.routes.js';
import driverProfileRoutes from './routes/driverProfile.routes.js';
import carRoutes from './routes/car.routes.js';




import './connection/db.js';

import * as driverController from './controllers/driver.controllers.js';
import * as passengerController from './controllers/passenger.controllers.js';
import { AuthenticateDriverSocket, AuthenticatePassengerSocket } from './middlewares/auth.js'; 

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
app.use('/api-doc', swaggerUI.serve, swaggerUI.setup(swaggerJSDocs));

// Routes
app.use('/api/auth', authRoute);
app.use('/api/appSettings', appSettingsRoute);
app.use('/api/passenger/auth', PassengerAuthRoute);
app.use('/api/driver/auth', DriverAuthRoute);
app.use('/api/rides', rideRoutes);
app.use('/api/driver/bank', driverBankDetailsRoutes);
app.use('/api/driver/payout', driverPayoutRoutes);
app.use('/api/driver/car', carRoutes);
app.use('/api/driver/profile', driverProfileRoutes);




app.use('/api/driver', driverRoutes);

// Namespaces for Driver and Passenger
export const driverNamespace = io.of('/driver');
export const passengerNamespace = io.of('/passenger');

export const driverConnections = new Map()
export const passengerConnections = new Map()

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
  socket.on('cancelRideRequest', (data) => driverController.cancelRideRequest({ data, socket }));
  socket.on('acceptEditRideRquest', (data) => driverController.acceptEditRideRquest({ data, socket }));

  
  socket.on('startRide', ({ data }) => driverController.startRide({ data, socket }));
  socket.on('rideComplete', ({ data }) => driverController.rideComplete({ data, socket }));

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
  socket.on('shareRideWithFriends', (data) => passengerController.shareRideWithFriends({ data, socket }));
  socket.on('editRide', (data) => passengerController.editRide({ data, socket }));


  socket.on('cancelRide', (data) => passengerController.cancelRide({ ...data, socket }));
  socket.on('trackRide', (data) => passengerController.trackRide({ ...data, socket }));

  socket.on('disconnect', () => {
    console.log('Passenger disconnected:', socket.id);
    if(passengerId){
      passengerConnections.delete(passengerId)
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
