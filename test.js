import { config } from 'dotenv';
config()
import admin from "./middlewares/firebase.js";

const testNotification = async () => {
    const testToken = "c_uOlwGDQ4OLbu7qXR3aJv:APA91bFFqzCQoTnpv9cifvy8PbVJp4TWR1jxzbyr22uuMY3-wetgK6qhR8hFodyXOvrL9mUsuUDLmw6QejIwXeRjozugc3FlS3qKDz--FckCRVvDC0Nnc18";
    
    const payload = {
        notification: {
            title: "Test Notification RideFuze",
            body: "If you receive this, FCM works!",
        },
        token: testToken
    };

    try {
        const response = await admin.messaging().send(payload);
        console.log("Test notification sent:", response);
    } catch (error) {
        console.error("Failed to send test notification:", error);
    }
};

testNotification();

RFYHRTRXVMDR
RFY0V4BM8SPA
RFSN8K02Z3RI