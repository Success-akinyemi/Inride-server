import { sendResponse } from "../middlewares/utils.js";
import RideModel from "../model/Rides.js";
import { generalConnections, generalNamespace } from "../server.js";

const activeCalls = {}; // Track ongoing calls

export async function callUser({ data, socket, res }) {
    const { rideId } = data;
    const { userType, accountId, firstName, lastName, profileImg } = socket.user;

    if (!rideId) {
        const message = "Ride Id is required";
        if (res) sendResponse(res, 400, false, message);
        if (socket) socket.emit("callUser", { success: false, message });
        return;
    }

    try {
        const getRide = await RideModel.findOne({ rideId });
        if (!getRide) {
            const message = "Ride with this Id does not exist";
            if (res) sendResponse(res, 400, false, message);
            if (socket) socket.emit("callUser", { success: false, message });
            return;
        }

        // Authenticate caller
        if (userType === "passenger" || userType === "driver") {
            if (userType === "passenger" && getRide.passengerId !== accountId) {
                return handleUnauthorized(socket, res);
            }
            if (userType === "driver" && getRide.driverId !== accountId) {
                return handleUnauthorized(socket, res);
            }
        }

        const receiverId = userType === "passenger" ? getRide.driverId : getRide.passengerId;
        const receiverSocketId = generalConnections.get(receiverId);

        // 🛑 Check if the caller is already in a call
        const existingCallerCall = Object.values(activeCalls).find(
            (call) => call.caller === socket.id || call.receiver === socket.id
        );

        if (existingCallerCall) {
            const message = "You are already in another call";
            if (res) sendResponse(res, 400, false, message);
            if (socket) socket.emit("callUser", { success: false, message });
            return;
        }

        // 🛑 Check if the receiver is already in a call
        const existingReceiverCall = Object.values(activeCalls).find(
            (call) => call.receiver === receiverSocketId || call.caller === receiverSocketId
        );

        if (existingReceiverCall) {
            const message = "Receiver is in another call";
            if (res) sendResponse(res, 400, false, message);
            if (socket) socket.emit("callUser", { success: false, message });
            return;
        }

        // 📞 Check if receiver is online
        if (receiverSocketId) {
            const message = `Incoming call from ${firstName} ${lastName}`;
            generalNamespace.to(receiverSocketId).emit("incomingCall", { 
                success: true, 
                message, 
                profileImg, 
                rideId 
            });

            activeCalls[rideId] = { caller: socket.id, receiver: receiverSocketId };
            console.log('CALL SENT', activeCalls);

            const callerMessage = `Calling ${userType === "passenger" ? "Driver" : "Passenger"}...`;
            if (res) sendResponse(res, 200, true, callerMessage);
            if (socket) socket.emit("callUser", { success: true, message: callerMessage });

        } else {
            return handleUserOffline(socket, res, userType);
        }
    } catch (error) {
        console.log('object', error);
        return handleError(socket, res, "Unable to make call", error);
    }
}

export async function acceptCall({ data, socket, res }) {
    const { rideId } = data;

    if (!rideId) {
        return handleMissingRideId(socket, res);
    }

    try {
        if (!activeCalls[rideId]) {
            return handleInvalidCall(socket, res);
        }

        const { caller } = activeCalls[rideId];
        generalNamespace.to(caller).emit("callAccepted");

        if (res) sendResponse(res, 200, true, "Call accepted");
    } catch (error) {
        return handleError(socket, res, "Unable to accept call", error);
    }
}

export async function rejectCall({ data, socket, res }) {
    const { rideId } = data;

    if (!rideId) {
        return handleMissingRideId(socket, res);
    }

    try {
        if (!activeCalls[rideId]) {
            return handleInvalidCall(socket, res);
        }

        const { caller } = activeCalls[rideId];
        generalNamespace.to(caller).emit("callRejected");

        delete activeCalls[rideId];

        if (res) sendResponse(res, 200, true, "Call rejected");
    } catch (error) {
        return handleError(socket, res, "Unable to reject call", error);
    }
}

export async function endCall({ data, socket, res }) {
    const { rideId } = data;

    if (!rideId) {
        return handleMissingRideId(socket, res);
    }

    try {
        if (!activeCalls[rideId]) {
            return handleInvalidCall(socket, res);
        }

        const { caller, receiver } = activeCalls[rideId];
        generalNamespace.to(caller).emit("callEnded");
        generalNamespace.to(receiver).emit("callEnded");

        delete activeCalls[rideId];

        if (res) sendResponse(res, 200, true, "Call ended");
    } catch (error) {
        return handleError(socket, res, "Unable to end call", error);
    }
}

// Utility functions for handling errors and responses
function handleUnauthorized(socket, res) {
    const message = "Not allowed to make this call";
    if (res) sendResponse(res, 403, false, message);
    if (socket) socket.emit("callUser", { success: false, message });
}

function handleUserOffline(socket, res, userType) {
    const message = `${userType === "passenger" ? "Driver" : "Passenger"} is not online`;
    if (res) sendResponse(res, 400, false, message);
    if (socket) socket.emit("callUser", { success: false, message });
}

function handleMissingRideId(socket, res) {
    const message = "Ride Id is required";
    if (res) sendResponse(res, 400, false, message);
    if (socket) socket.emit("callUser", { success: false, message });
}

function handleInvalidCall(socket, res) {
    const message = "Invalid or expired call session";
    if (res) sendResponse(res, 400, false, message);
    if (socket) socket.emit("callUser", { success: false, message });
}

function handleError(socket, res, message, error) {
    console.log(message, error);
    if (res) sendResponse(res, 500, false, message);
    if (socket) socket.emit("callUser", { success: false, message });
}
