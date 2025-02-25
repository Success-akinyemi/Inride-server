import jwt from "jsonwebtoken";
import PassengerModel from "../model/Passenger.js";
import { sendResponse } from "./utils.js";
import RefreshTokenModel from "../model/RefreshToken.js";
import DriverModel from "../model/Driver.js";
import AdminUserModel from "../model/Admin.js";
import moment from 'moment';

// VERIFY PASSENGER
export const AuthenticatePassenger = async (req, res, next) => {
    const accessToken = req.cookies.inrideaccesstoken;
    const accountId = req.cookies.inrideaccessid;
    console.log('PASSENGER','accessToken', accessToken, 'accountId', accountId, req.cookies)

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
            }console.log('USRE', user, 'refreshTokenExist', refreshTokenExist)
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

export const VerifyAccount = async (req, res, next) => {
    const { verified, isBlocked } = req.user
    try {
        if(!verified){
            sendResponse(res, 401, false, 'You acount is not verified')
            return
        }
        if(isBlocked){
            sendResponse(res, 401, false, 'You acount has been blocked. contact admin for support')
            return
        }
        return next();
    } catch (error) {
        console.log('UNABLE TO VERIFY USER ACCOUNT', error)
        return sendResponse(res, 500, false, 'Unable to verify user account')
    }
}

export const AuthenticateUser = async (req, res, next) => {
    const accessToken = req.cookies.inrideaccesstoken;
    const accountId = req.cookies.inrideaccessid;

    let decoded
    try {
        if (accessToken) {
            try { 
                decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                let user;
                const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: decoded.id })
                if (decoded.accountType === 'passenger') {
                    user = await PassengerModel.findOne({ passengerId: decoded.id });
                } else if (decoded.accountType === 'driver') {
                    user = await DriverModel.findOne({ driverId: decoded.id });
                }

                if (!user) {
                    return sendResponse(res, 404, false, 'User not found');
                }
                if (!refreshTokenExist) {
                    return sendResponse(res, 403, false, 'Unauthenticated');
                }

                req.user = { ...user.toObject(), accountType: decoded.accountType, accountId };
                return next();
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    if (accountId) {
                        let user;
                        user = await PassengerModel.findOne({ passengerId: accountId });
                        if (!user) {
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
                            req.user = { ...user.toObject(), accountType: decoded?.accountType, accountId };
                            return next();
                        }
                    }
                    return sendResponse(res, 403, false, 'Unauthenticated');
                }
            }
        } else if (accountId) {
            let user;
            user = await PassengerModel.findOne({ passengerId: accountId });
            if(!user){
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
                req.user = { ...user.toObject(), accountType: decoded?.accountType, accountId };
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
        console.log('DRIVER','AccessToken:', accessToken, 'AccountId:', accountId);

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

export const AuthenticateUserSocket = async (socket, next) => {
    console.log('Authenticating user socket:', socket.id);

    try {
        const cookies = socket.handshake.headers.cookie || ''; // Safeguard for missing cookies
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

        console.log('AccessToken:', accessToken, 'AccountId:', accountId);

        let user = null;
        let userType = null;

        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                console.log('Decoded token:', decoded);

                if (decoded.accountType === 'passenger') {
                    user = await PassengerModel.findOne({ passengerId: decoded.id });
                    userType = 'passenger';
                } else if (decoded.accountType === 'driver') {
                    user = await DriverModel.findOne({ driverId: decoded.id });
                    userType = 'driver';
                }

                const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: decoded.id });

                if (user && refreshTokenExist) {
                    socket.user = {
                        ...user.toObject(),
                        accountId: decoded.id,  // Add accountId to socket.user
                        userType
                    };
                    return next();
                }

                return next(new Error('Invalid access token'));
            } catch (error) {
                console.error('Token verification error:', error);
                return next(new Error('Token expired or invalid'));
            }
        }

        if (accountId) {
            user = await PassengerModel.findOne({ passengerId: accountId });
            userType = 'passenger';

            if (!user) {
                user = await DriverModel.findOne({ driverId: accountId });
                userType = user ? 'driver' : null;
            }

            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId });

            if (user && refreshTokenExist) {
                socket.user = {
                    ...user.toObject(),
                    accountId,  // Add accountId to socket.user
                    userType
                };
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

//Authenticate admin
export const AuthenticateAdmin = async (req, res, next) => {
    const accessToken = req.cookies.inrideauthtoken;
    const accountId = req.cookies.inrideauthid;
    console.log('ADMIN','accessToken', accessToken, 'accountId', accountId)

    try {
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
                let user;
                const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: decoded.id })
                if (decoded.accountType === 'admin') {
                    user = await AdminUserModel.findOne({ adminId: decoded.id });
                }
                if (!user) {
                    return sendResponse(res, 404, false, 'User not found');
                }
                if (!refreshTokenExist) {
                    return sendResponse(res, 403, false, 'UnAuthenicated');
                }
                if(!user?.verified){
                    sendResponse(res, 403, false, user?.verified, 'Account is not yet verified')
                    return
                }
                if(user?.blocked){
                    sendResponse(res, 403, false, 'Account has been blocked')
                    return
                }
                const blockExpiration = moment(user.temporaryAccountBlockTime);
                const currentTime = moment();
                
                if (currentTime.isBefore(blockExpiration)) {
                    // User is still blocked
                    return sendResponse(res, 403, false, `Your account is suspended until ${blockExpiration.format('YYYY-MM-DD HH:mm:ss')}`);
                }
                req.user = user;
                return next();
            } catch (error) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                    if (accountId) {
                        let user = await AdminUserModel.findOne({ adminId: accountId });
                        const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId })
                        if (user && refreshTokenExist) {
                            if(!user?.verified){
                                sendResponse(res, 403, false, user?.verified, 'Account is not yet verified')
                                return
                            }
                            if(user?.blocked){
                                sendResponse(res, 403, false, 'Account has been blocked')
                                return
                            }
                            const blockExpiration = moment(user.temporaryAccountBlockTime);
                            const currentTime = moment();
                            
                            if (currentTime.isBefore(blockExpiration)) {
                                // User is still blocked
                                return sendResponse(res, 403, false, `Your account is suspended until ${blockExpiration.format('YYYY-MM-DD HH:mm:ss')}`);
                            }
                            const accessToken = user.getAccessToken()
                            res.cookie('inrideauthtoken', accessToken, {
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
            const user = await AdminUserModel.findOne({ adminId: accountId });
            const refreshTokenExist = await RefreshTokenModel.findOne({ accountId: accountId })
            if (user && refreshTokenExist) {
                if(!user?.verified){
                    sendResponse(res, 403, false, user?.verified, 'Account is not yet verified')
                    return
                }
                if(user?.blocked){
                    sendResponse(res, 403, false, 'Account has been blocked')
                    return
                }
                const blockExpiration = moment(user.temporaryAccountBlockTime);
                const currentTime = moment();
                
                if (currentTime.isBefore(blockExpiration)) {
                    // User is still blocked
                    return sendResponse(res, 403, false, `Your account is suspended until ${blockExpiration.format('YYYY-MM-DD HH:mm:ss')}`);
                }
                const accessToken = user.getAccessToken()
                res.cookie('inrideauthtoken', accessToken, {
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

export const VerifyAdminAccount = async (req, res, next) => {
    const { verified, blocked, accountSuspended, status } = req.user
    try {
        if(!verified){
            sendResponse(res, 401, false, 'You acount is not verified')
            return
        }
        if(accountSuspended){
            sendResponse(res, 401, false, 'You acount has been suspended. contact admin for support')
            return
        }
        if(blocked){
            sendResponse(res, 401, false, 'You acount has been blocked')
            return
        }
        if(status !== 'Active'){
            sendResponse(res, 401, false, `You access to this account has been revoked. Account: ${status} `)
            return
        }
        return next();
    } catch (error) {
        console.log('UNABLE TO VERIFY USER ACCOUNT', error)
        return sendResponse(res, 500, false, 'Unable to verify user account')
    }
}

  //Allowed user roles:
  export const UserRole = (allowedRoles) => {
    return (req, res, next) => {
      //const { permissions } = req.user;

      if (!req.user?.permissions || !req.user?.permissions.some(role => allowedRoles.includes(role))) {
        return sendResponse(res, 403, false, 'No Permission', 'You do not have permission for this request');
      }
  
      next();
    };
  };
