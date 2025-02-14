import { sendResponse } from "../middlewares/utils.js"
import DriverModel from "../model/Driver.js";
import PassengerModel from "../model/Passenger.js";
import RideModel from "../model/Rides.js";


//ACTIVE PASSENGERS AND DRIVERS
export async function activeUsers(req, res) {
    const { stats = '30days' } = req.params;
    const { accountType } = req.query

    console.log('STATSUS', stats)

    const getFilterDates = (value) => {
        const today = new Date();
        let startDate, endDate, previousStartDate, previousEndDate;

        switch (value) {
            case 'today':
                endDate = new Date(today);
                startDate = new Date(today.setDate(today.getDate() - 1));
                previousEndDate = new Date(startDate);
                previousStartDate = new Date(previousEndDate.setDate(previousEndDate.getDate() - 1));
                break;

            case '7days':
                endDate = new Date();
                startDate = new Date(today.setDate(today.getDate() - 7));
                previousEndDate = new Date(startDate);
                previousStartDate = new Date(previousEndDate.setDate(previousEndDate.getDate() - 7));
                break;

            case '30days':
                endDate = new Date();
                startDate = new Date(today.setDate(today.getDate() - 30));
                previousEndDate = new Date(startDate);
                previousStartDate = new Date(previousEndDate.setDate(previousEndDate.getDate() - 30));
                break;

            case '1year':
                endDate = new Date();
                startDate = new Date(today.setFullYear(today.getFullYear() - 1));
                previousEndDate = new Date(startDate);
                previousStartDate = new Date(previousEndDate.setFullYear(previousEndDate.getFullYear() - 1));
                break;

            case 'alltime':
                startDate = new Date(0); // Unix epoch start
                endDate = new Date();
                previousStartDate = null;
                previousEndDate = null;
                break;

            default:
                throw new Error('Invalid stats value');
        }

        return { startDate, endDate, previousStartDate, previousEndDate };
    };

    const calculatePercentageChange = (current, previous) => {
        if (previous === 0) return { change: 100, percentage: '+' }; // Handle division by zero
        const change = ((current - previous) / previous) * 100;
        return {
            change: parseFloat(change.toFixed(2)),
            percentage: change >= 0 ? '+' : '-',
        };
    };

    try {
        const { startDate, endDate, previousStartDate, previousEndDate } = getFilterDates(stats);
        //FOR PASSENGER
        const selectedPassengerPeriodData = await PassengerModel.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: null,
                    totalPassenger: { $sum: 1 },
                    activePassenger: { $sum: { $cond: [{ $eq: ["$verified", true] }, 1, 0] } },
                    inactivePassenger: { $sum: { $cond: [{ $eq: ["$verified", false] }, 1, 0] } },
                    blacklistPassenger: { $sum: { $cond: [{ $eq: ["$isBlocked", true] }, 1, 0] } },
                },
            },
        ]);

        let passengerPreviousPeriodData = [];
        if (previousStartDate && previousEndDate) {
            passengerPreviousPeriodData = await PassengerModel.aggregate([
                { $match: { createdAt: { $gte: previousStartDate, $lte: previousEndDate } } },
                {
                    $group: {
                        _id: null,
                        totalPassenger: { $sum: 1 },
                        activePassenger: { $sum: { $cond: [{ $eq: ["$verified", true] }, 1, 0] } },
                        inactivePassenger: { $sum: { $cond: [{ $eq: ["$verified", false] }, 1, 0] } },
                        blacklistPassenger: { $sum: { $cond: [{ $eq: ["$isBlocked", true] }, 1, 0] } },
                    },
                },
            ]);
        }

        //FOR DRIVER
        const selectedDriverPeriodData = await DriverModel.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: null,
                    totalDriver: { $sum: 1 },
                    activeDriver: { $sum: { $cond: [{ $eq: ["$verified", true] }, 1, 0] } },
                    inactiveDriver: { $sum: { $cond: [{ $eq: ["$verified", false] }, 1, 0] } },
                    blacklistDriver: { $sum: { $cond: [{ $eq: ["$isBlocked", true] }, 1, 0] } },
                },
            },
        ]);

        let driverPreviousPeriodData = [];
        if (previousStartDate && previousEndDate) {
            driverPreviousPeriodData = await DriverModel.aggregate([
                { $match: { createdAt: { $gte: previousStartDate, $lte: previousEndDate } } },
                {
                    $group: {
                        _id: null,
                        totalDriver: { $sum: 1 },
                        activeDriver: { $sum: { $cond: [{ $eq: ["$verified", true] }, 1, 0] } },
                        inactiveDriver: { $sum: { $cond: [{ $eq: ["$verified", false] }, 1, 0] } },
                        blacklistDriver: { $sum: { $cond: [{ $eq: ["$isBlocked", true] }, 1, 0] } },
                    },
                },
            ]);
        }

        // Ensure data structure
        //for Passenger
        const currentData = selectedPassengerPeriodData[0] || { totalPassenger: 0, activePassenger: 0, inactivePassenger: 0, blacklistPassenger: 0 };
        const previousData = passengerPreviousPeriodData[0] || { totalPassenger: 0, activePassenger: 0, inactivePassenger: 0, blacklistPassenger: 0 };

        //for Driver
        const currentDriverData = selectedDriverPeriodData[0] || { totalDriver: 0, activeDriver: 0, inactiveDriver: 0, blacklistDriver: 0 };
        const previousDriverData = driverPreviousPeriodData[0] || { totalDriver: 0, activeDriver: 0, inactiveDriver: 0, blacklistDriver: 0 };

        // Calculate percentage changes with indicators
        const activeNowCurrent = (currentData.activePassenger || 0) + (currentDriverData.activeDriver || 0);
        const activeNowPrevious = (previousData.inactivePassenger || 0) + (previousDriverData.inactiveDriver || 0);

        if( accountType === 'passenger' ){
            const statsComparison = [
                {
                    current: currentData.totalPassenger,
                    previous: previousData.totalPassenger,
                    id: 'totalpassenger',
                    name: 'Total Passenger',
                    ...calculatePercentageChange(currentData.totalPassenger, previousData.totalPassenger),
                },
                {
                    current: currentData.inactivePassenger,
                    previous: previousData.inactivePassenger,
                    id: 'totalinactivepassenger',
                    name: 'Total Inactive Passenger',
                    ...calculatePercentageChange(currentData.inactivePassenger, previousData.inactivePassenger),
                },
                {
                    current: currentData.activePassenger,
                    previous: previousData.activePassenger,
                    id: 'totalactivepassenger',
                    name: 'Total Active Passenger',
                    ...calculatePercentageChange(currentData.activePassenger, previousData.activePassenger),
                },
                /**
                 * 
                {
                    current: currentData.blacklistPassenger,
                    previous: previousData.blacklistPassenger,
                    id: 'totalblacklistpassenger',
                    name: 'Total Blacklist Passenger',
                    ...calculatePercentageChange(currentData.blacklistPassenger, previousData.blacklistPassenger),
                },
                 */
            ];

            sendResponse(res, 200, true, statsComparison)
            return
        } else if (accountType === 'driver') {
            const statsComparison = [
                {
                    current: currentDriverData.totalDriver,
                    previous: previousDriverData.totalDriver,
                    id: 'totaldriver',
                    name: 'Total Driver',
                    ...calculatePercentageChange(currentDriverData.totalDriver, previousDriverData.totalDriver),
                },
                {
                    current: currentDriverData.inactiveDriver,
                    previous: previousDriverData.inactiveDriver,
                    id: 'totalinactivedriver',
                    name: 'Total Inactive Driver',
                    ...calculatePercentageChange(currentDriverData.inactiveDriver, previousDriverData.inactiveDriver),
                },
                {
                    current: currentDriverData.activeDriver,
                    previous: previousDriverData.activeDriver,
                    id: 'totalactivedriver',
                    name: 'Total Active Driver',
                    ...calculatePercentageChange(currentDriverData.activeDriver, previousDriverData.activeDriver),
                },
                /**
                 {
                     current: currentDriverData.blacklistDriver,
                     previous: previousDriverData.blacklistDriver,
                     id: 'totalblacklistdriver',
                     name: 'Total Blacklist Driver',
                     ...calculatePercentageChange(currentDriverData.blacklistDriver, previousDriverData.blacklistDriver),
                 },
                 * 
                 */
            ];

            sendResponse(res, 200, true, statsComparison)
            return
        } else {
            const statsComparison = [
                {
                    current: currentData.totalPassenger,
                    previous: previousData.totalPassenger,
                    id: 'totalpassenger',
                    name: 'Total Passenger',
                    ...calculatePercentageChange(currentData.totalPassenger, previousData.totalPassenger),
                },
                /**
                 * 
                {
                    current: currentData.activePassenger,
                    previous: previousData.activePassenger,
                    id: 'totalactivepassenger',
                    name: 'Total Active Passenger',
                    ...calculatePercentageChange(currentData.activePassenger, previousData.activePassenger),
                },
                {
                    current: currentData.inactivePassenger,
                    previous: previousData.inactivePassenger,
                    id: 'totalinactivepassenger',
                    name: 'Total Inactive Passenger',
                    ...calculatePercentageChange(currentData.inactivePassenger, previousData.inactivePassenger),
                },
                {
                    current: currentData.blacklistPassenger,
                    previous: previousData.blacklistPassenger,
                    id: 'totalblacklistpassenger',
                    name: 'Total Blacklist Passenger',
                    ...calculatePercentageChange(currentData.blacklistPassenger, previousData.blacklistPassenger),
                },
                 */
                {
                    current: currentDriverData.totalDriver,
                    previous: previousDriverData.totalDriver,
                    id: 'totaldriver',
                    name: 'Total Driver',
                    ...calculatePercentageChange(currentDriverData.totalDriver, previousDriverData.totalDriver),
                },
                /**
                 {
                     current: currentDriverData.activeDriver,
                     previous: previousDriverData.activeDriver,
                     id: 'totalactivedriver',
                     name: 'Total Active Driver',
                     ...calculatePercentageChange(currentDriverData.activeDriver, previousDriverData.activeDriver),
                 },
                 {
                     current: currentDriverData.inactiveDriver,
                     previous: previousDriverData.inactiveDriver,
                     id: 'totalinactivedriver',
                     name: 'Total Inactive Driver',
                     ...calculatePercentageChange(currentDriverData.inactiveDriver, previousDriverData.inactiveDriver),
                 },
                 {
                     current: currentDriverData.blacklistDriver,
                     previous: previousDriverData.blacklistDriver,
                     id: 'totalblacklistdriver',
                     name: 'Total Blacklist Driver',
                     ...calculatePercentageChange(currentDriverData.blacklistDriver, previousDriverData.blacklistDriver),
                 },
                 * 
                 */
                {
                    current: activeNowCurrent,
                    previous: activeNowPrevious,
                    id: 'activenow',
                    name: 'Active Now',
                    ...calculatePercentageChange(activeNowCurrent, activeNowPrevious),
                }
            ];
    
            sendResponse(res, 200, true, statsComparison)
            return
        }
        
    } catch (error) {
        console.error('UNABLE TO GET USER STATS', error);
        sendResponse(res, 500, false, 'Unable to get user stats')
    }
}

//TOP LOCATIONS
export async function getTopLocations(req, res) {
    try {
        // Fetch all rides
        const rides = await RideModel.find({}, { to: 1 });

        // Count occurrences of each placeId
        const placeCounts = {};
        const placeNames = {};

        rides.forEach(ride => {
            ride.to.forEach(destination => {
                const { placeId, place } = destination;
                if (placeId) {
                    placeCounts[placeId] = (placeCounts[placeId] || 0) + 1;
                    if (!placeNames[placeId]) placeNames[placeId] = place; // Store any one place name
                }
            });
        });

        // Convert to array and sort by occurrences
        const sortedPlaces = Object.entries(placeCounts)
            .map(([placeId, count]) => ({ placeId, count, place: placeNames[placeId] }))
            .sort((a, b) => b.count - a.count);

        // Get the total count for percentage calculation
        const totalCount = sortedPlaces.reduce((sum, item) => sum + item.count, 0);

        // Select top 5 and calculate percentage
        const topLocations = sortedPlaces.slice(0, 5).map(({ place, count }) => ({
            place,
            percentage: Math.round((count / totalCount) * 100),
        }));

        // Ensure percentages sum to 100 by adjusting the largest value
        const totalPercentage = topLocations.reduce((sum, loc) => sum + loc.percentage, 0);
        if (totalPercentage !== 100) {
            topLocations[0].percentage += 100 - totalPercentage;
        }

        sendResponse(res, 200, true, topLocations)
        return
    } catch (error) {
        console.log("UNABLE TO GET TOP LOCATIONS", error);
        sendResponse(res, 500, false, 'Unable to get Top Locations')
    }
}