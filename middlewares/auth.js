import jwt from "jsonwebtoken";
import PassengerModel from "../model/Passenger.js";
import { sendResponse } from "./utils.js";
import RefreshTokenModel from "../model/RefreshToken.js";

// VERIFY USER REQUEST
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
