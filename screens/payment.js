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
  BackHandler,
  NativeEventEmitter,
  NativeModules
} from "react-native";
import tw from "twrnc";
import { RAZORPAY_KEY_ID, createRazorpayOrder, verifyPayment } from '../config/razorpay';
import RazorpayService from '../src/services/razorpay.ts';
import RazorpayButton from '../components/RazorpayButton';

let RazorpayCheckout;
let razorpayEvents;
if (Platform.OS === 'android') {
  RazorpayCheckout = require('react-native-razorpay').default;
  razorpayEvents = new NativeEventEmitter(NativeModules.RazorpayEventEmitter);
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
    
    // Add back handler for Android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (loading) {
        return true;
      }
      return false;
    });

    // Setup Razorpay event listeners
    let paymentSuccessListener;
    let paymentErrorListener;
    let externalWalletListener;

    if (Platform.OS === 'android') {
      paymentSuccessListener = razorpayEvents.addListener('Razorpay::PAYMENT_SUCCESS', handlePaymentSuccess);
      paymentErrorListener = razorpayEvents.addListener('Razorpay::PAYMENT_ERROR', handlePaymentError);
      externalWalletListener = razorpayEvents.addListener('Razorpay::EXTERNAL_WALLET_SELECTED', handleExternalWallet);
    }

    return () => {
      backHandler.remove();
      if (Platform.OS === 'android') {
        paymentSuccessListener?.remove();
        paymentErrorListener?.remove();
        externalWalletListener?.remove();
      }
    };
  }, [loading]);

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

  const handleExternalWallet = (data) => {
    console.log('External Wallet Selected:', data);
  };

  const handlePaymentError = async (error) => {
    console.error("Payment error details:", {
      code: error?.code,
      description: error?.description,
      source: error?.source,
      step: error?.step,
      reason: error?.reason,
      metadata: error?.metadata
    });

    let errorMessage = "Unable to process payment. Please try again.";
    if (error?.description) {
      errorMessage = error.description;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    if (error.code !== 0) { // Don't show error for user cancellation
      Alert.alert(
        "Payment Failed",
        errorMessage,
        [{ text: "OK" }]
      );
    }
  };

  const handlePayment = async (packageDetails) => {
    if (loading) return;
  
    setLoading(true);
    const transactionId = generateTransactionId();
  
    try {
      console.log("Initiating payment for package:", packageDetails);
  
      // Create a pending transaction in the database
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
  
      // Create Razorpay order with amount in paise
      const amountInPaise = Math.round(packageDetails.price * 100);
      console.log("Creating Razorpay order with amount (in paise):", amountInPaise);
      
      const orderData = await RazorpayService.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: transactionId,
        notes: {
          credits: packageDetails.credits.toString(),
          user_id: user.id
        }
      });

      if (!orderData?.id) {
        throw new Error("Failed to create Razorpay order: No order ID returned");
      }

      console.log("Order created successfully:", orderData);

      // Initialize payment
      const paymentResponse = await RazorpayService.initiatePayment({
        amount: amountInPaise,
        orderId: orderData.id,
        currency: 'INR',
        description: `${packageDetails.credits} Credits Purchase`,
        email: user.email,
        contact: user.phone,
        name: user.name
      });

      console.log("Payment successful:", paymentResponse);

      // Verify the payment
      const isVerified = await RazorpayService.verifyPayment({
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        transaction_id: transactionId
      });

      if (!isVerified) {
        throw new Error("Payment verification failed");
      }

      // Update payment status
      await supabase
        .from("payments")
        .update({ 
          status: "success",
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          verified: true
        })
        .eq("transaction_id", transactionId);

      // Get current user credits
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Update user credits
      const currentCredits = userData.credits || 0;
      const newTotal = currentCredits + packageDetails.credits;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: newTotal })
        .eq("id", user.id);

      if (updateError) {
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
        `${packageDetails.credits} credits have been added to your account`,
        [{ text: "OK" }]
      );
  
    } catch (error) {
      console.error("Payment error:", error);
      
      // Update payment status to failed
      await supabase
        .from("payments")
        .update({ 
          status: "failed",
          error_description: error.message,
          verified: false
        })
        .eq("transaction_id", transactionId);
      
      Alert.alert(
        "Payment Failed",
        error.message || "Unable to process payment. Please try again.",
        [{ text: "OK" }]
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

      // Verify payment signature
      console.log("Verifying payment signature...");
      const isVerified = await RazorpayService.verifyPayment(paymentData);
      
      if (!isVerified) {
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

  const fetchWithTimeout = async (url, options, timeout = 30000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  };

  const handleSubscriptionSuccess = async (plan) => {
    try {
      setLoading(true);

      // Get the package details based on the plan
      const selectedPackage = creditPackages.find(pkg => pkg.credits === parseInt(plan));
      if (!selectedPackage) {
        throw new Error('Invalid credit package');
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
      const newTotal = currentCredits + selectedPackage.credits;

      // Update user credits
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: newTotal })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating user credits:", updateError);
        throw updateError;
      }

      // Refresh data
      await Promise.all([fetchUserCredits(), fetchTransactions()]);

      Alert.alert(
        "Success",
        `${selectedPackage.credits} credits have been added to your account`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error processing successful payment:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to add credits to your account. Please contact support.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
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
              onPress={() => {
                if (!loading) {
                  handlePayment(pkg);
                }
              }}
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
