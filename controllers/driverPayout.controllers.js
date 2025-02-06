import { sendResponse } from "../middlewares/utils.js"
import DriverModel from "../model/Driver.js"
import DriverBankDetailModel from "../model/DriverBankDetails.js"
import NotificationModel from "../model/Notifications.js";
import PayoutModel from "../model/Payout.js"
import crypto from "crypto"; // Import crypto module for hashing

export async function payoutRequest(req, res) {
    const { bankId, amount } = req.body
    const { driverId, earnings } = req.user
    if(!bankId){
        sendResponse(res, 400, false, 'Bank Account Id is required')
        return
    }
    if(!amount){
        sendResponse(res, 400, false, 'Withdrawal amount is required')
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
        const bankDetails = getBankDetails.bankDetails.find(bank => bank._id === bankId)
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

//approve payoutf and pay

//reject payout with reason