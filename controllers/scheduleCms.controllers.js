import { sendCMSEmail } from "../middlewares/mailTemplate.js.js";
import AdminUserModel from "../model/Admin.js";
import CmsModel from "../model/Cms.js";
import DriverModel from "../model/Driver.js";
import NotificationModel from "../model/Notifications.js";
import PassengerModel from "../model/Passenger.js";
import cron from 'node-cron';
import { sendNotificationById } from "./pushNotification.controllers.js";

// Function to check for scheduled emails and send them
async function checkAndSendScheduledEmails() {
    try {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        const currentTime = now.toLocaleTimeString('en-US', { hour12: false }); // Format as HH:mm:ss (24-hour clock)

        // Find all scheduled promotional emails whose time has come
        const scheduledEmails = await CmsModel.find({
            status: 'scheduled',
            type: 'mail',
            scheduledDate: {
                $elemMatch: {
                    date: { $lte: currentDate }, // Date has arrived
                    time: { $lte: currentTime }, // Time has arrived
                },
            },
        });

        console.log(`Found ${scheduledEmails.length} scheduled emails to send.`);

        for (const email of scheduledEmails) {
            const recipients = [];

            // Fetch recipients based on accountType
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

            // Send emails to all recipients
            for (const recipient of recipients) {
                sendCMSEmail({
                    email: recipient?.email,
                    name: recipient?.name,
                    content: email.message,
                    image: email.image ? email.image : '',
                    title: email.title
                })

                console.log(`Email sent to ${recipient.email}`);
            }

            // Update the email status to 'Published'
            email.status = 'published';
            await email.save();
            console.log(`Updated email status to 'Published' for email ID: ${email._id}`);
        }
    } catch (error) {
        console.error('Error checking or sending scheduled emails:', error);
    }
}

// Function to check for scheduled push notification and send them
async function checkAndSendScheduledPushNotification() {
    try {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        const currentTime = now.toLocaleTimeString('en-US', { hour12: false }); // Format as HH:mm:ss (24-hour clock)

        // Find all scheduled promotional emails whose time has come
        const scheduledPushNotifications = await CmsModel.find({
            status: 'scheduled',
            type: { $in: ['pushnotification inappandpushnotification']},
            scheduledDate: {
                $elemMatch: {
                    date: { $lte: currentDate }, // Date has arrived
                    time: { $lte: currentTime }, // Time has arrived
                },
            },
        });

        console.log(`Found ${scheduledPushNotifications.length} scheduled push notification to send.`);

        for (const pushNotification of scheduledPushNotifications) {


        //send push notification
        if(scheduledPushNotifications.status === 'scheduled' && updateCms.type === 'pushnotification' || updateCms.type === 'inappandpushnotification'){
            const cmsId = pushNotification._id; // CMS ID
            const sendPushNotification = await sendNotificationById(cmsId);
            console.log('sendPushNotification data', sendPushNotification);
        }
            // Update the pushNotification status to 'Published'
            pushNotification.status = 'published';
            await pushNotification.save();
            console.log(`Updated push notifications status to 'Published' for notification ID: ${email._id}`);
        }
    } catch (error) {
        console.error('Error checking or sending scheduled push notifications:', error);
    }
}

// Function to check for scheduled in app notifications and send them
async function checkAndSendScheduledInAppNotifications() {
    try {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        const currentTime = now.toLocaleTimeString('en-US', { hour12: false }); // Format as HH:mm:ss (24-hour clock)

        // Find all scheduled promotional emails whose time has come
        const scheduledEmails = await CmsModel.find({
            status: 'scheduled',
            type: 'inapp',
            scheduledDate: {
                $elemMatch: {
                    date: { $lte: currentDate }, // Date has arrived
                    time: { $lte: currentTime }, // Time has arrived
                },
            },
        });

        console.log(`Found ${scheduledEmails.length} scheduled in app notification to send.`);

        for (const email of scheduledEmails) {
            const recipients = [];

            // Fetch recipients based on accountType
            if (accountType === 'driver') {
                const drivers = await DriverModel.find({}, 'driverId firstName lastName'); // Fetch emails and names
                recipients = drivers.map(driver => ({ id: driver.driverId, name: `${driver.firstName} ${driver.lastName}` || '' }));
            } else if (accountType === 'passenger') {
                const passenger = await PassengerModel.find({}, 'passengerId firstName lastName'); // Fetch emails and names
                recipients = passenger.map(passenger => ({ id: passenger.passengerId, name: `${passenger.firstName} ${passenger.lastName}` || '' }));
            } else if (accountType === 'admin') {
                const admin = await AdminUserModel.find({}, 'adminId firstName lastName'); // Fetch emails and names
                recipients = admin.map(admin => ({ id: admin.adminId, name: `${admin.firstName} ${admin.lastName}` || '' }));
            } else if (!accountType || newCms?.allUsers === true) {
                const drivers = await DriverModel.find({}, 'driverId firstName lastName');
                const passenger = await PassengerModel.find({}, 'passengerId firstName lastName');
                const admin = await AdminUserModel.find({}, 'adminId firstName lastName');
                recipients = [
                    ...drivers.map(driver => ({ id: driver.driverId, name: `${driver.firstName} ${driver.lastName}` || '' })),
                    ...passenger.map(passenger => ({ id: passenger.passengerId, name: `${passenger.firstName} ${passenger.lastName}` || '' })),
                    ...admin.map(admin => ({ id: admin.adminId, name: `${admin.firstName} ${admin.lastName}` || '' })),
                ];
            } else if (users?.lenght > 1) {
                recipients = users.map(email => ({ email, name: '' })); // Use custom emails
            }

            // Send emails to all recipients
            for (const recipient of recipients) {
                await NotificationModel.create({
                    accountId: recipient?.id ? recipient.id : recipient.email,
                    message: email.message,
                    image: email.image ? [email.image] : [],
                })

                console.log(`In app notification sent to ${recipient.email}`);
            }

            // Update the email status to 'Published'
            email.status = 'published';
            await email.save();
            console.log(`Updated in app notification status to 'Published' for email ID: ${email._id}`);
        }
    } catch (error) {
        console.error('Error checking or sending scheduled notifications:', error);
    }
}

// Schedule the cron job to run every minute
cron.schedule('* * * * *', checkAndSendScheduledEmails);
cron.schedule('* * * * *', checkAndSendScheduledPushNotification);
cron.schedule('* * * * *', checkAndSendScheduledInAppNotifications);
