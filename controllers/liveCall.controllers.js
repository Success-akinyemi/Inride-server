import { sendResponse } from "../middlewares/utils.js"
import PassengerModel from "../model/Passenger.js"
import RideModel from "../model/Rides.js"
import { generalConnections, generalNamespace } from "../server.js"

//IN THIS FILE EMITING RESPONSE SHOULD BE TO THE SPECIFIC USER

export async function callUser({ data, socket, res }) {
    const { rideId } = data
    const { userType, accountId, firstName, lastName, profileImg } = socket.user
    if(!rideId){
        const message = 'Ride Id is required'
        if(res) sendResponse(res, 400, false, message)
        if(socket) socket.emit('callUser', { success: false, message })
        return
    }

    try {
        const getRide = await RideModel.findOne({ rideId })
        if(!getRide){
            const message = 'Ride With this Id does not exist'
            if(res) sendResponse(res, 400, false, message)
            if(socket) socket.emit('callUser', { success: false, message })
            return
        }

        //authenticate caller
        if(userType === 'passenger' || userType === 'driver'){
            if(userType === 'passenger' && getRide.passengerId !== accountId){
                const message = 'Not Allowed to make this call'
                if(res) sendResponse(res, 403, false, message)
                if(socket) socket.emit('callUser', { success: false, message })
                return
            }
            if(userType === 'driver' && getRide.driverId !== accountId){
                const message = 'Not Allowed to make this call'
                if(res) sendResponse(res, 403, false, message)
                if(socket) socket.emit('callUser', { success: false, message })
                return
            }
        }

        if(userType === 'passenger' || userType === 'driver'){
            //alrert receiver
            const generalSocketId = generalConnections.get(userType === 'passenger' ? getRide.driverId : getRide.passengerId)
            if(generalSocketId){
                const message = `You have an Incoming call from ${firstName} ${lastName}`
                generalNamespace.to(generalSocketId).emit('incomingCall', { success: true, message, profileImg })
            } else {
                console.log(`${ userType === 'passenger' ? 'DRIVER' : 'PASSENGER'} SOCKET NOT FOUND IN GENERAL NAMESPACE > ${ userType === 'passenger' ? 'DRIVER' : 'PASSENGER'} NOT ONLINE`)
                const message = `${ userType === 'passenger' ? 'Driver' : 'Passenger'} is not online`
                if(res) sendResponse(res, 400, false, message)
                if(socket) socket.emit('callUser', { success: false, message })
                return
            }

            //notify caller
            const message = `Calling ${ userType === 'passenger' ? 'Driver' : 'Passenger'}...`
            if(res) sendResponse(res, 200, true, message)
            if(socket) socket.emit('callUser', { success: true, message })

        }  else {
            const message = 'Invalid user type'
            if(res) sendResponse(res, 403, false, message)
            if(socket) socket.emit('callUser', { success: false, message })
            return
        }

    } catch (error) {
        console.log('UNABLE TO MAKE CALL', error)
        const message = 'Uanble to make call'
        if(res) sendResponse(res, 500, false, message)
        if(socket) socket.emit('callUser', { success: false, message })
        return
    }
}