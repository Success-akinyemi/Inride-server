import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const StripePayment = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const baseUrl = import.meta.env.VITE_APP_BASE_URL
  console.log('BASE', baseUrl)
  const handlePayment = async () => {
    if (!amount || isNaN(amount) || amount <= 0) {
      alert('Invalid amount. Please enter a valid number.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Request PaymentIntent from Server
      const response = await fetch(`${baseUrl}/passenger/profile/fundWallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();
      if (!data.success) {
        console.log('PAYMENT FAILED SERVER', data)
        alert(`Payment Error: ${data.data}`);
        setLoading(false);
        return;
      }

      const clientSecret = data.data; // Server returns client_secret

      // Step 2: Confirm Payment with Stripe
      const cardElement = elements.getElement(CardElement);
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        console.log('PAYMENT FAILED', error)
        alert(`Payment Failed: ${error.message}`);
      } else if (paymentIntent.status === 'succeeded') {
        alert('Payment Successful! Your wallet will be updated soon.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px', textAlign: 'center' }}>
      <h2>Fund Your Wallet</h2>
      <input
        type="number"
        placeholder="Enter Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          marginBottom: '10px',
          borderRadius: '5px',
          border: '1px solid #ccc',
        }}
      />
      <CardElement style={{ marginBottom: '10px', padding: '10px' }} />
      <button
        onClick={handlePayment}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        {loading ? 'Processing...' : 'Fund Wallet'}
      </button>
    </div>
  );
};

export default StripePayment;
