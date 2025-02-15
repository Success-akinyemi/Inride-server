import CmsModel from "../model/Cms.js";
import OtpModel from "../model/Otp.js";
import PassengerModel from "../model/Passenger.js";
import AWS from 'aws-sdk';
import crypto from 'crypto';
import webpush from 'web-push';
import PushNotificationModel from "../model/PushNotifications.js";
import Stripe from 'stripe';
import PaymentIntentModel from "../model/PaymentIntents.js";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); 

const apiKeys = {
  publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
  privateKey: process.env.WEB_PUSH_PRIVATE_KEY
}

webpush.setVapidDetails(
  `mailto:${process.env.NODEMAILER_USER}`,
  apiKeys.publicKey,
  apiKeys.privateKey
)

// Set up AWS S3 bucket configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    useAccelerateEndpoint: true,
  });
  //AWS.config.correctClockSkew = true; 
  const bucketName = process.env.AWS_BUCKET_NAME;


  //UPLOAD FILE TO S3
  export async function uploadFile(file, folder) {
    if (!file) {
      throw new Error('No file provided for upload');
    }
    console.log('file upload')
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
  
    const params = {
      Bucket: bucketName,
      Key: fileName, // S3 key includes folder as a prefix
      Body: file.buffer,
      ContentType: file.mimetype || 'image/jpeg',
      //ACL: 'public-read', // Makes the uploaded file publicly accessible
    };
  
    try {
      const data = await s3.upload(params).promise();
      return data.Location; // Returns the full URL of the uploaded file
    } catch (error) {
      console.log('FILE UPLOAD ERROR', error)
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  //UPLOAD BUFFER TO S3
  export async function uploadBufferFile(file, folder) {
    if (!file || !file.buffer) {
      throw new Error('No file or buffer provided for upload');
    }
  
    console.log('Uploading file...');
  
    // Generate a unique file name
    const fileExtension = file.mimetype ? file.mimetype.split('/').pop() : 'bin'; // Default to 'bin' if mimetype is missing
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
  
    // Define the S3 upload parameters
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer, // File buffer
      ContentType: file.mimetype || 'application/octet-stream', // Default MIME type if missing
    };
  
    try {
      // Upload the file to S3
      const data = await s3.upload(params).promise();
      return data.Location; // Return the S3 file URL
    } catch (error) {
      console.error('FILE UPLOAD ERROR', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }  
  
export const sendResponse = (res, statusCode, success, data, message) => {
    return res.status(statusCode).json({ success: success, data: data, message: message ? message : '' });
};

export async function generateOtp(mobileNumber, length, accountType) {
    const deleteOtpCode = await OtpModel.deleteMany({ mobileNumber: mobileNumber })
    const generateOtp = () => {
        const min = Math.pow(10, length - 1);  
        const max = Math.pow(10, length) - 1;         
        const otp = Math.floor(min + Math.random() * (max - min + 1)).toString(); 
        return otp;
    };

    let otp;
    let exists = true;

    while (exists) {
        otp = generateOtp();
        exists = await OtpModel.findOne({ code: otp });
    }

    const otpCode = await OtpModel.create({
        mobileNumber: mobileNumber,
        otp: otp,
        accountType: accountType
    });

    console.log('NEW OTP MODEL', otpCode);

    return otp;
}

export async function generateUniqueCode(length) {
    const userId = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let passengerId = ''; 

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            passengerId += characters[randomIndex]; 
        }

        return passengerId;
    };

    let passengerId;
    let exists = true;

    while (exists) {
        passengerId = userId();
        const existingId = await PassengerModel.findOne({ passengerId: passengerId });
        exists = existingId !== null; 
    }

    return passengerId;
}

export function calculateAverageRating(ratings) {
  // If there are no ratings, return a default value of 0
  if (!ratings || ratings.length === 0) {
    return 0;
  }
  
  // Sum the ratings
  const totalRating = ratings.reduce((sum, rating) => sum + rating.number, 0);
  
  // Calculate the average rating
  const averageRating = totalRating / ratings.length;
  
  // Round to 1 decimal point and ensure it's between 0 and 5
  const roundedRating = Math.min(Math.max(averageRating, 0), 5).toFixed(1);
  
  return parseFloat(roundedRating);
}

// Encryption and decryption helpers
const algorithm = 'aes-256-cbc'; // Encryption algorithm
const key = Buffer.from(process.env.CARD_ENCRYPTION_KEY, 'hex'); // Key from .env (must be 32 bytes)
const iv = crypto.randomBytes(16); // Initialization vector

export function encrypt(text) {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`; // Store IV with encrypted data
}

export function decrypt(encryptedText) {
    const [ivHex, encryptedData] = encryptedText.split(':');
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

//PUSH NOTIFICATION
export async function sendNotificationById(cmsId) {
  try {
      // Find the CMS data by ID
      const cmsData = await CmsModel.findById(cmsId).exec();
      if (!cmsData) {
          console.error(`No CMS data found with ID: ${cmsId}`);
          return { success: false, message: 'CMS data not found.' };
      }

      const { accountType, message, title, allUsers, users, url, image } = cmsData;

      let query = {};

      if (!accountType || allUsers === true) {
          // Send to all users
          query = {};
      } else if (users?.lenght > 1) {
          // Send to users in the CMS users array
          query = { 'user.email': { $in: users } };
      } else {
          // Send to specific account type (driver, passenger, admin)
          query = { 'user.accountType': accountType };
      }

      // Fetch matching subscribers from the PushNotificationModel
      const pushSubscribers = await PushNotificationModel.find(query).exec();

      if (!pushSubscribers.length) {
          console.error('No subscribers found for the specified query.');
          return { success: false, message: 'No subscribers found.' };
      }

      // Send notifications to each subscriber
      for (const subscriber of pushSubscribers) {
          for (const user of subscriber.user) {
              const { email, data } = user;

              // Ensure the subscription object exists
              if (data && data.endpoint) {
                  const notificationPayload = JSON.stringify({
                      title,
                      message,
                      url,   // Optional: Use CMS URL if provided
                      image, // Optional: Use CMS image if provided
                  });

                  try {
                      await webpush.sendNotification(data, notificationPayload);
                      console.log(`Notification sent to ${email}`);
                  } catch (error) {
                      console.error(`Failed to send notification to ${email}`, error);
                  }
              }
          }
      }

      return { success: true, message: 'Notifications sent successfully.' };
  } catch (error) {
      console.error('UNABLE TO SEND NOTIFICATIONS', error);
      return { success: false, message: 'Unable to send push notifications.' };
  }
}

//CREATE STRIPE PAYMENT
export async function initiatePayment({amount, accountId, paymentfor, paymentMethod}) {
  if(paymentMethod){
    if(!Array.isArray(paymentMethod)){
      return { success: false, data: 'Payment method must be an array' }
    }
  }
  if(!accountId){
    return { success: false, data: 'Account Id is required' }
  }
  try {
    const fullAmount = amount * 100

    const paymentIntent = await stripe.paymentIntents.create({
      amount: fullAmount,
      currency: 'usd',
      payment_method_types: paymentMethod ? paymentMethod : ['card']
    })

    //Create payment intent db
    await PaymentIntentModel.create({
      paymentId: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      paymentfor,
      amount,
      accountId,
    })

    return { success: true, data: paymentIntent.client_secret, message: 'Payment intent created' }

  } catch (error) {
    console.log('UANLE TO INITIATE STRIPE PAYMENT', error)
    return { success: false, data: 'Unable to initaite stripe payment'}
  }  
}