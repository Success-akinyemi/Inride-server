import jwt from "jsonwebtoken";
import PassengerModel from "../model/Passenger.js";
import { sendResponse } from "./utils.js";
import RefreshTokenModel from "../model/RefreshToken.js";
import DriverModel from "../model/Driver.js";

// VERIFY PASSENGER
export const AuthenticatePassenger = async (req, res, next) => {
    const accessToken = req.cookies.inrideaccesstoken;
    const accountId = req.cookies.inrideaccessid;

    try {
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                let user;
                if (decoded.accountType === 'passenger') {
                    user = await PassengerModel.findOne({ passengerId: decoded.id });
                }
                if (!user) {
                    return sendResponse(res, 404, false, 'User not found');
                }
                if (!user.refreshToken) {
                    return sendResponse(res, 403, false, 'UnAuthenicated');
                }
                req.user = user;
                return next();
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    if (accountId) {
                        let user = await PassengerModel.findOne({ passengerId: accountId });
                        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId })
                        if (user && refreshTokenExist) {
                            const accessToken = user.getAccessToken()
                            res.cookie('inrideaccesstoken', accessToken, {
                                httpOnly: true,
                                sameSite: 'None',
                                secure: true,
                                maxAge: 15 * 60 * 1000, // 15 minutes
                            });
                            req.user = user;
                            return next();
                        }
                    }
                    return sendResponse(res, 403, false, 'UnAuthenicated');
                }
            }
        } else if (accountId) {
            const user = await PassengerModel.findOne({ passengerId: accountId });
            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId })
            if (user && refreshTokenExist) {
                const accessToken = user.getAccessToken()
                res.cookie('inrideaccesstoken', accessToken, {
                    httpOnly: true,
                    sameSite: 'None',
                    secure: true,
                    maxAge: 15 * 60 * 1000, // 15 minutes
                });
                req.user = user;
                return next();
            }
        }
        return sendResponse(res, 403, false, 'UnAuthenicated');
    } catch (error) {
        console.error('Authentication error:', error);
        return sendResponse(res, 500, false, 'Server error during authentication');
    }
};

export const AuthenticateDriver = async (req, res, next) => {
    const accessToken = req.cookies.inrideaccesstoken;
    const accountId = req.cookies.inrideaccessid;

    try {
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                let user;
                if (decoded.accountType === 'passenger') {
                    user = await DriverModel.findOne({ driverId: decoded.id });
                }
                if (!user) {
                    return sendResponse(res, 404, false, 'User not found');
                }
                if (!user.refreshToken) {
                    return sendResponse(res, 403, false, 'UnAuthenicated');
                }
                req.user = user;
                return next();
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    if (accountId) {
                        let user = await DriverModel.findOne({ driverId: accountId });
                        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId })
                        if (user && refreshTokenExist) {
                            const accessToken = user.getAccessToken()
                            res.cookie('inrideaccesstoken', accessToken, {
                                httpOnly: true,
                                sameSite: 'None',
                                secure: true,
                                maxAge: 15 * 60 * 1000, // 15 minutes
                            });
                            req.user = user;
                            return next();
                        }
                    }
                    return sendResponse(res, 403, false, 'UnAuthenicated');
                }
            }
        } else if (accountId) {
            const user = await DriverModel.findOne({ driverId: accountId });
            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId })
            if (user && refreshTokenExist) {
                const accessToken = user.getAccessToken()
                res.cookie('inrideaccesstoken', accessToken, {
                    httpOnly: true,
                    sameSite: 'None',
                    secure: true,
                    maxAge: 15 * 60 * 1000, // 15 minutes
                });
                req.user = user;
                return next();
            }
        }
        return sendResponse(res, 403, false, 'UnAuthenicated');
    } catch (error) {
        console.error('Authentication error:', error);
        return sendResponse(res, 500, false, 'Server error during authentication');
    }
};

export const AuthenticatePassengerSocket = async (socket, next) => {
    const accessToken = socket.handshake.cookies?.inrideaccesstoken;
    const accountId = socket.handshake.cookies?.inrideaccessid;

    try {
        if (accessToken) {
            try {
                // Verify the access token
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                let user;

                // If the account type is 'driver', fetch the driver data
                if (decoded.accountType === 'passenger') {
                    user = await PassengerModel.findOne({ passengerId: decoded.id });
                }

                // If user not found, reject connection
                if (!user) {
                    return next(new Error('User not found'));
                }

                // If refresh token does not exist, reject connection
                if (!user.refreshToken) {
                    return next(new Error('Unauthenticated'));
                }

                socket.user = user; // Attach the user to the socket object
                return next(); // Proceed with the connection
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    // If the token expired or is invalid, check refresh token
                    if (accountId) {
                        let user = await PassengerModel.findOne({ passengerId: accountId });
                        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId });

                        if (user && refreshTokenExist) {
                            // Generate a new access token
                            const newAccessToken = user.getAccessToken();

                            // Emit the new token to the client (if needed, can send via a custom event)
                            socket.emit('tokenRefreshed', { accessToken: newAccessToken });

                            // Attach user to the socket
                            socket.user = user;

                            // Continue the connection
                            return next();
                        }
                    }
                    return next(new Error('Unauthenticated'));
                }
            }
        } else if (accountId) {
            // If no token in handshake, check for accountId and refresh token
            const user = await PassengerModel.findOne({ passengerId: accountId });
            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId });

            if (user && refreshTokenExist) {
                const newAccessToken = user.getAccessToken();
                socket.emit('tokenRefreshed', { accessToken: newAccessToken });
                socket.user = user;
                return next();
            }
        }

        return next(new Error('Unauthenticated'));
    } catch (error) {
        console.error('Authentication error in socket:', error);
        return next(new Error('Server error during authentication'));
    }
};

export const AuthenticateDriverSocket = async (socket, next) => {
    const accessToken = socket.handshake.cookies?.inrideaccesstoken;
    const accountId = socket.handshake.cookies?.inrideaccessid;

    try {
        if (accessToken) {
            try {
                // Verify the access token
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                let user;

                // If the account type is 'driver', fetch the driver data
                if (decoded.accountType === 'driver') {
                    user = await DriverModel.findOne({ driverId: decoded.id });
                }

                // If user not found, reject connection
                if (!user) {
                    return next(new Error('User not found'));
                }

                // If refresh token does not exist, reject connection
                if (!user.refreshToken) {
                    return next(new Error('Unauthenticated'));
                }

                socket.user = user; // Attach the user to the socket object
                return next(); // Proceed with the connection
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    // If the token expired or is invalid, check refresh token
                    if (accountId) {
                        let user = await DriverModel.findOne({ driverId: accountId });
                        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId });

                        if (user && refreshTokenExist) {
                            // Generate a new access token
                            const newAccessToken = user.getAccessToken();

                            // Emit the new token to the client (if needed, can send via a custom event)
                            socket.emit('tokenRefreshed', { accessToken: newAccessToken });

                            // Attach user to the socket
                            socket.user = user;

                            // Continue the connection
                            return next();
                        }
                    }
                    return next(new Error('Unauthenticated'));
                }
            }
        } else if (accountId) {
            // If no token in handshake, check for accountId and refresh token
            const user = await DriverModel.findOne({ driverId: accountId });
            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId });

            if (user && refreshTokenExist) {
                const newAccessToken = user.getAccessToken();
                socket.emit('tokenRefreshed', { accessToken: newAccessToken });
                socket.user = user;
                return next();
            }
        }

        return next(new Error('Unauthenticated'));
    } catch (error) {
        console.error('Authentication error in socket:', error);
        return next(new Error('Server error during authentication'));
    }
};