import jwt from "jsonwebtoken";
import PassengerModel from "../model/Passenger.js";
import { sendResponse } from "./utils.js";
import RefreshTokenModel from "../model/RefreshToken.js";
import DriverModel from "../model/Driver.js";

// VERIFY PASSENGER
export const AuthenticatePassenger = async (req, res, next) => {
    const accessToken = req.cookies.inrideaccesstoken;
    const accountId = req.cookies.inrideaccessid;
    console.log('PASSENGER','accessToken', accessToken, 'accountId', accountId)

    try {
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                let user;
                const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: decoded.id })
                if (decoded.accountType === 'passenger') {
                    user = await PassengerModel.findOne({ passengerId: decoded.id });
                }
                if (!user) {
                    return sendResponse(res, 404, false, 'User not found');
                }
                if (!refreshTokenExist) {
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
    console.log('DRIVER','accessToken', accessToken, 'accountId', accountId)
    try {
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                let user;
                console.log('decoded', decoded)
                const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: decoded.id })
                if (decoded.accountType === 'driver') {
                    user = await DriverModel.findOne({ driverId: decoded.id });
                }
                if (!user) {
                    return sendResponse(res, 404, false, 'User not found');
                }
                if (!refreshTokenExist) {
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
            console.log('object')
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

export const AuthenticateUser = async (req, res, next) => {
    const accessToken = req.cookies.inrideaccesstoken;
    const accountId = req.cookies.inrideaccessid;

    try {
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                let user;

                if (decoded.accountType === 'passenger') {
                    user = await PassengerModel.findOne({ passengerId: decoded.id });
                } else if (decoded.accountType === 'driver') {
                    user = await DriverModel.findOne({ driverId: decoded.id });
                }

                if (!user) {
                    return sendResponse(res, 404, false, 'User not found');
                }
                if (!user.refreshToken) {
                    return sendResponse(res, 403, false, 'Unauthenticated');
                }

                req.user = { ...user.toObject(), accountType: decoded.accountType };
                return next();
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    if (accountId) {
                        let user;
                        if (decoded?.accountType === 'passenger') {
                            user = await PassengerModel.findOne({ passengerId: accountId });
                        } else {
                            user = await DriverModel.findOne({ driverId: accountId });
                        }
                        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId });

                        if (user && refreshTokenExist) {
                            const accessToken = user.getAccessToken();
                            res.cookie('inrideaccesstoken', accessToken, {
                                httpOnly: true,
                                sameSite: 'None',
                                secure: true,
                                maxAge: 15 * 60 * 1000, // 15 minutes
                            });
                            req.user = { ...user.toObject(), accountType: decoded?.accountType };
                            return next();
                        }
                    }
                    return sendResponse(res, 403, false, 'Unauthenticated');
                }
            }
        } else if (accountId) {
            let user;
            if (decoded?.accountType === 'passenger') {
                user = await PassengerModel.findOne({ passengerId: accountId });
            } else {
                user = await DriverModel.findOne({ driverId: accountId });
            }
            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId });

            if (user && refreshTokenExist) {
                const accessToken = user.getAccessToken();
                res.cookie('inrideaccesstoken', accessToken, {
                    httpOnly: true,
                    sameSite: 'None',
                    secure: true,
                    maxAge: 15 * 60 * 1000, // 15 minutes
                });
                req.user = { ...user.toObject(), accountType: decoded?.accountType };
                return next();
            }
        }
        return sendResponse(res, 403, false, 'Unauthenticated');
    } catch (error) {
        console.error('Authentication error:', error);
        return sendResponse(res, 500, false, 'Server error during authentication');
    }
};

export const AuthenticatePassengerSocket = async (socket, next) => {
    try {
        const cookies = socket.handshake.headers.cookie || '';  // Safeguard for missing cookies
        if (!cookies) {
            console.log('No cookies received');
            return next(new Error('No cookies provided'));
        }

        const parseCookies = (cookieString) => {
            return cookieString.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                acc[key] = decodeURIComponent(value);
                return acc;
            }, {});
        };

        const cookieObj = parseCookies(cookies);
        const accessToken = cookieObj['inrideaccesstoken'];
        const accountId = cookieObj['inrideaccessid'];

        //console.log('Cookies:', cookies);
        console.log('PASSENGER','AccessToken:', accessToken, 'AccountId:', accountId);

        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                console.log('Decoded token:', decoded);

                if (decoded.accountType === 'passenger') {
                    const user = await PassengerModel.findOne({ passengerId: decoded.id });
                    const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: decoded.id });
                    if (user && refreshTokenExist) {
                        socket.user = user;
                        return next();
                    }
                }
                return next(new Error('Invalid access token'));
            } catch (error) {
                console.error('Token verification error:', error);
                return next(new Error('Token expired or invalid'));
            }
        }

        if (accountId) {
            const user = await PassengerModel.findOne({ passengerId: accountId });
            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId });
            //console.log('USER', user, refreshTokenExist)
            if (user && refreshTokenExist) {
                socket.user = user;
                socket.emit('tokenRefreshed', { accessToken: user.getAccessToken() });
                return next();
            }
        }

        console.log('Unauthenticated');
        return next(new Error('Unauthenticated'));
    } catch (error) {
        console.error('Authentication error:', error);
        return next(new Error('Server error during authentication'));
    }
};

export const AuthenticateDriverSocket = async (socket, next) => {
    console.log('Authenticating driver socket:', socket.id)
    try {
        const cookies = socket.handshake.headers.cookie || '';  // Safeguard for missing cookies
        if (!cookies) {
            console.log('No cookies received');
            return next(new Error('No cookies provided'));
        }

        const parseCookies = (cookieString) => {
            return cookieString.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                acc[key] = decodeURIComponent(value);
                return acc;
            }, {});
        };

        const cookieObj = parseCookies(cookies);
        const accessToken = cookieObj['inrideaccesstoken'];
        const accountId = cookieObj['inrideaccessid'];

        //console.log('Cookies:', cookies);
        console.log('AccessToken:', accessToken, 'AccountId:', accountId);

        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                console.log('Decoded token:', decoded);

                if (decoded.accountType === 'driver') {
                    const user = await DriverModel.findOne({ driverId: decoded.id });
                    const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: decoded.id });
                    if (user && refreshTokenExist) {
                        socket.user = user;
                        return next();
                    }
                }
                return next(new Error('Invalid access token'));
            } catch (error) {
                console.error('Token verification error:', error);
                return next(new Error('Token expired or invalid'));
            }
        }

        if (accountId) {
            const user = await DriverModel.findOne({ driverId: accountId });
            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId });
            if (user && refreshTokenExist) {
                socket.user = user;
                socket.emit('tokenRefreshed', { accessToken: user.getAccessToken() });
                return next();
            }
        }

        return next(new Error('Unauthenticated'));
    } catch (error) {
        console.error('Authentication error:', error);
        return next(new Error('Server error during authentication'));
    }
};