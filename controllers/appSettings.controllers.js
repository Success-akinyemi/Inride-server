import { sendResponse } from "../middlewares/utils.js"
import AppSettingsModel from "../model/AppSettings.js"
import appSettingsModel from "../model/AppSettings.js"

export async function handleappSettings(req, res) {
    const { pricePerKm, name, currency, cancelationRidePercent, deliveryPricePerKm } = req.body
    try {
        let getAppSettings
        getAppSettings = await appSettingsModel.findOne()
        if(getAppSettings){
            if(pricePerKm) getAppSettings.pricePerKm = pricePerKm
            if(name) getAppSettings.name =  name
            if(currency) getAppSettings.currency = currency
            if(cancelationRidePercent) getAppSettings.cancelationRidePercent = cancelationRidePercent
            if(deliveryPricePerKm) getAppSettings.deliveryPricePerKm = deliveryPricePerKm, deliveryPricePerKm
            
            await getAppSettings.save()
        } else {
            getAppSettings = await appSettingsModel.create({
                pricePerKm, name, currency, cancelationRidePercent,
            })
        }

        return sendResponse(res, 200, true, 'Settings updated successful', getAppSettings)
    } catch (error) {
        console.log('UNABLE TO HANDLE SETTINGS UPDATE', error)
        return sendResponse(res, 500, false, 'Unable to update app settings')
    }
}

export async function getAppSettings(req, res) {
    try {
        const appSettings = await AppSettingsModel.findOne()

        sendResponse(res, 200, true, appSettings)
    } catch (error) {
        console.log('UNABLE TO GET APP SETTINGS', error)
        sendResponse(res, 500, false, 'Unable to get app settings')
    }
}