import React, { useState } from 'react';
import { RazorpayPayment } from '../components/RazorpayPayment';

const CheckoutPage: React.FC = () => {
  const [amount, setAmount] = useState(1000); // Amount in INR
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSuccess = (response: any) => {
    setPaymentStatus(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
    setError('');
    // Here you can make an API call to your backend to update the payment status
  };

  const handleError = (error: any) => {
    setError(`Payment Failed: ${error.message}`);
    setPaymentStatus('');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (INR)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            min="1"
          />
        </div>

        <div className="mb-6">
          <RazorpayPayment
            amount={amount}
            onSuccess={handleSuccess}
            onError={handleError}
            customerDetails={{
              name: 'John Doe',
              email: 'john@example.com',
              contact: '9876543210'
            }}
          />
        </div>

        {paymentStatus && (
          <div className="p-4 bg-green-100 text-green-700 rounded-md mb-4">
            {paymentStatus}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-md mb-4">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage; 