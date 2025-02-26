import Stripe from 'stripe';
import PaymentIntentModel from '../model/PaymentIntents.js';
import PassengerModel from '../model/Passenger.js';
import NotificationModel from '../model/Notifications.js';
import { sendNotificationToAccount } from './pushNotification.controllers.js';
import RideModel from '../model/Rides.js';
import DriverModel from '../model/Driver.js';
import PendingEditRideRequestModel from '../model/PendingEditRide.js';
import DriverLocationModel from '../model/DriverLocation.js';
import RideTransactionModel from '../model/RideTransactions.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); 

export async function stripeWebHook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        console.error('Webhook signature verification failed.', error);
        return res.status(400).send('Webhook Error');
    }

    const paymentIntent = event.data.object;
    if (event.type === 'payment_intent.succeeded') {
    
        console.log('Payment Success:', paymentIntent, paymentIntent.id);
        const paidAmount = paymentIntent.amount / 100;

        // Update the user’s wallet balance in your database
        const findPayment = await PaymentIntentModel.findOne({ paymentId: paymentIntent.id });
        if(!findPayment) {
            return res.status(404).send('Payment not found');
        }
        await PaymentIntentModel.findOneAndUpdate(
          { paymentId: paymentIntent.id },
          { 
            status: 'Successful',
            amount: paidAmount
          }
        );

        //Handle payment for booking
        if(findPayment.paymentfor === 'ridebooking'){
            const getRide = await RideModel.findOne({ rideId: findPayment.rideId })
            const getPendingRide = await PendingEditRideRequestModel.findOne({ rideId: findPayment.rideId })
            const getDriver = await DriverModel.findOne({ driverId: getRide.driverId })
            const getDriverLocation = await DriverLocationModel.findOne({ driverId: getRide.driverId })

            //update ride
            getRide.status = 'Active'
            getRide.paid = true
            getRide.paymentMethod = 'Direct'
            if(getPendingRide) getRide.charge += getPendingRide?.price
            await getRide.save()

            //update driver
            getDriver.status = 'busy'
            getDriver.activeRide = getRide.rideId
            await getDriver.save()
            getDriverLocation.status = 'busy'
            getDriverLocation.isActive = false
            await getDriverLocation.save()
            
            //new payment transaction
            const newPayment = await RideTransactionModel.create({
                rideId: getRide.rideId,
                driverId: getRide.driverId,
                amount: getRide.price,
                payableAmount: Number(0.7 * Number(getRide.price)),
                status: 'Successful'
            })

            //new notification for passenger
            await NotificationModel.create({
                accountId: getRide.passengerId,
                message: `Ride: ${getRide.rideId} has been paid for and it is now active`
            })

            //new notification for driver
            await NotificationModel.create({
                accountId: getRide?.driverId,
                message: `Ride: ${getRide.rideId} has been paid for and it is now active`
            })

            //push notification to driver
            try {
                sendNotificationToAccount({
                  accountId: getRide.passengerId,
                  message: 'Payment succesful ride has been activated',
                })
        
              } catch (error) {
                console.log('UNABLE SNED NOTIFICATION', error)
              }
              try {
                sendNotificationToAccount({
                  accountId: getRide?.driverId,
                  message: `New ${getRide?.rideType === 'schedule' && 'Scheduled'} ride has been activated. ${getRide?.rideType === 'schedule' && `This ride ride has been scheduled to the pickup time.`}`,
                })
                
              } catch (error) {
                console.log('UNABLE SEND NOTIFICATION DRIVER', error)
              }
              
              return res.status(200).send('Payment processed');
        }

        //get user
        const user = await PassengerModel.findOne({ passengerId: findPayment.accountId });
        if(!user) {
            return res.status(404).send('User not found');
        }
        console.log('BEFORE', user.wallet)
        //update user wallet
        user.wallet = Number((user.wallet + paidAmount).toFixed(2));
        
        await user.save();
        console.log('AFTER', user.wallet)

        //new notification
        await NotificationModel.create({
            accountId: findPayment.accountId,
            message: `You account has been successfully credited with $${paidAmount}`
        })

        //Push notification
        try {
            sendNotificationToAccount({
                accountId: findPayment.accountId,
                title: 'RideFuze Funding',
                message: `You account has been successfully credited with $${paidAmount}`
            })
        } catch (error) {
            console.log('UNABLE TO SEND FUNDING NOTIFICATION', error)
        }
        return res.status(200).send('Payment processed');
    }

    if (event.type === 'payment_intent.payment_failed') {
        const findPayment = await PaymentIntentModel.findOne({ paymentId: paymentIntent.id });
        if(!findPayment) {
            return res.status(404).send('Payment not found');
        }
        await PaymentIntentModel.findOneAndUpdate(
            { paymentId: paymentIntent.id },
            { status: 'Failed' }
          );

        //new notification
        await NotificationModel.create({
            accountId: findPayment.accountId,
            message: `Payment of $${findPayment.amount} failed`
        })

        return res.status(200).send('Payment failed');
    }

    if (event.type === 'payment_intent.processing') {
        const findPayment = await PaymentIntentModel.findOne({ paymentId: paymentIntent.id });
        if(!findPayment) {
            return res.status(404).send('Payment not found');
        }
        await PaymentIntentModel.findOneAndUpdate(
            { paymentId: paymentIntent.id },
            { status: 'Processing' }
          );
        return res.status(200).send('Payment processing');
    }

    if (event.type === 'payment_intent.requires_action') {

        return res.status(200).send('Payment requires action');
    }

    
      res.status(400).end();
}