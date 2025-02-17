import { sendPayoutRequestApprovedEmail, sendPayoutRequestRejectedEmail, sendPayoutrequestSubmittedEmail } from "../middlewares/mailTemplate.js.js";
import { sendResponse } from "../middlewares/utils.js"
import DriverModel from "../model/Driver.js"
import DriverBankDetailModel from "../model/DriverBankDetails.js"
import NotificationModel from "../model/Notifications.js";
import PayoutModel from "../model/Payout.js"
import crypto from "crypto"; // Import crypto module for hashing

export async function payoutRequest(req, res) {
    const { bankId, amount } = req.body
    const { driverId, earnings, email, firstName, lastName } = req.user
    if(!bankId){
        sendResponse(res, 400, false, 'Bank Account Id is required')
        return
    }
    if(!amount){
        sendResponse(res, 400, false, 'Withdrawal amount is required')
        return
    }
    if(isNaN(amount)){
      sendResponse(res, 400, false, 'amount value must be a number')
      return
  }
    const fullAmount = Number(amount)
    if(fullAmount > earnings ){
        sendResponse(res, 500, false, 'Amount cannot be greater than current earnings')
        return
    }
    try {
        const getBankDetails = await DriverBankDetailModel.findOne({driverId})
        if(!getBankDetails){
            sendResponse(res, 404, false, 'Bank details not found. add a bank account')
            return
        }
        const bankDetails = getBankDetails.bankDetails.find(bank => bank._id.toString() === bankId)
        if(!bankDetails){
            sendResponse(res, 404, false, 'Bank Account details not found')
            return
        }

        const newPayoutRequest = await PayoutModel.create({
            driverId,
            amount: fullAmount,
            bankName: bankDetails?.bankName,
            accountName: bankDetails?.accountName,
            accountNumber: bankDetails?.accountNumber
        })

        const getDriver = await DriverModel.findOne({ driverId })
        getDriver.earnings -= fullAmount
        await getDriver.save()  
        
        //new notification
        await NotificationModel.create({
            accountId: driverId,
            message: `New Payout for ${newPayoutRequest?.amount} to ${newPayoutRequest?.accountNumber} has been submitted`
        })

        //Send Email
        sendPayoutrequestSubmittedEmail({
          email,
          name: `${firstName} ${lastName}`,
          amount,
          bankName: bankDetails?.bankName,
          accountName: bankDetails?.accountName,
          accountNumber: bankDetails?.accountNumber
        })

        sendResponse(res, 201, false, 'Payout requested successful')
    } catch (error) {
        console.log('UNABLE TO PROCESS PAYOUT REQUEST', error)
        sendResponse(res, 500, false, 'Unable to process payout request')
    }
}

export async function getPayouts(req, res) {
  const { driverId } = req.user;
  const { limit = 10, page = 1 } = req.query; // Use query params for pagination

  try {
    // Calculate pagination offsets
    const skip = (page - 1) * limit;

    // Fetch payouts for the driver sorted by createdAt in descending order
    const payouts = await PayoutModel.find({ driverId })
      .sort({ createdAt: -1 }) // Sort by createdAt (latest first)
      .skip(skip) // Pagination offset
      .limit(Number(limit)); // Limit results

    // Hash account numbers to only display the last digit
    const transformedPayouts = payouts.map((payout) => {
      const hashedAccountNumber =
        "*".repeat(payout.accountNumber.length - 1) +
        payout.accountNumber.slice(-3); // Mask all but the last three digit

      return {
        ...payout._doc, // Spread other payout properties
        accountNumber: hashedAccountNumber, // Replace account number with hashed version
      };
    });

    // Get the total number of payouts for the driver
    const totalPayouts = await PayoutModel.countDocuments({ driverId });

    // Calculate total pages
    const totalPages = Math.ceil(totalPayouts / limit);

    // Send response
    return sendResponse(res, 200, true, "Payouts fetched successfully", {
      payouts: transformedPayouts,
      totalPayouts,
      totalPages,
    });
  } catch (error) {
    console.error("UNABLE TO GET PAYOUT REQUEST", error);
    return sendResponse(res, 500, false, "Unable to get payout request");
  }
}

//ADMIN
//approve payout and pay
export async function approvePayout(req, res) {
  const { payoutId } = req.body
  if(!payoutId){
    return sendResponse(res, 400, false, 'Payout Id is required')
  }
  try {
    const getPayoutData = await PayoutModel.findById({ _id: payoutId })
    if(!getPayoutData){
      return sendResponse(res, 404, false, 'Payout with this id does not exist')
    }
    if(getPayoutData.closed){
      return sendResponse(res, 403, false, 'Payout has been closed and cannot be modified')
    }
    const driverId = getPayoutData?.driverId
    const getDriver = await DriverModel.findOne({ driverId })

    getPayoutData.status = 'Succesful'
    getPayoutData.closed = true
    await getPayoutData.save()

    //new notification
    await NotificationModel.create({
      accountId: driverId,
      message: `Payout for ${getPayoutData?.amount} to ${getPayoutData?.accountNumber} has been approved`
    })

    //Send Email
    sendPayoutRequestApprovedEmail({
      email,
      name: `${getDriver?.firstName} ${getDriver?.lastName}`,
      amount,
      bankName: getPayoutData?.bankName,
      accountName: getPayoutData?.accountName,
      accountNumber: getPayoutData?.accountNumber
    })
    sendResponse(res, 200, true, `Payout request has been approved for ${getDriver?.firstName} ${getDriver?.lastName}`)
  } catch (error) {
    console.log('UNABLE TO APPROVED PAYOUT REQUEST', error)
    sendResponse(res, 500, false, 'Unable to approve payout request')
  }
}

//reject payout with reason
export async function rejectPayout(req, res) {
  const { payoutId, reason } = req.body
  if(!payoutId){
    return sendResponse(res, 400, false, 'Payout Id is required')
  }
  if(!reason){
    return sendResponse(res, 400, false, 'Rejection reason is required')
  }
  try {
    const getPayoutData = await PayoutModel.findById({ _id: payoutId })
    if(!getPayoutData){
      return sendResponse(res, 404, false, 'Payout with this id does not exist')
    }
    if(getPayoutData.closed){
      return sendResponse(res, 403, false, 'Payout has been closed and cannot be modified')
    }
    const driverId = getPayoutData?.driverId
    const getDriver = await DriverModel.findOne({ driverId })

    getPayoutData.status = 'Canceled'
    getPayoutData.reason = reason
    getPayoutData.closed = true
    await getPayoutData.save()
    getDriver.earnings += getPayoutData?.amount
    await getDriver.save()

    //new notification
    await NotificationModel.create({
      accountId: driverId,
      message: `Payout for ${getPayoutData?.amount} to ${getPayoutData?.accountNumber} has been rejected. Reason: ${reason}`
    })

    //Send Email
    sendPayoutRequestRejectedEmail({
      email,
      name: `${getDriver?.firstName} ${getDriver?.lastName}`,
      amount,
      bankName: getPayoutData?.bankName,
      accountName: getPayoutData?.accountName,
      accountNumber: getPayoutData?.accountNumber,
      reason
    })
    sendResponse(res, 200, true, `Payout request has been rejected for ${getDriver?.firstName} ${getDriver?.lastName}`)
  } catch (error) {
    console.log('UNABLE TO REJECT PAYOUT REQUEST', error)
    sendResponse(res, 500, false, 'Unable to reject payout request')
  }
}

//get all payouts
export async function getAllPayouts(req, res) {
  const { limit = 10, page = 1, status } = req.query
  try {
      const pageNumber = Number(page)
      const limitNumber = Number(limit)
      const query = {}

      if(status?.toLowercase() === 'pending'){
          query.status = 'Pending'
      }
      if(status?.toLowercase() === 'succesful'){
          query.status = 'Succesful'
      }        
      if(status?.toLowercase() === 'canceled'){
          query.status = 'Canceled'
      }

      const skip = (pageNumber -1) * limitNumber;

      const data = await PayoutModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean()

      // Add driver names
      const payoutsWithDriverNames = await Promise.all(data.map(async (payout) => {
        const driver = await DriverModel.findOne({driverId: payout.driverId});
        if (driver) {
            payout.driverName = `${driver.firstName} ${driver.lastName}`;
        }
        return payout;
      }));

      const totalData = await PayoutModel.countDocuments(query)

      sendResponse(
          res,
          200,
          true,
          {
              data: payoutsWithDriverNames,
              totalData,
              totalPages: Math.ceil(totalData / limitNumber),
              currentPage: pageNumber
          },
          'Payout Data Data fetched successful'
      )
  } catch (error) {
      console.log('UNABLE TO GET ALL PAYOUT DATA', error)
      res.status(500).json({ success: false, data: 'Unable to get all payout data' })
  }
}

//get a payout
export async function getAPayout(req, res) {
  const { payoutId } = req.params
  if(!payoutId){
      return sendResponse(res, 400, false, 'Provide a payout Id')
  }
  try {
      const getPayout = await PayoutModel.findById({ _id: payoutId })
      if(!getPayout){
          return sendResponse(res, 404, false, 'payout data with this Id not found')
      }

      const driverId = getPayoutData?.driverId
      const getDriver = await DriverModel.findOne({ driverId })
      
      const data = {
        ...getPayout.toObject(),
        driverName: `${getDriver?.firstName} ${getDriver?.lastName}`
      }

      sendResponse(res, 200, true, data)
  } catch (error) {
      console.log('UNABLE TO GET PAYOUT DATA', error)
      sendResponse(res, 500, false, 'Unable to get payout data')
  }
}

//PAYOUT STATS
export async function payoutStats(req, res) {
  const { stats = '30days' } = req.query;

  const getFilterDates = (value) => {
      const today = new Date();
      let startDate, endDate, previousStartDate, previousEndDate;

      switch (value) {
          case 'today':
              endDate = new Date(today);
              startDate = new Date(today);
              startDate.setDate(startDate.getDate() - 1);
              previousEndDate = new Date(startDate);
              previousStartDate = new Date(previousEndDate);
              previousStartDate.setDate(previousStartDate.getDate() - 1);
              break;

          case '7days':
              endDate = new Date(today);
              startDate = new Date(today);
              startDate.setDate(startDate.getDate() - 7);
              previousEndDate = new Date(startDate);
              previousStartDate = new Date(previousEndDate);
              previousStartDate.setDate(previousStartDate.getDate() - 7);
              break;

          case '30days':
              endDate = new Date(today);
              startDate = new Date(today);
              startDate.setDate(startDate.getDate() - 30);
              previousEndDate = new Date(startDate);
              previousStartDate = new Date(previousEndDate);
              previousStartDate.setDate(previousStartDate.getDate() - 30);
              break;

          case '1year':
              endDate = new Date(today);
              startDate = new Date(today);
              startDate.setFullYear(startDate.getFullYear() - 1);
              previousEndDate = new Date(startDate);
              previousStartDate = new Date(previousEndDate);
              previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
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

      const aggregatePayouts = async (start, end, status = null) => {
          const matchCondition = {
              createdAt: { $gte: start, $lte: end }
          };

          if (status) {
              matchCondition.status = status;
          }

          return await PayoutModel.countDocuments(matchCondition);
      };

      // Current period stats
      const currentPayoutRequest = await aggregatePayouts(startDate, endDate);
      const currentSuccessfulPayout = await aggregatePayouts(startDate, endDate, 'Successful');

      // Previous period stats
      let previousPayoutRequest = 0, previousSuccessfulPayout = 0;
      if (previousStartDate && previousEndDate) {
          previousPayoutRequest = await aggregatePayouts(previousStartDate, previousEndDate);
          previousSuccessfulPayout = await aggregatePayouts(previousStartDate, previousEndDate, 'Successful');
      }

      const statsComparison = [
          {
              current: currentSuccessfulPayout,
              previous: previousSuccessfulPayout,
              id: 'totalpayout',
              name: 'Total Payout',
              ...calculatePercentageChange(currentSuccessfulPayout, previousSuccessfulPayout),
          },
          {
              current: currentPayoutRequest,
              previous: previousPayoutRequest,
              id: 'totalpayoutrequest',
              name: 'Total payout request',
              ...calculatePercentageChange(currentPayoutRequest, previousPayoutRequest),
          },
      ];

      sendResponse(res, 200, true, statsComparison);
  } catch (error) {
      console.error('UNABLE TO GET PAYOUT STATS', error);
      sendResponse(res, 500, false, 'Unable to get payout stats');
  }
}
