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

import authRoute from './routes/auth.routes.js';
import driverRoutes from './routes/driver.routes.js';
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
app.use('/api/passenger/auth', PassengerAuthRoute);
app.use('/api/driver/auth', DriverAuthRoute);

app.use('/api/driver', driverRoutes);

// Namespaces for Driver and Passenger
const driverNamespace = io.of('/driver');
const passengerNamespace = io.of('/passenger');

// Apply socket-specific authentication middleware for Driver
driverNamespace.use(AuthenticateDriverSocket);
driverNamespace.on('connection', (socket) => {
  console.log('Driver connected:', socket.id);

  socket.on('updateLocation', (data) => driverController.updateLocation({ data, socket }));
  socket.on('goOnline', ({ data }) => driverController.goOnline({ data, socket }));
  socket.on('goOffline', ({ data }) => driverController.goOffline({ data, socket }));
  socket.on('rideAccepted', ({ driverId, rideId }) => driverController.rideAccepted({ driverId, rideId, socket }));
  socket.on('rideCancel', ({ driverId, rideId }) => driverController.rideCancel({ driverId, rideId, socket }));
  socket.on('rideComplete', ({ driverId, rideId }) => driverController.rideComplete({ driverId, rideId, socket }));
  socket.on('getNearbyDrivers', (data) => passengerController.getNearByDrivers({ data, socket }));

  socket.on('disconnect', () => {
    console.log('Driver disconnected:', socket.id);
  });
});

// Apply socket-specific authentication middleware for Passenger
passengerNamespace.use(AuthenticatePassengerSocket);
passengerNamespace.on('connection', (socket) => {
  console.log('Passenger connected:', socket.id);
  
  socket.on('getNearbyDrivers', (data) => passengerController.getNearByDrivers({ data, socket }));
  socket.on('requestRide', (data) => passengerController.requestRide({ data, socket }));
  socket.on('requestDriver', (data) => passengerController.requestDriver({ data, socket }));

  socket.on('cancelRide', (data) => passengerController.cancelRide({ ...data, socket }));
  socket.on('trackRide', (data) => passengerController.trackRide({ ...data, socket }));

  socket.on('disconnect', () => {
    console.log('Passenger disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
