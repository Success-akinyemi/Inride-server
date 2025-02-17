import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import WalletFundingScreen from './WalletFundingScreen'; // Your main screen

const App = () => {
  return (
    <StripeProvider publishableKey="pk_test_your_stripe_publishable_key">
      <WalletFundingScreen />
    </StripeProvider>
  );
};

export default App;


import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';

const WalletFundingScreen = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!amount || isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Request PaymentIntent from Server
      const response = await fetch(`${baseUrl}/passenger/profile/fundWallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer YOUR_AUTH_TOKEN', // Add if needed
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();
      if (!data.success) {
        Alert.alert('Payment Error', data.message);
        setLoading(false);
        return;
      }

      const clientSecret = data.data; // Server returns client_secret

      // Step 2: Initialize Stripe Payment Sheet
      const { error: sheetError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Your Business Name',
      });

      if (sheetError) {
        Alert.alert('Payment Sheet Error', sheetError.message);
        setLoading(false);
        return;
      }

      // Step 3: Present Stripe Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        Alert.alert('Payment Failed', paymentError.message);
      } else {
        Alert.alert('Payment Successful', 'Your wallet will be updated soon.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Fund Your Wallet</Text>
      <TextInput
        placeholder="Enter Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          marginBottom: 10,
          borderRadius: 5,
        }}
      />
      <Button title={loading ? 'Processing...' : 'Fund Wallet'} onPress={handlePayment} disabled={loading} />
    </View>
  );
};

export default WalletFundingScreen;
