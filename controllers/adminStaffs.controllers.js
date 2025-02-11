import { sendResponse, uploadFile } from "../middlewares/utils.js"
import AdminUserModel from "../model/Admin.js"


//GET PROFILE
export async function getProfile(req, res) {
    const { adminId } = req.user
    try {
        const getAdmin = AdminUserModel.findOne({ adminId })

        const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, blocked, resetPasswordToken, resetPasswordExpire, _id, ...userData } = getAdmin._doc;
        sendResponse(res, 200, true, userData)
    } catch (error) {
        console.log('UNABLE TO GET USER PROFILE', error)
        sendResponse(res, 500, false, 'Unable to get user profile')
    }
}

//GET A STAFF
export async function getAStaff(req, res) {
    const { adminId } = req.params
    if(!adminId){
        return sendResponse(res, 400, false, 'Provide a Staff Id')
    }
    try {
        const getAdmin = AdminUserModel.findOne({ adminId })
        if(!getAdmin){
            return sendResponse(res, 404, false, 'Staff with this Id does not exist')
        }
        const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, blocked, resetPasswordToken, resetPasswordExpire, _id, ...userData } = getAdmin._doc;
        sendResponse(res, 200, true, userData)
    } catch (error) {
        console.log('UNABLE TO GET USER PROFILE', error)
        sendResponse(res, 500, false, 'Unable to get user profile')
    }
}

//UPDATE PROFILE
export async function updateProfile(req, res) {
    const { firstName, lastName, bio, country, timezone } = req.body
    const { profileImg } = req.files;
    const { adminId } = req.user

    if(profileImg[0]){
        const allowedImageTypes = ['image/jpeg', 'image/png'];
        if (!allowedImageTypes.includes(idCardImgFront[0].mimetype)) {
            return sendResponse(res, 400, false, `Invalid image format for ID card front. Accepted formats: jpeg, png`);
        }
    }
    try {
        let profileImgUrl
        if(profileImg[0]){
            profileImgUrl = await uploadFile(req.files.profileImg[0], 'admin-profile-image');
        }

        const getAdmin = AdminUserModel.findOne({ adminId })

        //update
        if(profileImgUrl) getAdmin.profileImg = profileImgUrl
        if(firstName) getAdmin.firstName = firstName
        if(lastName) getAdmin.lastName = lastName
        if(bio) getAdmin.bio = bio
        if(country) getAdmin.country = country
        if(timezone) getAdmin.timezone = timezone

        const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, blocked, resetPasswordToken, resetPasswordExpire, _id, ...userData } = getAdmin._doc;
        sendResponse(res, 200, true, userData, 'Account Updated')
    } catch (error) {
        console.log('UNABLE TO UPDATE USER PROFILE', error)
        sendResponse(res, 500, false, 'Unable to update user profile')
    }
}

// UPDATE PASSWORD
export async function updatePassword(req, res) {
    const { password, confirmPassword, oldPassword } = req.body
    const { adminId } = req.user
    if(!password){
        return sendResponse(res, 400, false, 'Password is required')
    }
    if(!confirmPassword){
        return sendResponse(res, 400, false, 'Confirm Password is required')
    }
    if (password.length < 6) {
        sendResponse(res, 400, false, 'Passwords must be at least 6 characters long')
        return
    }

    const specialChars = /[!@#$%^&*()_+{}[\]\\|;:'",.<>?]/;
    if (!specialChars.test(password)) {
        sendResponse(res, 400, false, 'Passwords must contain at least one special character')
        return
    }

    if (password !== confirmPassword) {
        sendResponse(res, 400, false, 'Passwords do not match')
        return
    }
    if(!oldPassword){
        return sendResponse(res, 400, false, 'Old Password is required')
    }
    try {
        const getAdmin = AdminUserModel.findOne({ adminId })

        const isMatch  = await getAdmin.matchPassword(req.body.oldPassword)
        if(!isMatch){
            return sendResponse(res, 403, false, 'Wrong Current Password')
        }

        const notOldPassword  = await getAdmin.matchPassword(req.body.password)
        if(notOldPassword){
            return sendResponse(res, 401, false, 'Neww password cannot be the same as old password')
        }

        getAdmin.password = password
        await getAdmin.save()

        sendResponse(res, 200, true, 'Password Updated')
    } catch (error) {
        console.log('UNABLE TO UPDATE USER PASSWORD', error)
        sendResponse(res, 500, false, 'Unable to update staff password')
    }
}

//GET ALL STAFFS
export async function getAllStaffs(req, res) {
    try {
        const dele = await AdminUserModel.find()

        sendResponse(res, 200, true, 'Deleted successful', dele)
    } catch (error) {
        console.log('UNABLE TO GET STAFF ACCOUNT',error)
    }
}

export async function dele(req, res) {
    try {
        const dele = await AdminUserModel.deleteOne({ email: 'presh@btcmod.com' })

        sendResponse(res, 200, true, 'Deleted successful')
    } catch (error) {
        console.log('UNABLE TO DELETE STAFF ACCOUNT',error)
    }
}