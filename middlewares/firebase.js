import admin from 'firebase-admin';
import { config } from 'dotenv';
config()
console.log("Firebase Private Key:", process.env.FIREBASE_PRIVATE_KEY ? "Loaded" : "Not Loaded");

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix newline characters
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};


// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  
  //admin.initializeApp({
  //  credential: admin.credential.cert(serviceAccount),
  //});
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
}

/**
 * 
*/
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
      console.log('SENDING PUSH NOTIFICATION')
      const response = await admin.messaging().send(payload);
      console.log("Test notification sent:", response);
  } catch (error) {
      console.error("Failed to send test notification:", error);
  }
};

testNotification();


import axios from 'axios';

const testFirebaseConnectivity = async () => {
  try {
    console.log('Testing connectivity to Firebase FCM servers...');
    const response = await axios.head('https://fcm.googleapis.com');
    console.log('Connection successful!');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
  } catch (error) {
    console.error('Failed to connect to Firebase FCM servers:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received. Request details:', error.request);
    } else {
      console.error('Error details:', error.message);
    }
  }
};

testFirebaseConnectivity();



export default admin;