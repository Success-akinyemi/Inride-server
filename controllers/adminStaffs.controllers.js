import { sendResponse } from "../middlewares/utils.js"
import AdminUserModel from "../model/Admin.js"

export async function dele(req, res) {
    try {
        const dele = await AdminUserModel.deleteOne({ email: 'presh@btcmod.com' })

        sendResponse(res, 200, true, 'Deleted successful')
    } catch (error) {
        console.log('UNABLE TO DELETE STAFF ACCOUNT',error)
    }
}

export async function gete(req, res) {
    try {
        const dele = await AdminUserModel.find()

        sendResponse(res, 200, true, 'Deleted successful', dele)
    } catch (error) {
        console.log('UNABLE TO GET STAFF ACCOUNT',error)
    }
}