import Stripe from 'stripe';
import PaymentIntentModel from '../model/PaymentIntents.js';
import PassengerModel from '../model/Passenger.js';
import NotificationModel from '../model/Notifications.js';

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