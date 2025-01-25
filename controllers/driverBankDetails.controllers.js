import { sendResponse } from "../middlewares/utils.js"
import DriverBankDetailModel from "../model/DriverBankDetails.js"

export async function newBankDetails(req, res) {
    const { accountName, accountNumber, bankName } =  req.body
    const { driverId } = req.user
    if(!accountName){
        sendResponse(res, 400, false, 'Account Name is required')
        return
    }
    if(!accountNumber){
        sendResponse(res, 400, false, 'Provide a account number')
        return
    }
    if(!bankName){
        sendResponse(res, 400, false, 'Bank name is requried')
        return
    }
    try {
        const getBankDetails = await DriverBankDetailModel.findOne({driverId})
        if(!getBankDetails){
            const newBankDetails = new DriverBankDetailModel({
                driverId,
                bankDetails: [{accountName, accountNumber, bankName}]
            })
            await newBankDetails.save()
            sendResponse(res, 201, true, 'Bank details added successfully')
            return
        } else {
            const bankDetails = {accountName, accountNumber, bankName}
            getBankDetails.bankDetails.push(bankDetails)
            await getBankDetails.save()
            sendResponse(res, 201, true, 'Bank details added successfully')
            return
        }
    } catch (error) {
        console.log('UNABLE TO ADD NEW BANK DETAILS', error)
        sendResponse(res, 500, false, 'Unable to add new bank details')
    }
}

export async function getBankDetails(req, res) {
    const { driverId } = req.user
    try {
        const getBankDetails = await DriverBankDetailModel.findOne({driverId})
        if(!getBankDetails){
            sendResponse(res, 404, false, 'Bank details not found')
            return
        }
        sendResponse(res, 200, true, 'Bank details fetched successfully', getBankDetails)
    } catch (error) {
        console.log('ERROR FETCHING BANK DETAILS', error)
        sendResponse(res, 500, false, 'Unable to fetch bank details')
    }
}

export async function getBankDetail(req, res) {
    const { driverId } = req.user
    const { bankId } = req.params
    try {
        const getBankDetails = await DriverBankDetailModel.findOne({driverId})
        if(!getBankDetails){
            sendResponse(res, 404, false, 'Bank details not found')
            return
        }
        const bankDetails = getBankDetails.bankDetails.find(bank => (bank._id).toString() === bankId)
        if(!bankDetails){
            sendResponse(res, 404, false, 'Bank details not found')
            return
        }
        sendResponse(res, 200, true, 'Bank details fetched successfully', bankDetails)
    } catch (error) {
        console.log('ERROR FETCHING BANK DETAILS', error)
        sendResponse(res, 500, false, 'Unable to fetch bank details')
    }   
}

export async function updateBankDetails(req, res) {
    const { driverId } = req.user
    const { bankId, accountName, accountNumber, bankName } = req.body
    try {
        const getBankDetails = await DriverBankDetailModel.findOne({driverId})
        if(!getBankDetails){
            sendResponse(res, 404, false, 'Bank details not found')
            return
        }
        //check that driverId is the same as driverId on the getBankDetails
        if(getBankDetails.driverId !== driverId){
            sendResponse(res, 403, false, 'You are not authorized to update this bank details')
            return
        }
        const bankDetails = getBankDetails.bankDetails.find(bank => (bank._id).toString() === bankId)
        if(!bankDetails){
            sendResponse(res, 404, false, 'Bank details not found')
            return
        }
        if(accountName) bankDetails.accountName = accountName
        if(accountNumber) bankDetails.accountNumber = accountNumber
        if(bankName) bankDetails.bankName = bankName
        await getBankDetails.save()
        sendResponse(res, 200, true, 'Bank details updated successfully')
    
    } catch (error) {
        console.log('ERROR UPDATING BANK DETAILS', error)
        sendResponse(res, 500, false, 'Unable to update bank details')
    }
}

export async function deleteBankDetails(req, res) {
    const { driverId } = req.user
    const { bankId } = req.body
    try {
        const getBankDetails = await DriverBankDetailModel.findOne({driverId})
        if(!getBankDetails){
            sendResponse(res, 404, false, 'Bank details not found')
            return
        }
        //check that driverId is the same as driverId on the getBankDetails
        if(getBankDetails.driverId !== driverId){
            sendResponse(res, 403, false, 'You are not authorized to delete this bank details')
            return
        }
        const bankDetails = getBankDetails.bankDetails.filter(bank => (bank._id).toString() !== bankId)
        getBankDetails.bankDetails = bankDetails
        await getBankDetails.save()
        sendResponse(res, 200, true, 'Bank details deleted successfully')

    } catch (error) {
        console.log('ERROR dELETING BANK DETAILS', error)
        sendResponse(res, 500, false, 'Unable to delete bank details')
    }
}
