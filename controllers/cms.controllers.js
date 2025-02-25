import { sendCMSEmail } from "../middlewares/mailTemplate.js.js"
import { sendNotificationById, sendResponse, uploadFile } from "../middlewares/utils.js"
import AdminUserModel from "../model/Admin.js"
import CmsModel from "../model/Cms.js"
import DriverModel from "../model/Driver.js"
import PassengerModel from "../model/Passenger.js"

//CREATE NEW CMS
export async function newCms(req, res) {
    const { title, message, url, caption, redirection, status, type, scheduled, scheduledDate, accountType, users } = req.body
    const { cmsImage } = req.files || {}
    const { firstName, lastName, adminId } =  req.user
    if(!title){
        return sendResponse(res, 400, false, 'Provide a title')
    }
    if(!message){
        return sendResponse(res, 400, false, 'Provide a message')
    }
    if(!redirection){
        return sendResponse(res, 400, false, 'Provide a redirection type')
    }
    if(!['inapp', 'mail', 'pushnotification', 'inappandpushnotification'].includes(redirection.toLowerCase())){
        return sendResponse(res, 400, false, 'CMS redirection type must be either "inapp", "mail", "pushnotification" or "inappandpushnotification"')
    }
    if(!status){
        return sendResponse(res, 400, false, 'Provide a CMS status')
    }
    if(!['draft', 'scheduled', 'published'].includes(status.toLowerCase())){
        sendResponse(res, 400, false, 'CMS status must be either "draft" or "scheduled" or "published"')
    }
    if(!type){
        return sendResponse(res, 400, false, 'Provide a CMS type')
    }
    if(!['updates', 'offers'].includes(type.toLowerCase())){
        return sendResponse(res, 400, false, 'CMS type must be either "updates" or "offers"')
    }

    if(accountType){
        if(!['driver', 'passenger', 'admin'].includes(accountType.toLowerCase())){
            return sendResponse(res, 400, false, 'CMS account Type must be either "driver", "passenger" or "admin"')
        }
    }
    if(users){
        if (!Array.isArray(users)) {
            return sendResponse(res, 400, false, 'users must be an array');
        }
    }
    const { day, time, date } = req.body || {}
    let scheduledTimeData 
    if(status.toLowerCase() === 'scheduled' || scheduled && scheduled === true){
        if (!day) {
            return sendResponse(res, 400, false, 'Provide day for scheduled CMS' )
        }

        if (!time) {
            return sendResponse(res, 400, false, 'Provide time for scheduled CMS')
        }

        // Validate time format
        const timeRegex = /^(0?[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/;
        if (!timeRegex.test(time)) {
          return sendResponse(res, 400, false, 'Invalid time format. Use E.G "09:15 AM" or "12:00 PM" format');
        }        

        // Validate day of the week
        const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        if (!validDays.includes(day)) {
            return sendResponse(res, 400, false, 'Invalid day format. Use full day names, e.g., "Monday", "Tuesday".')
        }

        // Validate date
        if (!date) {
            return sendResponse(res, 400, false, 'Provide a date for scheduled CMS')
        }

        // Parse and validate the provided date
        const currentDate = new Date();
        const providedDate = new Date(`${date}T00:00:00.000Z`); // Force UTC interpretation

        // Check if the date format is valid and not in the past
        if (isNaN(providedDate.getTime())) {
        return sendResponse(res, 400, false, 'Invalid date format. Use E.G "YYYY-MM-DD".');
        }

        // Normalize both dates to midnight UTC for comparison
        const normalizedCurrentDate = new Date(Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate(),
        0, 0, 0, 0
        ));

        const normalizedProvidedDate = new Date(Date.UTC(
        providedDate.getUTCFullYear(),
        providedDate.getUTCMonth(),
        providedDate.getUTCDate(),
        0, 0, 0, 0
        ));

        if (normalizedProvidedDate < normalizedCurrentDate) {
        return sendResponse(res, 400, false, 'The date cannot be in the past.');
        }

        scheduledTimeData = {
            day, time, date
        }
    }

    try {
        let image
        if(cmsImage){
            image = await uploadFile(req.files.cmsImage[0], 'cms-image')
        }
        const newCms = await CmsModel.create({
            title, 
            message, 
            image: image ? image : '',
            url, 
            caption, 
            author: `${firstName} ${lastName}`,
            authorId: adminId,
            redirection,
            status,
            type,
            scheduled: scheduled === true ? true : false,
            accountType,
            allUsers: accountType ? false : true
        });
        // Push the scheduled information
        if(scheduled === true){
            newCms.scheduledDate.push(scheduledTimeData);
        }
        if(users){
            newCms.users = users
        }

        // Save the CMS document
        await newCms.save();

        //send mail notifications
        if(status === 'published' && type === 'mail'){
            //send mail notifications
            let recipients = [];
            if (accountType === 'driver') {
                const drivers = await DriverModel.find({}, 'email firstName lastName'); // Fetch emails and names
                recipients = drivers.map(driver => ({ email: driver.email, name: `${driver.firstName} ${driver.lastName}` || '' }));
            } else if (accountType === 'passenger') {
                const passenger = await PassengerModel.find({}, 'email firstName lastName'); // Fetch emails and names
                recipients = passenger.map(passenger => ({ email: passenger.email, name: `${passenger.firstName} ${passenger.lastName}` || '' }));
            } else if (accountType === 'admin') {
                const admin = await AdminUserModel.find({}, 'email firstName lastName'); // Fetch emails and names
                recipients = admin.map(admin => ({ email: admin.email, name: `${admin.firstName} ${admin.lastName}` || '' }));
            } else if (!accountType || newCms?.allUsers === true) {
                const drivers = await DriverModel.find({}, 'email firstName lastName');
                const passenger = await PassengerModel.find({}, 'email firstName lastName');
                const admin = await AdminUserModel.find({}, 'email firstName lastName');
                recipients = [
                    ...drivers.map(driver => ({ email: driver.email, name: `${driver.firstName} ${driver.lastName}` || '' })),
                    ...passenger.map(passenger => ({ email: passenger.email, name: `${passenger.firstName} ${passenger.lastName}` || '' })),
                    ...admin.map(admin => ({ email: admin.email, name: `${admin.firstName} ${organization.lastName}` || '' })),
                ];
            } else if (users?.lenght > 1) {
                recipients = users.map(email => ({ email, name: '' })); // Use custom emails
            }

            // Send emails
            for (const recipient of recipients) {
                sendCMSEmail({
                    email: recipient?.email,
                    name: recipient?.name,
                    content: message,
                    image: image ? image : '',
                    title
                })
            }
        }

        //send push notificatio
        if(status === 'published' && type === 'pushnotification' || type === 'inappandpushnotification' ){
            const cmsId = newCms._id; // CMS ID
            const sendPushNotification = await sendNotificationById(cmsId);
            console.log(sendPushNotification);
        }

        sendResponse(res, 201, true, 'CMS message created successfully')
    } catch (error) {
        console.log('UNABLE TO CREATE NEW CMS MESSAGE', error);
        sendResponse(res, 500, false, 'Unable to create a new CMS message')
    }
}

//UPDATE CMS
export async function updateCms(req, res) {
    const { _id, title, message, url, caption, redirection, status, type, scheduled, scheduledDate, accountType, users } = req.body
    const { cmsImage } = req.files || {}
    if(!_id){
        return sendResponse(res, 400, false, 'Provide a CMs id (_id)')
    }
    if(redirection){
        if(!['inapp', 'mail', 'pushnotification', 'inappandpushnotification'].includes(redirection.toLowerCase())){
            return sendResponse(res, 400, false, 'CMS redirection type must be either "inapp", "mail", "pushnotification" or "inappandpushnotification"')
        }
    }
    if(status){
        if(!['draft', 'scheduled', 'published'].includes(status.toLowerCase())){
            sendResponse(res, 400, false, 'CMS status must be either "draft" or "scheduled" or "published"')
        }
    }
    if(type){
        if(!['updates', 'offers'].includes(type.toLowerCase())){
            return sendResponse(res, 400, false, 'CMS type must be either "updates" or "offers"')
        }
    }
    
    if(accountType){
        if(!['driver', 'passenger', 'admin'].includes(accountType.toLowerCase())){
            return sendResponse(res, 400, false, 'CMS account Type must be either "driver", "passenger" or "admin"')
        }
    }
    if(users){
        if (!Array.isArray(users)) {
            return sendResponse(res, 400, false, 'users must be an array');
        }
    }
    const { day, time, date } = req.body || {}
    console.log('status', status, 'scheduled', scheduled, 'day', day, 'time', time, 'date', date)
    let scheduledTimeData 
    if(status.toLowerCase() === 'scheduled' || scheduled && scheduled === true){
        if (!day) {
            return sendResponse(res, 400, false, 'Provide day for scheduled CMS' )
        }

        if (!time) {
            return sendResponse(res, 400, false, 'Provide time for scheduled CMS')
        }

        // Validate time format
        const timeRegex = /^([0-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/;
        if (!timeRegex.test(time)) {
            return sendResponse(res, 400, false, 'Invalid time format. Use E.G "09:15 AM" or "12:00 PM" format')
        }

        // Validate day of the week
        const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        if (!validDays.includes(day)) {
            return sendResponse(res, 400, false, 'Invalid day format. Use full day names, e.g., "Monday", "Tuesday".')
        }

        // Validate date
        if (!date) {
            return sendResponse(res, 400, false, 'Provide a date for scheduled CMS')
        }
        // Parse and validate the provided date
        const currentDate = new Date();
        const providedDate = new Date(`${date}T00:00:00.000Z`); // Force UTC interpretation

        // Check if the date format is valid and not in the past
        if (isNaN(providedDate.getTime())) {
        return sendResponse(res, 400, false, 'Invalid date format. Use E.G "YYYY-MM-DD".');
        }

        // Normalize both dates to midnight UTC for comparison
        const normalizedCurrentDate = new Date(Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate(),
        0, 0, 0, 0
        ));

        const normalizedProvidedDate = new Date(Date.UTC(
        providedDate.getUTCFullYear(),
        providedDate.getUTCMonth(),
        providedDate.getUTCDate(),
        0, 0, 0, 0
        ));

        if (normalizedProvidedDate < normalizedCurrentDate) {
        return sendResponse(res, 400, false, 'The date cannot be in the past.');
        }

        scheduledTimeData = {
            day, time, date
        }
    }
    try {
        let image
        if(cmsImage){
            image = await uploadFile(req.files.cmsImage[0], 'cms-image')
        }
        const updateCms = await CmsModel.findById({ _id: _id });

        if (!updateCms) {
            return sendResponse(res, 404, false, 'No CMS found with this ID')
        }

        const editCms = await CmsModel.findByIdAndUpdate(
            _id,
            {
                title,
                message,
                image: image ? image : updateCms?.image,
                url,
                caption,
                redirection,
                status,
                type,
                scheduled: scheduled === true || status.toLowerCase() === 'scheduled' ? true : false,
                accountType,
                allUsers: accountType ? false : true,
                users: users?.length > 0 ? users : updateCms?.users ,
            },
            { new: true }
        );
        await editCms.save()

        if(status.toLowerCase() === 'scheduled' || scheduled && scheduled === true){
            //replace the only existing object in the arra
            updateCms.scheduledDate = [];
            await updateCms.save();
            updateCms.scheduledDate.push(scheduledTimeData);
        } else{
            updateCms.scheduledDate = [];
        }

        // Update the CMS document
        await updateCms.save();

                //send mail notifications
                if(updateCms.status === 'published' && updateCms.type === 'mail'){
                    //send mail notifications
                    let recipients = [];
                    if (accountType === 'driver') {
                        const drivers = await DriverModel.find({}, 'email firstName lastName'); // Fetch emails and names
                        recipients = drivers.map(driver => ({ email: driver.email, name: `${driver.firstName} ${driver.lastName}` || '' }));
                    } else if (accountType === 'passenger') {
                        const passenger = await PassengerModel.find({}, 'email firstName lastName'); // Fetch emails and names
                        recipients = passenger.map(passenger => ({ email: passenger.email, name: `${passenger.firstName} ${passenger.lastName}` || '' }));
                    } else if (accountType === 'admin') {
                        const admin = await AdminUserModel.find({}, 'email firstName lastName'); // Fetch emails and names
                        recipients = admin.map(admin => ({ email: admin.email, name: `${admin.firstName} ${admin.lastName}` || '' }));
                    } else if (!accountType || newCms?.allUsers === true) {
                        const drivers = await DriverModel.find({}, 'email firstName lastName');
                        const passenger = await PassengerModel.find({}, 'email firstName lastName');
                        const admin = await AdminUserModel.find({}, 'email firstName lastName');
                        recipients = [
                            ...drivers.map(driver => ({ email: driver.email, name: `${driver.firstName} ${driver.lastName}` || '' })),
                            ...passenger.map(passenger => ({ email: passenger.email, name: `${passenger.firstName} ${passenger.lastName}` || '' })),
                            ...admin.map(admin => ({ email: admin.email, name: `${admin.firstName} ${admin.lastName}` || '' })),
                        ];
                    } else if (users?.lenght > 1) {
                        recipients = users.map(email => ({ email, name: '' })); // Use custom emails
                    }
        
                    // Send emails
                    for (const recipient of recipients) {
                        sendCMSEmail({
                            email: recipient?.email,
                            name: recipient?.name,
                            content: message,
                            image: image ? image : '',
                            title
                        })
                    }
                }

        //send push notification
        if(updateCms.status === 'published' && updateCms.type === 'pushnotification' || type === 'inappandpushnotification' ){
            const cmsId = updateCms._id; // CMS ID
            const sendPushNotification = await sendNotificationById(cmsId);
            console.log(sendPushNotification);
        }
        
        sendResponse(res, 201, false, 'CMS message updated successfully')
    } catch (error) {
        console.log('UNABLE TO UPDATE NEW CMS MESSAGE', error);
        sendResponse(res, 500, false, 'Unable to update a new CMS message')
    }
}

//GET ALL CMS
export async function getAllCms(req, res) {
    const { limit = 10, page = 1, status } = req.query
    try {
        const pageNumber = Number(page)
        const limitNumber = Number(limit)
        const query = {}

        if(status && status.toLowerCase()=== 'draft'){
            query.status = 'draft'
        }
        if(status && status.toLowerCase()=== 'scheduled'){
            query.status = 'scheduled'
        }        
        if(status && status.toLowerCase()=== 'published'){
            query.status = 'published'
        }

        const skip = (pageNumber -1) * limitNumber;

        const data = await CmsModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)

        const totalData = await CmsModel.countDocuments(query)

        sendResponse(
            res,
            200,
            true,
            {
                data,
                totalData,
                totalPages: Math.ceil(totalData / limitNumber),
                currentPage: pageNumber
            },
            'CMS Data fetched successful'
        )
    } catch (error) {
        console.log('UNABLE TO GET ALL CMS DATA', error)
        res.status(500).json({ success: false, data: 'Unable to get CMS data' })
    }
}

//GET CMS
export async function getACms(req, res) {
    const { cmsId } = req.params
    if(!cmsId){
        return sendResponse(res, 400, false, 'Provide a cms Id')
    }
    try {
        const getCms = await CmsModel.findById({ _id: cmsId })
        if(!getCms){
            return sendResponse(res, 404, false, 'Cms data with this Id not found')
        }

        sendResponse(res, 200, true, getCms)
    } catch (error) {
        console.log('UNABLE TO GET CMS', error)
        sendResponse(res, 500, false, 'Unable to get cms')
    }
}

//DELETE CMS
export async function deleteCms(req, res) {
    const { cmsId } = req.body
    if(!cmsId){
        return sendResponse(res, 400, false, 'Provide a cms Id')
    }
    try {
        const getCms = await CmsModel.findById({ _id: cmsId })
        if(!getCms){
            return sendResponse(res, 404, false, 'Cms data with this Id not found')
        }
        const deleteCmsData = await CmsModel.findByIdAndDelete({ _id: cmsId })

        sendResponse(res, 200, true, 'Cms Data deleted')
    } catch (error) {
        console.log('UNABLE TO GET CMS', error)
        sendResponse(res, 500, false, 'Unable to get cms')
    }
}