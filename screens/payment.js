import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  AppState,
  Platform,
} from "react-native";
import tw from "twrnc";
import { RAZORPAY_KEY_ID, createRazorpayOrder, verifyPayment } from '../config/razorpay';

let RazorpayCheckout;
if (Platform.OS === 'android') {
  RazorpayCheckout = require('react-native-razorpay').default;
}

const creditPackages = [
  {
    credits: 50, // ₹10 worth of credits
    price: 9,
    popular: false,
    discount: false,
    label: "Starter",
  },
  {
    credits: 250, // ₹50 worth of credits at normal price
    price: 29,
    originalPrice: 50,
    popular: true,
    discount: true,
    savings: "₹21",
    label: "Best Value",
  },
  {
    credits: 500, // ₹100 worth of credits at normal price
    price: 99,
    popular: false,
    discount: false,
    label: "Pro Pack",
  },
];

const PaymentManager = ({ user, supabase, credits = 0, fetchUserCredits }) => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error.message);
      setTransactions([]);
    }
  };

  const generateTransactionId = () => {
    return "TXN_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  };

  const handlePayment = async (packageDetails) => {
    if (loading) return;

    setLoading(true);
    const transactionId = generateTransactionId();

    try {
      console.log("Initiating payment for package:", packageDetails);

      // First create a pending transaction in your database
      const { error: paymentInitError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          amount: packageDetails.price,
          credits: packageDetails.credits,
          transaction_id: transactionId,
          status: "pending",
          credits_added: false,
        });

      if (paymentInitError) {
        console.error("Error creating pending transaction:", paymentInitError);
        throw paymentInitError;
      }

      console.log("Creating Razorpay order...");
      const amount = Math.round(packageDetails.price * 100); // Convert to paise and ensure it's an integer
      const orderData = await createRazorpayOrder(amount);
      console.log("Order created successfully:", orderData);

      if (!orderData || !orderData.id) {
        throw new Error('Could not create order');
      }
      
      const options = {
        description: `${packageDetails.credits} Credits Purchase`,
        image: 'YOUR_LOGO_URL',
        currency: 'INR',
        key: RAZORPAY_KEY_ID,
        amount: amount.toString(),
        name: 'Caps.ai',
        order_id: orderData.id,
        prefill: {
          email: user.email || '',
          contact: user.phone || '',
          name: user.name || ''
        },
        theme: { color: '#53a20e' },
        retry: {
          enabled: true,
          max_count: 3
        }
      };

      console.log("Opening Razorpay checkout with options:", options);

      const paymentData = await new Promise((resolve, reject) => {
        RazorpayCheckout.open(options).then((data) => {
          console.log('Payment success:', data);
          resolve(data);
        }).catch((error) => {
          console.error('Payment error:', error);
          reject(error);
        });
      });

      // If we get here, payment was successful
      await handlePaymentSuccess(transactionId, packageDetails.credits, paymentData);

    } catch (error) {
      console.error("Payment error details:", {
        message: error?.message,
        code: error?.code,
        description: error?.description,
        source: error?.source,
        step: error?.step,
        reason: error?.reason,
        metadata: error?.metadata
      });

      await handlePaymentFailure(transactionId, error);

      let errorMessage = "Unable to process payment. Please try again.";
      if (error?.description) {
        errorMessage = error.description;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert(
        "Payment Failed",
        errorMessage,
        [{ text: "OK", onPress: () => console.log("Payment error acknowledged by user") }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (transactionId, creditsToAdd, paymentData) => {
    try {
      console.log("Processing successful payment:", {
        transactionId,
        creditsToAdd,
        paymentData
      });

      // First verify the payment
      console.log("Verifying payment signature...");
      const isVerified = await verifyPayment(paymentData);
      
      if (!isVerified) {
        console.error("Payment verification failed");
        throw new Error("Payment verification failed. Please contact support if amount was deducted.");
      }
      
      console.log("Payment verification successful");

      // Update payment status
      const { error: statusError } = await supabase
        .from("payments")
        .update({ 
          status: "success",
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_signature: paymentData.razorpay_signature,
          verified: true
        })
        .eq("transaction_id", transactionId);

      if (statusError) {
        console.error("Error updating payment status:", statusError);
        throw statusError;
      }

      // Get current user credits
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("Error fetching user credits:", userError);
        throw userError;
      }

      // Calculate and update new credits total
      const currentCredits = userData.credits || 0;
      const newTotal = currentCredits + creditsToAdd;

      console.log("Updating user credits:", {
        currentCredits,
        creditsToAdd,
        newTotal
      });

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: newTotal })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating user credits:", updateError);
        throw updateError;
      }

      // Mark credits as added
      await supabase
        .from("payments")
        .update({ credits_added: true })
        .eq("transaction_id", transactionId);

      // Refresh UI
      await Promise.all([fetchUserCredits(), fetchTransactions()]);

      Alert.alert(
        "Success",
        `${creditsToAdd} credits have been added to your account`,
        [
          {
            text: "OK",
            onPress: () => console.log("Success acknowledged by user")
          }
        ]
      );
    } catch (error) {
      console.error("Error processing successful payment:", error);
      
      // Update payment status to failed if verification fails
      if (error.message.includes("verification failed")) {
        await supabase
          .from("payments")
          .update({ 
            status: "failed",
            error_description: error.message,
            verified: false
          })
          .eq("transaction_id", transactionId);
      }
      
      Alert.alert(
        "Error",
        error.message || "Payment was successful but credits could not be added. Please contact support.",
        [
          {
            text: "OK",
            onPress: () => console.log("Credit addition error acknowledged by user")
          }
        ]
      );
    }
  };

  const handlePaymentFailure = async (transactionId, error) => {
    try {
      console.log("Handling payment failure:", {
        transactionId,
        errorDetails: error
      });

      await supabase
        .from("payments")
        .update({ 
          status: "failed",
          error_code: error?.code,
          error_description: error?.description,
          error_source: error?.source,
          error_step: error?.step,
          error_reason: error?.reason
        })
        .eq("transaction_id", transactionId);
      
      await fetchTransactions();
    } catch (error) {
      console.error("Error handling payment failure:", error);
    }
  };

  return (
    <ScrollView style={tw`flex-1 px-4 py-3`}>
      <View style={tw`bg-white rounded-2xl p-6 shadow-sm mb-6`}>
        <Text style={tw`text-2xl font-bold text-slate-800 text-center mb-2`}>
          {credits}
        </Text>
        <Text style={tw`text-base text-slate-600 text-center`}>
          Available Credits
        </Text>
      </View>

      <Text style={tw`text-lg font-semibold text-slate-800 mb-4`}>
        Buy Credits
      </Text>
      <View style={tw`mb-6`}>
        {creditPackages.map((pkg, index) => {
          // Calculate original price and savings for packages with discount
          const originalPrice = pkg.discount ? pkg.price * 2 : pkg.price;
          const savings = pkg.discount ? originalPrice - pkg.price : 0;

          return (
            <TouchableOpacity
              key={index}
              style={tw`bg-white p-4 rounded-xl shadow-sm m-1 ${
                pkg.popular ? "border-2 border-orange-500" : ""
              }`}
              onPress={() => handlePayment(pkg)}
              disabled={loading}
            >
              <View style={tw`flex-row justify-between items-center`}>
                <View>
                  <Text style={tw`text-lg font-semibold text-slate-800`}>
                    {pkg.credits} Credits
                  </Text> 
                  <View style={tw`flex-row items-center`}>
                    <Text style={tw`text-base text-slate-600`}>
                      ₹{pkg.price}
                    </Text>
                    {pkg.discount && (
                      <Text style={tw`text-sm text-slate-400 line-through ml-2`}>
                        ₹{originalPrice}
                      </Text>
                    )}
                  </View>
                  {pkg.discount && (
                    <Text style={tw`text-sm text-green-600 mt-1`}>
                      Save ₹{savings}!
                    </Text>
                  )}
                </View>

                <View style={tw`flex items-end`}>
                  {pkg.label && (
                    <View style={tw`bg-orange-100 px-3 py-1 rounded-full mb-2`}>
                      <Text style={tw`text-orange-600 font-medium`}>
                       {pkg.label}
                      </Text>
                    </View>
                  )}
                  {pkg.discount && (
                    <View style={tw`bg-orange-100 px-3 py-1 rounded-2xl mt-2`}>
                      <Text style={tw`text-red-600 font-medium`}>50% Off</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={tw`text-lg font-semibold text-slate-800 mb-4`}>
        Transaction History
      </Text>
      <View style={tw``}>
        {transactions.length === 0 ? (
          <Text style={tw`text-slate-500 text-center py-4`}>
            No transactions yet
          </Text>
        ) : (
          transactions.map((transaction) => (
            <View
              key={transaction.id}
              style={tw`bg-white p-4 rounded-xl shadow-sm m-1 `}
            >
              <View style={tw`flex-row justify-between items-center mb-1`}>
                <Text style={tw`text-base font-semibold text-slate-800`}>
                  {transaction.credits} Credits
                </Text>
                <Text
                  style={tw`font-medium ${
                    transaction.status === "success"
                      ? "text-green-600"
                      : transaction.status === "pending"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {transaction.status}
                </Text>
              </View>
              <View style={tw`flex-row justify-between items-center`}>
                <Text style={tw`text-slate-600`}>₹{transaction.amount}</Text>
                <Text style={tw`text-sm text-slate-500`}>
                  {new Date(transaction.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default PaymentManager;
