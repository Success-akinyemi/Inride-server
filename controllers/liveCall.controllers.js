import { sendResponse } from "../middlewares/utils.js";
import DriverModel from "../model/Driver.js";
import PassengerModel from "../model/Passenger.js";
import RideModel from "../model/Rides.js";
import { generalConnections, generalNamespace } from "../server.js";
import { StreamClient } from "@stream-io/node-sdk";

const activeCalls = {}; // Track ongoing calls

const apiKey = process.env.STREAM_KEY;
const secret = process.env.STREAM_SECRET;
const client = new StreamClient(apiKey, secret, { timeout: 9000 });

export async function callUser({ data, socket, res }) {
    const { rideId } = data;
    const { userType, accountId, firstName, lastName, profileImg } = socket.user;
    console.log('CALL USER')
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

        if (!receiverSocketId) {
            console.log('USER OFFLINE')
            return handleUserOffline(socket, res, userType);
        }

        // 🛑 Check if the caller or receiver is already in a call
        /**
         if (activeCalls[rideId]) {
             console.log('CALL IN PROGRESS')
             const message = "Call already in progress";
             if (res) sendResponse(res, 400, false, message);
             if (socket) socket.emit("callUser", { success: false, message });
             return;
         }
         * 
         */

        // Create Stream.io call
        const callType = 'default';
        //const callType = 'audio_room';
        const callId = rideId;
        const call = client.video.call(callType, callId);

        await call.getOrCreate({
            ring: true,
            data: {
                created_by_id: accountId,
                members: [{ user_id: accountId }, { user_id: receiverId }],
            },
        });
        console.log('accountId', accountId, 'receiverId', receiverId)
        // Generate tokens for caller and receiver
        const validity = 60 * 60; // 1 hour
        const callerToken = client.generateUserToken({ user_id: accountId, validity_in_seconds: validity });
        const receiverToken = client.generateUserToken({ user_id: receiverId, validity_in_seconds: validity });

        // Emit tokens to clients
        socket.emit("callerToken", { token: callerToken, callId });
        generalNamespace.to(receiverSocketId).emit("receiverToken", { token: receiverToken, callId });
        console.log('TOKEN EMITTED TO CLIENT')
        // Notify receiver of incoming call
        generalNamespace.to(receiverSocketId).emit("incomingCall", {
            success: true,
            message: `Incoming call from ${firstName} ${lastName}`,
            profileImg,
            rideId,
            callId,
        });

        // Track active call
        activeCalls[rideId] = { caller: socket.id, receiver: receiverSocketId, callId };

        if (res) sendResponse(res, 200, true, "Call initiated");
        if (socket) socket.emit("callUser", { success: true, message: "Call initiated" });
    } catch (error) {
        console.error("Error in callUser:", error);
        return handleError(socket, res, "Unable to make call", error);
    }
}

export async function acceptCall({ data, socket, res }) {
    const { rideId } = data;

    if (!rideId) {
        return handleMissingRideId(socket, res);
    }

    try {
        const call = activeCalls[rideId];
        if (!call) {
            return handleInvalidCall(socket, res);
        }

        // Notify caller that the call has been accepted
        generalNamespace.to(call.caller).emit("callAccepted");

        if (res) sendResponse(res, 200, true, "Call accepted");
    } catch (error) {
        return handleError(socket, res, "Unable to accept call", error);
    }
}

export async function endCall({ data, socket, res }) {
    const { rideId } = data;

    if (!rideId) {
        return handleMissingRideId(socket, res);
    }

    try {
        const call = activeCalls[rideId];
        if (!call) {
            return handleInvalidCall(socket, res);
        }

        // Notify both parties that the call has ended
        generalNamespace.to(call.caller).emit("callEnded");
        generalNamespace.to(call.receiver).emit("callEnded");

        // Remove call from active calls
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
    console.error(message, error);
    if (res) sendResponse(res, 500, false, message);
    if (socket) socket.emit("callUser", { success: false, message });
}