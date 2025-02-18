import { sendNewUserEmail, sendStaffActivationEmail, sendStaffSackEmail } from "../middlewares/mailTemplate.js.js";
import { generateUniqueCode, sendResponse, uploadFile } from "../middlewares/utils.js"
import AdminUserModel from "../model/Admin.js"

// Allowed permissions
const allowedPermissions = ['driver', 'passenger', 'car', 'transaction', 'payout', 'message', 'bigtaxe', 'cms', 'staff', 'admin', 'superadmin'];
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const defaultPwd = '1234!#@$'
//GET PROFILE
export async function getProfile(req, res) {
    const { adminId } = req.user
    try {
        const getAdmin = await AdminUserModel.findOne({ adminId })

        const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, blocked, resetPasswordToken, resetPasswordExpire, _id, superadmin, ...userData } = getAdmin._doc;
        sendResponse(res, 200, true, userData)
    } catch (error) {
        console.log('UNABLE TO GET USER PROFILE', error)
        sendResponse(res, 500, false, 'Unable to get user profile')
    }
}

//GET A STAFF
export async function getAStaff(req, res) {
    const { adminId } = req.params;
    if (!adminId) {
        return sendResponse(res, 400, false, 'Provide a Staff Id or email address');
    }
    try {
        // Check if the input is an email address
        const isEmail = adminId.includes('@');
        const query = isEmail ? { email: adminId } : { adminId };

        const getAdmin = await AdminUserModel.findOne(query);
        if (!getAdmin) {
            return sendResponse(res, 404, false, 'Staff with this Id or email address does not exist');
        }

        const { password, noOfLoginAttempts, temporaryAccountBlockTime, verified, accountSuspended, blocked, resetPasswordToken, resetPasswordExpire, _id, superadmin, ...userData } = getAdmin._doc;
        sendResponse(res, 200, true, userData);
    } catch (error) {
        console.log('UNABLE TO GET USER PROFILE', error);
        sendResponse(res, 500, false, 'Unable to get user profile');
    }
}

//UPDATE PROFILE
export async function updateProfile(req, res) {
    const { firstName, lastName, bio, country, timezone } = req.body
    const { profileImg } = req.files || {};
    const { adminId } = req.user

    if(profileImg && profileImg[0]){
        const allowedImageTypes = ['image/jpeg', 'image/png'];
        if (!allowedImageTypes.includes(profileImg[0].mimetype)) {
            return sendResponse(res, 400, false, `Invalid image format for profile image. Accepted formats: jpeg, png`);
        }
    }
    try {
        let profileImgUrl
        if(profileImg && profileImg[0]){
            profileImgUrl = await uploadFile(req.files.profileImg[0], 'admin-profile-image');
        }

        const getAdmin = await AdminUserModel.findOne({ adminId })

        //update
        console.log('profileImgUrl', profileImgUrl, 'profileImg', profileImg)
        if(profileImgUrl) getAdmin.profileImg = profileImgUrl
        if(firstName) getAdmin.firstName = firstName
        if(lastName) getAdmin.lastName = lastName
        if(bio) getAdmin.bio = bio
        if(country) getAdmin.country = country
        if(timezone) getAdmin.timezone = timezone

        await getAdmin.save()

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
        const getAdmin = await AdminUserModel.findOne({ adminId })

        const isMatch  = await getAdmin.matchPassword(req.body.oldPassword)
        if(!isMatch){
            return sendResponse(res, 403, false, 'Wrong Current Password')
        }

        const notOldPassword  = await getAdmin.matchPassword(req.body.password)
        if(notOldPassword){
            return sendResponse(res, 401, false, 'New password cannot be the same as old password')
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
    const { limit = 10, page = 1, startDate, endDate, status } = req.query;
  
    try {
      // Build the query object
      const query = {};
  
      // Handle date filtering
      if (startDate && endDate) {
        query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      } else if (startDate) {
        query.createdAt = { $gte: new Date(startDate) };
      } else if (endDate) {
        query.createdAt = { $lte: new Date(endDate) };
      }
  
      // Handle status filtering
      if (status && status.toLowerCase() === "active") {
        query.status = 'Active'
      }
      if (status && status.toLowerCase() === "inactive") {
        query.status = 'Inactive'; 
      }
      if (status && status.toLowerCase() === "sacked") {
        query.status = 'Sacked'; 
      }
      if (status && status.toLowerCase() === "pending") {
        query.status = 'Pending'; 
      }
      if (status && status.toLowerCase() === "blocked") {
        query.status = 'Blocked'; 
      }
      if (!status || status.toLowerCase() === "all") {
  
      }

    // Calculate the number of documents to skip
    const skip = (Number(page) - 1) * Number(limit);
  
    // Fetch staffs from the database
    const staffs = await AdminUserModel.find(query)
      .sort({ createdAt: -1 }) // Sort by latest staffs
      .skip(skip) // Skip the documents for pagination
      .limit(Number(limit)); // Limit the results for pagination

    // Get the total count of staffs for pagination metadata
    const totalStaffs = await AdminUserModel.countDocuments(query);
        
    // Transform staffs data
    const transformedStaffs = staffs.map((staff) => ({
        name: `${staff?.firstName} ${staff?.lastName}`,
        email: staff?.email,
        adminId: staff?.adminId,
        role: staff?.role,
        permissions: staff?.permissions,
        createdAt: staff?.createdAt || staff?.updatedAt,
        status: staff?.status,
        blocked: staff?.blocked
    }));
        
    return sendResponse(res, 200, true, 'Staffs fetched successfully', {
      staffs: transformedStaffs,
      totalStaffs,
      totalPages: Math.ceil(totalStaffs / limit),
      currentPage: Number(page),
    });

    } catch (error) {
        console.log('UNABLE TO GET STAFF ACCOUNT',error)
        sendResponse(res, 500, false, 'Unable to get staffs account')
    }
}

//ACTIVATE STAFF
export async function activateStaff(req, res) {
    const { adminId } = req.body
    if(!adminId){
        return sendResponse(res, 400, false, 'Admin Id is required')
    }
    try {
        const getStaff = await AdminUserModel.findOne({  adminId })
        if(!getStaff){
            return sendResponse(res, 500, false, 'Staff with this Id does not exist')
        }

        getStaff.status = 'Active'
        getStaff.blocked = false
        getStaff.verified = true
        await getStaff.save()

        //notify staff
        sendStaffActivationEmail({
            email: getStaff?.email,
            name: `${getStaff?.firstName} ${getStaff?.lastName}`
        })

        sendResponse(res, 200, true, `${getStaff.firstName} ${getStaff.lastName} staff account has been activated`)
    } catch (error) {
        console.log('UANBLE TO SACK STAFF', error)
        sendResponse(res, 500, false, 'Uanble to sack staff')
    }
}

//SACK STAFF
export async function sackStaff(req, res) {
    const { adminId } = req.body
    const { permissions: userPermissions } = req.user

    if(!adminId){
        return sendResponse(res, 400, false, 'Admin Id is required')
    }
    try {
        const getStaff = await AdminUserModel.findOne({  adminId })
        if(!getStaff){
            return sendResponse(res, 500, false, 'Staff with this Id does not exist')
        }    

        // Only userPermissions with 'superadmin' can sack another superadmin
        if (getStaff?.permissions && getStaff?.permissions.includes('superadmin') && !userPermissions.includes('superadmin')) {
            return sendResponse(res, 403, false, 'No Permission', 'You do not have permission to take the actions');
        }

        getStaff.status = 'Sacked'
        getStaff.blocked = true
        await getStaff.save()

        //notify staff
        sendStaffSackEmail({
            email: getStaff.email,
            name: `${getStaff?.firstName} ${getStaff?.lastName}`
        })

        sendResponse(res, 200, true, `${getStaff.firstName} ${getStaff.lastName} staff account has been sacked and blocked`)
    } catch (error) {
        console.log('UANBLE TO SACK STAFF', error)
        sendResponse(res, 500, false, 'Uanble to sack staff')
    }
}

//DEACTIVATE STAFF
export async function deactivateStaff(req, res) {
    const { adminId } = req.body
    const { permissions: userPermissions } = req.user
    if(!adminId){
        return sendResponse(res, 400, false, 'Admin Id is required')
    }
    try {
        const getStaff = await AdminUserModel.findOne({  adminId })
        if(!getStaff){
            return sendResponse(res, 500, false, 'Staff with this Id does not exist')
        }

        // Only userPermissions with 'superadmin' can deactive another superadmin
        if (getStaff?.permissions && getStaff?.permissions.includes('superadmin') && !userPermissions.includes('superadmin')) {
            return sendResponse(res, 403, false, 'No Permission', 'You do not have permission to take the actions');
        }

        getStaff.status = 'Inactive'
        await getStaff.save()

        sendResponse(res, 200, true, `${getStaff.firstName} ${getStaff.lastName} staff account has been deactivated`)
    } catch (error) {
        console.log('UANBLE TO DECATIVATE STAFF', error)
        sendResponse(res, 500, false, 'Uanble to deactivate staff')
    }
}

//UPDATE STAFF ACCOUNT
export async function updateStaffAccount(req, res) {
    const { role, roleDescription, permissions, adminId } = req.body
    const { permissions: userPermissions } = req.user
    if(!adminId){
        return sendResponse(res, 400, false, 'Provide a staff Id')
    }
    if(permissions){
        if (!Array.isArray(permissions)) {
            return sendResponse(res, 400, false, 'Permissions must be an array');
        }

        // Check if all values in permissions are valid
        const invalidPermissions = permissions.filter(p => !allowedPermissions.includes(p.toLowerCase()));

        if (invalidPermissions.length > 0) {
            return sendResponse(res, 400, false, `Invalid permissions: ${invalidPermissions.join(', ')}`);
        }
    }
    try {
        const getStaff = await AdminUserModel.findOne({ adminId })
        if(!getStaff){
            return sendResponse(res, 404, false, 'User with this Id does not exist')
        }

        // Only userPermissions with 'superadmin' can make another user a superadmin
        if (permissions && permissions?.includes('superadmin') && !userPermissions?.includes('superadmin')) {
            return sendResponse(res, 403, false, 'No Permission', 'You do not have permission to make a user superadmin');
        }

        if(role) getStaff.role = role
        if(roleDescription) getStaff.roleDescription = roleDescription
        if(permissions) getStaff.permissions = permissions

        await getStaff.save()

        sendResponse(res, 200, true, 'Staff Profile Updated')
    } catch (error) {
        console.log('UANBLE TO UPDATE STAFF ACCOUNT', error)
        sendResponse(res, 500, false, 'Unable to update staff account')
    }
}

//NEW STAFF
export async function newStaff(req, res){
    const { firstName, lastName, email, role, roleDescription, permissions } = req.body
    const { permissions: userPermissions } = req.user
    if(!firstName){
        return sendResponse(res, 400, false, 'Provide a first name')
    }
    if(!lastName){
        return sendResponse(res, 400, false, 'Provide last name')
    }
    if(!email){
        return sendResponse(res, 400, false, 'Provide email address')
    }
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    if(permissions){
        if (!Array.isArray(permissions)) {
            return sendResponse(res, 400, false, 'Permissions must be an array');
        }

        // Check if all values in permissions are valid
        const invalidPermissions = permissions.filter(p => !allowedPermissions.includes(p.toLowerCase()));

        if (invalidPermissions.length > 0) {
            return sendResponse(res, 400, false, `Invalid permissions: ${invalidPermissions.join(', ')}`);
        }

        // Only userPermissions with 'superadmin' can make another user a superadmin
        if (permissions && permissions.includes('superadmin') && !userPermissions.includes('superadmin')) {
            return sendResponse(res, 403, false, 'No Permission', 'You do not have permission to make a user superadmin');
        }
    }
    try {
        const userExist = await AdminUserModel.findOne({ email })
        if(userExist){
            sendResponse(res, 403, false, 'User with this email already exist')
            return
        }

        const adminId = await generateUniqueCode(8)
        console.log('ADMIN ID', `RF${adminId}AD`)
        const newAdminId = `RF${adminId}AD`    
            
        const newUser = await AdminUserModel.create({
            adminId: newAdminId,
            firstName,
            lastName,
            email,
            permissions,
            status: 'Active',
            verified: true,
            role,
            roleDescription,
            password: newAdminId
        })

        sendNewUserEmail({
            email,
            name: `${newUser.firstName} ${newUser.lastName}`,
            password: newAdminId,
            buttonLink: `${process.env.CLIENT_URL}`
        })

        sendResponse(res, 201, true, 'New user created')
    } catch (error) {
        console.log('UNABLE TO CREATE NEW STAFF ACCOUNT',error) 
        sendResponse(res, 500, false, 'Unable to create new staff account')  
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