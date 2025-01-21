import { sendResponse } from "../middlewares/utils.js"
import appSettingsModel from "../model/AppSettings.js"

export async function handleappSettings(req, res) {
    const { pricePerKm, name, currency } = req.body
    try {
        let getAppSettings
        getAppSettings = await appSettingsModel.findOne()
        if(getAppSettings){
            if(pricePerKm) getAppSettings.pricePerKm = pricePerKm
            if(name) getAppSettings.name =  name
            if(currency) getAppSettings.currency = currency
            
            await getAppSettings.save()
        } else {
            getAppSettings = await appSettingsModel.create({
                pricePerKm, name, currency
            })
        }

        return sendResponse(res, 200, true, 'Settings updated successful', getAppSettings)
    } catch (error) {
        console.log('UNABLE TO HANDLE SETTINGS UPDATE', error)
        return sendResponse(res, 500, false, 'Unable to update app settings')
    }
}