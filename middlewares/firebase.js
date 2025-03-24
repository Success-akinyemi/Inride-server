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


const testNotification3 = async () => {
  const testToken = "d_N-qoR6TrOnhx-ZRRGdBq:APA91bEB-vhnNlQtSLRv6HkOL-BaL6xMNRGU6cw7hc29944uPHSbkIh4M7uED-uKPICL63PyVaz4ZvhOlKIOQOCYgvXzJuV-LvqulLHjIx2aqUPGUQ7QkcY";

  const payload = {
      notification: {
          title: "Test Notification from RideFuze",
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

testNotification3();
 

export default admin;