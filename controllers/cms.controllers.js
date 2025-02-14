import { sendCMSEmail } from "../middlewares/mailTemplate.js.js"
import { sendNotificationById, sendResponse, uploadFile } from "../middlewares/utils.js"
import AdminUserModel from "../model/Admin"
import CmsModel from "../model/Cms.js"
import DriverModel from "../model/Driver"
import PassengerModel from "../model/Passenger"

//CREATE NEW CMS
export async function newCms(req, res) {
    const { title, message, url, caption, redirection, status, type, scheduled, scheduledDate, accountType, users } = req.body
    const { cmsImage } = req.files
    const { firstName, lastName, adminId } =  req.admin
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
    const { day, time, date } = scheduledDate || {}
    let scheduledTimeData 
    if(scheduled && scheduled === true){
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
        const providedDate = new Date(date);

        // Check if the date format is valid and not in the past
        if (isNaN(providedDate.getTime())) {
            return sendResponse(res, 400, false, 'Invalid date format. Use E.G "YYYY-MM-DD".')
        }

        if (providedDate.setHours(0, 0, 0, 0) < currentDate.setHours(0, 0, 0, 0)) {
            return sendResponse(res, 400, false, 'The date cannot be in the past.')
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
                    ...admin.map(organization => ({ email: organization.email, name: `${organization.firstName} ${organization.lastName}` || '' })),
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


        return res.status(201).json({ success: true, data: 'CMS message created successfully' });
    } catch (error) {
        console.log('UNABLE TO CREATE NEW CMS MESSAGE', error);
        res.status(500).json({ success: false, data: 'Unable to create a new CMS message' });
    }
}

//UPDATE CMS
export async function updateCms(req, res) {
    const { _id, title, message, type, status, image, scheduled, url, caption, users, allUsers, accountType } = req.body;
    try {
        const updateCms = await CmsModel.findById({ _id: _id });

        if (!updateCms) {
            return res.status(404).json({ success: false, data: 'No CMS found with this ID' });
        }

        const editCms = await CmsModel.findByIdAndUpdate(
            _id,
            {
                title,
                message,
                type,
                status,
                image,
                scheduled,
                accountType,
                users: accountType !== 'custom' ? [] : users?.length > 0 ? users : updateCms?.users ,
                allUsers,
                url,
                caption
            },
            { new: true }
        );
        await editCms.save()
        const timeData = req.body.scheduledDate[0]
        console.log('object', editCms?.type)
        
        if (status === "Scheduled") {
            const { day, time, date } = timeData
            if (!editCms.scheduledDate[0].day) {
                return res.status(400).json({ success: false, data: 'Provide day' });
            }

            if (!editCms.scheduledDate[0].time) {
                return res.status(400).json({ success: false, data: 'Provide time' });
            }

            // Validate time format
            const timeRegex = /^([0-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/;
            if (!timeRegex.test(time)) {
                return res.status(400).json({ success: false, data: 'Invalid time format. Use E.G "09:15 AM" or "12:00 PM" format' });
            }

            // Validate day of the week
            const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            if (!validDays.includes(day)) {
                return res.status(400).json({ success: false, data: 'Invalid day format. Use full day names, e.g., "Monday", "Tuesday".' });
            }

            // Validate date format
            if (!editCms.scheduledDate[0].date) {
                return res.status(400).json({ success: false, data: 'Provide a date' });
            }

            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date)) {
                return res.status(400).json({ success: false, data: 'Invalid date format. Use E.G "YYYY-MM-DD".' });
            }

            // Parse and validate the provided date
            const currentDate = new Date();
            const providedDate = new Date(date);

            // Check if the date is a valid calendar date and not in the past
            if (isNaN(providedDate.getTime())) {
                return res.status(400).json({ success: false, data: 'Invalid date format. Ensure it is a valid calendar date.' });
            }

            if (providedDate.setHours(0, 0, 0, 0) < currentDate.setHours(0, 0, 0, 0)) {
                return res.status(400).json({ success: false, data: 'The date cannot be in the past.' });
            }

            // Update the first object in the scheduledDate array
            if (updateCms.scheduledDate && updateCms.scheduledDate.length > 0) {
                updateCms.scheduledDate[0] = { day, time, date };
            } else {
                updateCms.scheduledDate = [{ day, time, date }];
            }
        }

        // Update the CMS document
        await updateCms.save();

                //send mail notifications
                if(updateCms?.status === 'Published' && updateCms?.type === 'promotionalmail'){
                    //send mail notifications
                    let recipients = [];
                    if (updateCms?.accountType === 'student') {
                        const students = await StudentModel.find({}, 'email name'); // Fetch emails and names
                        recipients = students.map(student => ({ email: student.email, name: student.name || '' }));
                    } else if (updateCms?.accountType === 'instructor') {
                        const instructors = await InstructorModel.find({}, 'email name'); // Fetch emails and names
                        recipients = instructors.map(instructor => ({ email: instructor.email, name: instructor.name || '' }));
                    } else if (updateCms?.accountType === 'organization') {
                        const instructors = await organizationModel.find({}, 'email name'); // Fetch emails and names
                        recipients = instructors.map(instructor => ({ email: instructor.email, name: instructor.name || '' }));
                    } else if (updateCms?.accountType === 'allUsers') {
                        const students = await StudentModel.find({}, 'email name');
                        const instructors = await InstructorModel.find({}, 'email name');
                        const organizations = await organizationModel.find({}, 'email name');
                        recipients = [
                            ...students.map(student => ({ email: student.email, name: student.name || '' })),
                            ...instructors.map(instructor => ({ email: instructor.email, name: instructor.name || '' })),
                            ...organizations.map(organization => ({ email: organization.email, name: organization.name || '' })),
                        ];
                    } else if (updateCms?.accountType === 'custom') {
                        recipients = editCms?.users.map(email => ({ email, name: '' })); // Use custom emails
                    }
        
                    // Send emails
                    const emailLogoUrl = 'https://i.ibb.co/Yf12g4d/logo.png'; // Replace with your logo URL
                    const twUrl = 'https://i.ibb.co/TrkW705/Vector.png'; //
                    const fbUrl = 'https://i.ibb.co/Qd51cS7/Vector.png'; //
                    const igUrl = 'https://i.ibb.co/BwXQBCr/Social-icon.png'; //
                    const currentYear = new Date().getFullYear();
                    console.log('editCms',editCms)
                    for (const recipient of recipients) {
                        const emailContent = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                                <div style="display: flex; align-items: left; margin-bottom: 20px;">
                                    <img src="${emailLogoUrl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
                                </div>
                                <br />
                                <p>Hi ${recipient.name || ''},</p>
                                ${editCms?.caption && `<p style="font-size: 19px; color: #00BF63;">${editCms?.caption}</p>`}
                                <br />
                                <p style="color: #344054; font-size: 17px;">${editCms?.message}</p>
                                ${editCms?.image ? `<div><img src="${editCms?.image}" alt="Promotional Image" style="max-width: 100%; height: auto; margin-top: 20px;"></div>` : ''}
                                <br />
                                ${editCms?.url && `<a href=${editCms?.url} style="background-color: #00BF63; color: #fff; width: 100% border-radius: 10px; padding: 16px; text-decoration: none;">Visit</a>`}
                                <footer style="margin-top: 20px; font-size: 12px; color: #344054;">
                                    <p style="text-decoration: none; color: #344054;">This email was sent to <span style="color: #00BF63;">${recipient.email}</span>. If you'd rather not receive this kind of email, you can <span style="color: #00BF63;" >unsubscribe</span> or <span style="color: #00BF63;">manage your email preferences.</span></p>
                                    <p>© ${currentYear} EduAfrica</p>
                                    <div style="width: 100%; display: flex; align-items: center; justify-content: space-between; margin-top: 20px;">
                                        <img src="${emailLogoUrl}" alt="Logo" style="width: 100px; height: auto;">
                                        <div style="display: flex; align-items: center; flex-direction: row; gap: 8px;>
                                            <img src="${twUrl}" alt="Social Media Icons" style="width: 20px; height: auto;">
                                            <img src="${fbUrl}" alt="Social Media Icons" style="width: 20px; height: auto;">
                                            <img src="${igUrl}" alt="Social Media Icons" style="width: 20px; height: auto;">
                                        </div>
                                    </div>
                                </footer>
                            </div>
                        `;
            
                        // Send email
                        sendEmail({
                            to: recipient.email,
                            subject: title,
                            text: emailContent,
                        });
                    }
                }

        //send push notification
        if(updateCms.status === 'Published' && updateCms.type === 'pushnotification'){
            const cmsId = updateCms._id; // CMS ID
            const sendPushNotification = await sendNotificationById(cmsId);
            console.log('sendPushNotification data', sendPushNotification);
        }
        

        return res.status(201).json({ success: true, data: 'CMS message updated successfully' });
    } catch (error) {
        console.log('UNABLE TO UPDATE NEW CMS MESSAGE', error);
        res.status(500).json({ success: false, data: 'Unable to update a new CMS message' });
    }
}