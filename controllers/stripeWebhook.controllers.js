import Stripe from 'stripe';

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

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
    
        console.log('Payment Success:', paymentIntent, paymentIntent.id);
        
        // Update the user’s wallet balance in your database
        //await PaymentIntentModel.findOneAndUpdate(
        //  { paymentId: paymentIntent.id },
        //  { status: 'completed' }
        //);
    
        return res.status(200).send('Payment processed');
    }

    if (event.type === 'payment_intent.payment_failed') {

        return res.status(200).send('Payment failed');
    }

    if (event.type === 'payment_intent.processing') {

        return res.status(200).send('Payment processing');
    }

    if (event.type === 'payment_intent.requires_action') {

        return res.status(200).send('Payment requires action');
    }

    
      res.status(400).end();
}