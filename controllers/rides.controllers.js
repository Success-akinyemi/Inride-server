import { sendResponse } from "../middlewares/utils.js";
import AppSettingsModel from "../model/AppSettings.js";
import ForgotItemModel from "../model/ForgotItem.js";
import RideModel from "../model/Rides.js";

// GET ALL RIDES OF A DRIVER
export async function getDriverRides(req, res) {
  const { limit = 10, page = 1, startDate, endDate, rideType } = req.query;
  const { driverId, earnings } = req.user;

  try {
    // Build the query object
    const query = { driverId };

    // Handle date filtering
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(endDate) };
    }

    // Handle ride type filtering
    if (rideType) {
      query.rideType = rideType;
    }

    // Calculate the number of documents to skip
    const skip = (Number(page) - 1) * Number(limit);

    // Fetch rides from the database
    const rides = await RideModel.find(query)
      .sort({ createdAt: -1 }) // Sort by latest rides
      .skip(skip) // Skip the documents for pagination
      .limit(Number(limit)); // Limit the results for pagination

    // Transform rides data
    const transformedRides = rides.map((ride) => {
      const {
        fromCoordinates,
        _id,
        passengerId,
        fromId,
        to,
        ...rest
      } = ride._doc;

      // Transform the `to` array to remove specific fields
      const transformedTo = to.map(({ place }) => ({ place }));

      return {
        ...rest,
        to: transformedTo,
      };
    });

    // Get the total count of rides for pagination metadata
    const totalRides = await RideModel.countDocuments(query);

    return sendResponse(res, 200, true, 'Rides fetched successfully', {
      rides: transformedRides,
      totalRides,
      totalPages: Math.ceil(totalRides / limit),
      currentPage: Number(page),
      earningsBalance: earnings,
    });
  } catch (error) {
    console.error('UNABLE TO GET DRIVERS RIDES', error);
    return sendResponse(res, 500, false, 'Unable to get rides');
  }
}

export async function getDriverRide(req, res){
  const { rideId } = req.params
  const { driverId } = req.user

  try {
    const getRide = Ride
  } catch (error) {
    console.log('UNABLE TO GET DRIVER RIDE. RIDE ID', rideId, error)
    sendResponse(res, 500, false, 'Unable to get driver ride detail')
  }
}

// GET THE LAST 7 DAYS RIDES
export async function getLastSevenDays(req, res) {
  const { limit = 10, page = 1 } = req.query; // Default limit and page for pagination
  const { driverId } = req.user;

  try {
    // Calculate the date from 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // Subtract 7 days

    // Build the query for the last 7 days rides (all rides, no status filter)
    const query = {
      driverId,
      createdAt: { $gte: sevenDaysAgo }, // Fetch rides created in the last 7 days
    };

    // Get the total number of rides for the last 7 days (without considering status)
    const totalRides = await RideModel.countDocuments(query);

    // If no rides exist in the last 7 days, return early
    if (totalRides === 0) {
      return sendResponse(res, 200, true, 'Last 7 days rides fetched successfully', {
        rides: [],
        totalRides: 0,
        totalPages: 0,
        totalPayout: 0,
      });
    }

    // Calculate pagination offsets
    const skip = (page - 1) * limit;

    // Fetch all rides from the database for the last 7 days
    const rides = await RideModel.find(query)
      .sort({ createdAt: -1 }) // Sort by latest rides

    // Calculate total pages
    const totalPages = Math.ceil(totalRides / limit);

    // Fetch the rides with `paid: true` and `status: 'Complete'` for payout calculation
    const paidRides = await RideModel.find({
      ...query,
      paid: true,
      status: 'Complete',
    });

    const siteCommission = await AppSettingsModel.findOne()
    // Calculate the total payout for paid and completed rides (subtracting 30% from each charge)
    const totalPayout = paidRides.reduce((sum, ride) => {
      const netCharge = ride.charge - ride.charge * Number((siteCommission?.earningCommission)/100); // Subtract 30%
      return sum + netCharge;
    }, 0);

    // Transform rides data (if needed, like removing unwanted fields)
    const transformedRides = rides.map((ride) => {
      const { fromCoordinates, _id, passengerId, fromId, to, ...rest } = ride._doc;

      // Transform the `to` array to remove specific fields
      const transformedTo = to.map(({ place }) => ({ place }));

      return {
        ...rest,
        to: transformedTo,
      };
    });

    // Send response
    return sendResponse(res, 200, true, 'Last 7 days rides fetched successfully', {
      rides: transformedRides,
      totalRides,
      totalPages,
      totalPayout,
    });
  } catch (error) {
    console.error('UNABLE TO GET LAST SEVEN DAYS RIDES FOR DRIVER', error);
    return sendResponse(res, 500, false, 'Unable to get last seven days rides');
  }
}

//AFTER RIDES FEEDBACKS
export async function afterRideFeedBack(req, res) {
  const { rating, comment, rideId } = req.body
  const { passengerId } = req.user
  const { driverId } = req.user
  try {
    const getRide = await RideModel.findOne({ rideId })
    if(!getRide){
      sendResponse(res, 404, false, 'No ride with this id found')
      return
    }
    if(passengerId){
      getRide.comment = comment
      getRide.rating = rating
      await getRide.save()
    }

    if(driverId){
      getRide.drivercomment = comment
      getRide.driverRating = rating
      await getRide.save()
    }

    sendResponse(res, 200, true, 'Thank you your feed back has been saved')
  } catch (error) {
    console.log('UNABLE TO UPDATE RIDE WITH FEED BACK', error)
    sendResponse(res, 500, false, 'Unable to update ride with feedbacks')
  }
}

//FORGOT ITEM
export async function reportForgotItem(req, res) {
  const { rideId, description } = req.body 
  const { passengerId } = req.user
  if(!description){
    sendResponse(res, 400, false, 'Description of item forgoten is needed')
  }
  try {
    const getRide = await RideModel.findOne({ rideId })
    if(!getRide){
      sendResponse(res, 404, false, 'No ride with this id found')
      return
    }
    if(passengerId !== getRide?.passengerId){
      sendResponse(res, 403, false, 'Not allowed')
      return
    }

    const newForgottenItem =  await ForgotItemModel.create({
      rideId,
      passengerId,
      driverId: getRide?.driverId,
      description
    })

    //can email user and passenger here or any other action
  } catch (error) {
    console.log('UNABLE TO REPORT FORGOTTEN ITEM', error)
    sendResponse(res, 500, false, 'Unable to report forgotten item')
  }
}
