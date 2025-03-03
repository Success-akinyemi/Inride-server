import { sendResponse } from '../middlewares/utils.js';
import PushNotificationModel from '../model/PushNotifications.js';
import CmsModel from '../model/Cms.js';
import admin from '../middlewares/firebase.js';
import EmailSubscriberModel from '../model/EmailSubscribers.js';

//save data for push notification
export async function saveSubscription(req, res) {
    const { email, accountId, accountType, data } = req.body;

    // Validate required fields
    if (!email) {
        return sendResponse(res, 400, false, 'Email address is required')
    }
    if (!accountType) {
        return sendResponse(res, 400, false, 'User account type is required');
    }
    if(!['passenger', 'driver'].includes(accountType)){
        return sendResponse(res, 400, false, 'Account type is either passenger or dirver')
    }
    if(!accountId){
        return sendResponse(res, 400, false, 'Account Id is required')
    }
    if(!data){
        return sendResponse(res, 400, false, 'Data token is required')
    }

    try {
        // Find or create the document
        let pushNotificationDoc = await PushNotificationModel.findOne({ accountId });
        if (pushNotificationDoc) {
            await PushNotificationModel.findOneAndUpdate(
                {accountId},
                {
                    email,
                    data,
                    accountType
                }
            )
            return sendResponse(res, 201, true, 'Subscription saved')
        }

        // Save the updated document
        await PushNotificationModel.create({
            email,
            data,
            accountId,
            accountType
        });

        //TEST NOTIFICATION
        const image = 'https://i.ibb.co/HtNmMC5/Group-625936.png'; 
        const notificationPayload = {
            notification: {
                title: "NEW SUBSCRIPTION",
                body: 'Welcome to RideFuze',
                image, // Fixed image URL
            },
            token: data.deviceToken
        };

        try {
            // Send the notification using FCM
            await admin.messaging().send(notificationPayload);
            console.log(`Notification sent to ${email}`);
        } catch (error) {
            console.error(`Failed to send notification to ${email}`, error);
        }

        sendResponse(res, 201, true, 'Subscription saved')
    } catch (error) {
        console.error('UNABLE TO SAVE SUBSCRIPTION', error);
        return sendResponse(res, 500, false, 'Unable to save subscription request')
    }
}

//save data for email notification
export async function subscribeEmail(req, res) {
    const { email } = req.body
    const { passengerId, firstName: passengerFirstName, lastName: passengerLastName } = req.user
    const { driverId, firstName: driverFirstName, lastName: driverLastName } = req.user
    const firstName = passengerFirstName || driverFirstName
    const lastName = passengerLastName || driverLastName
    if(!email){
        sendResponse(res, 400, false, 'Email address is required')
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return sendResponse(res, 400, false, `Invalid Email Address`);
    try {
        const newSubscriber = EmailSubscriberModel.create({
            accountId: passengerId || driverId,
            email,
            accountType: passengerId ? 'passenger' : 'driver',
            firstName, 
            lastName
        })

        sendResponse(res, 201, true, 'Subscription scuccessful')
    } catch (error) {
        console.log('UNABLE TO SUBSCRIBE USER EMAIL', error)
        sendResponse(res, 500, false, 'Unable to save mail notifications')
    }
}

export async function sendNotificationById(cmsId) {
    try {
        // Find the CMS data by ID
        const cmsData = await CmsModel.findById(cmsId).exec();
        if (!cmsData) {
            console.error(`No CMS data found with ID: ${cmsId}`);
            return { success: false, message: 'CMS data not found.' };
        }

        const { accountType, message, title, allUsers, users, url, image } = cmsData;

        // Build the query based on accountType
        let query = {};
        if (accountType === 'allUser') {
            // Send to all users
            query = {};
        } else if (accountType === 'custom') {
            // Send to specific users in the CMS users array
            query = { email: { $in: users } };
        } else {
            // Send to specific account type (e.g., passenger, driver)
            query = { accountType };
        }

        // Fetch matching subscribers from the PushNotificationModel
        const pushSubscribers = await PushNotificationModel.find(query).exec();

        if (!pushSubscribers.length) {
            console.error('No subscribers found for the specified query.');
            return { success: false, message: 'No subscribers found.' };
        }

        // Prepare the notification payload for FCM
        const notificationPayload = {
            notification: {
                title,
                body: message,
                image, // Optional: Include image if provided
            },
            data: {
                url: url || '', // Optional: Include URL if provided
            },
        };

        // Collect all device tokens
        const deviceTokens = pushSubscribers
            .map(subscriber => subscriber.data.deviceToken) // Extract device tokens
            .filter(token => token); // Filter out invalid or empty tokens

        if (deviceTokens.length === 0) {
            console.error('No valid device tokens found.');
            return { success: false, message: 'No valid device tokens found.' };
        }

        // Send notifications to all subscribers
        try {
            const multicastMessage = {
                tokens: deviceTokens, // Array of device tokens
                notification: notificationPayload.notification,
                data: notificationPayload.data,
            };

            // Use sendEachForMulticast to send notifications to multiple devices
            const response = await admin.messaging().sendEachForMulticast(multicastMessage);
            console.log(`Successfully sent notifications: ${response.successCount} successful, ${response.failureCount} failed.`);

            if (response.failureCount > 0) {
                response.responses.forEach((resp, index) => {
                    if (!resp.success) {
                        console.error(`Failed to send notification to ${pushSubscribers[index].email}:`, resp.error);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to send notifications:', error);
            return { success: false, message: 'Failed to send notifications.' };
        }

        // Update the CMS status to "published"
        await CmsModel.findByIdAndUpdate(cmsId, { status: 'published' });

        return { success: true, message: 'Notifications sent successfully and CMS status updated to published.' };
    } catch (error) {
        console.error('UNABLE TO SEND NOTIFICATIONS:', error);
        return { success: false, message: 'Unable to send push notifications.' };
    }
}

/**
 export async function sendNotificationById(cmsId) {
     try {
         // Find the CMS data by ID
         const cmsData = await CmsModel.findById(cmsId).exec();
         if (!cmsData) {
             console.error(`No CMS data found with ID: ${cmsId}`);
             return { success: false, message: 'CMS data not found.' };
         }
 
         const { accountType, message, title, allUsers, users, url, image } = cmsData;
 
         // Build the query based on accountType
         let query = {};
         if (accountType === 'allUser') {
             // Send to all users
             query = {};
         } else if (accountType === 'custom') {
             // Send to specific users in the CMS users array
             query = { email: { $in: users } };
         } else {
             // Send to specific account type (e.g., passenger, driver)
             query = { accountType };
         }
 
         // Fetch matching subscribers from the PushNotificationModel
         const pushSubscribers = await PushNotificationModel.find(query).exec();
 
         if (!pushSubscribers.length) {
             console.error('No subscribers found for the specified query.');
             return { success: false, message: 'No subscribers found.' };
         }
 
         // Prepare the notification payload for FCM
         const notificationPayload = {
             notification: {
                 title,
                 body: message,
                 image, // Optional: Include image if provided
             },
             data: {
                 url: url || '', // Optional: Include URL if provided
             },
         };
 
         // Send notifications to each subscriber
         for (const subscriber of pushSubscribers) {
             const { data } = subscriber;
 
             // Ensure the device token exists
             if (data) {
                 try {
                     // Send the notification using FCM
                     await admin.messaging().sendToDevice(data, notificationPayload);
                     console.log(`Notification sent to ${subscriber.email}`);
                 } catch (error) {
                     console.error(`Failed to send notification to ${subscriber.email}`, error);
                 }
             }
         }
 
         // Update the CMS status to "published"
         await CmsModel.findByIdAndUpdate(cmsId, { status: 'published' });
 
         return { success: true, message: 'Notifications sent successfully and CMS status updated to published.' };
     } catch (error) {
         console.error('UNABLE TO SEND NOTIFICATIONS:', error);
         return { success: false, message: 'Unable to send push notifications.' };
     }
 }
 */

/**
 export async function sendNotificationToAccount({accountId, title, message, url}) {
     try {
         // Fixed image URL
         const image = 'https://i.ibb.co/HtNmMC5/Group-625936.png'; 
 
         // Find the subscriber by accountId
         const subscriber = await PushNotificationModel.findOne({ accountId }).exec();
         if (!subscriber) {
             console.error(`No subscriber found with accountId: ${accountId}`);
             return { success: false, message: 'Subscriber not found.' };
         }
 
         // Prepare the notification payload for FCM
         const notificationPayload = {
             notification: {
                 title: title || 'RideFuze',
                 body: message,
                 image, // Fixed image URL
             },
             data: {
                 url: url || '', // Optional: Include URL if needed
             },
         };
 
         // Ensure the device token exists
         const { data } = subscriber;
         if (data) {
             try {
                 // Send the notification using FCM
                 await admin.messaging().sendToDevice(data, notificationPayload);
                 console.log(`Notification sent to ${subscriber.email}`);
                 return { success: true, message: 'Notification sent successfully.' };
             } catch (error) {
                 console.error(`Failed to send notification to ${subscriber.email}`, error);
                 return { success: false, message: 'Failed to send notification.' };
             }
         } else {
             console.error(`No device token found for subscriber: ${subscriber.email}`);
             return { success: false, message: 'No device token found.' };
         }
     } catch (error) {
         console.error('UNABLE TO SEND NOTIFICATION:', error);
         return { success: false, message: 'Unable to send notification.' };
     }
 }
 */

 export async function sendNotificationToAccount({ accountId, title, message, url }) {
    try {
        const image = 'https://i.ibb.co/HtNmMC5/Group-625936.png';

        const subscriber = await PushNotificationModel.findOne({ accountId }).exec();
        if (!subscriber) {
            console.error(`No subscriber found with accountId: ${accountId}`);
            return { success: false, message: 'Subscriber not found.' };
        }

        const { data } = subscriber;
        if (!data) {
            console.error(`No device token found for subscriber: ${subscriber.email}`);
            return { success: false, message: 'No device token found.' };
        }

        const notificationPayload = {
            notification: {
                title: title || 'RideFuze',
                body: message,
                image,
            },
            data: {
                url: url || '',
            },
            token: data.deviceToken, // Use the device token directly
        };

        try {
            await admin.messaging().send(notificationPayload);
            console.log(`Notification sent to ${subscriber.email}`);
            return { success: true, message: 'Notification sent successfully.' };
        } catch (error) {
            console.error(`Failed to send notification to ${subscriber.email}`, error);
            return { success: false, message: 'Failed to send notification.' };
        }
    } catch (error) {
        console.error('UNABLE TO SEND NOTIFICATION:', error);
        return { success: false, message: 'Unable to send notification.' };
    }
}

export async function getNotification(req, res){
    try {
        const noti = await PushNotificationModel.find();
        res.status(200).json(noti)
    } catch (error) {
        console.log('ERROR', error)
    }
}