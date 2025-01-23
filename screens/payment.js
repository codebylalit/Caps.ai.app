import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  AppState,
} from "react-native";
import tw from "twrnc";

const MERCHANT_UPI_ID = "7742056540@axl";

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
  const [currentTransactionId, setCurrentTransactionId] = useState(null);

  useEffect(() => {
    fetchTransactions();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && currentTransactionId) {
        verifyPaymentOnReturn(currentTransactionId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [currentTransactionId]);

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

  const verifyPaymentOnReturn = async (transactionId) => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("transaction_id", transactionId)
        .eq("status", "pending")
        .single();

      if (error || !data) {
        console.log("No pending transaction found:", transactionId);
        return;
      }

      Alert.alert(
        "Payment Verification",
        "Did you complete the payment?",
        [
          {
            text: "No",
            onPress: () => handlePaymentStatus(transactionId, "failed"),
            style: "cancel",
          },
          {
            text: "Yes",
            onPress: () => handlePaymentStatus(transactionId, "success"),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Error verifying payment:", error);
    } finally {
      setCurrentTransactionId(null);
    }
  };

  const initiateUPIPayment = async (packageDetails) => {
    const transactionId = generateTransactionId();
    const transactionNote = `${packageDetails.credits} Credits Purchase`;

    try {
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

      if (paymentInitError) throw paymentInitError;

      const upiUrl = `upi://pay?pa=${MERCHANT_UPI_ID}&pn=Caps%20Ai&tn=${encodeURIComponent(
        transactionNote
      )}&am=${packageDetails.price}&tr=${transactionId}&cu=INR`;

      const canOpen = await Linking.canOpenURL(upiUrl);

      if (!canOpen) {
        throw new Error("No UPI app found");
      }

      return { upiUrl, transactionId };
    } catch (error) {
      console.error("Error creating UPI payment:", error);
      throw error;
    }
  };

 const handlePayment = async (packageDetails) => {
   if (loading) return;

   setLoading(true);
   try {
     // First, cancel any existing pending transactions
     if (currentTransactionId) {
       await supabase
         .from("payments")
         .update({ status: "cancelled" })
         .eq("transaction_id", currentTransactionId)
         .eq("status", "pending");

       setCurrentTransactionId(null);
     }

     // Then initiate the new payment
     const { upiUrl, transactionId } = await initiateUPIPayment(packageDetails);
     setCurrentTransactionId(transactionId);
     await Linking.openURL(upiUrl);
     await fetchTransactions();
   } catch (error) {
     console.error("Payment initialization failed:", error);
     Alert.alert(
       "Payment Failed",
       "Unable to initialize UPI payment. Please ensure you have a UPI app installed."
     );
   } finally {
     setLoading(false);
   }
 };

const handlePaymentStatus = async (transactionId, status) => {
  setLoading(true);
  try {
    console.log(
      "Starting payment verification for transaction:",
      transactionId
    );

    // First check if transaction exists and hasn't been processed
    const { data: transaction, error: txError } = await supabase
      .from("payments")
      .select("*")
      .eq("transaction_id", transactionId)
      .single();

    console.log("Transaction lookup result:", { transaction, error: txError });

    if (txError) {
      console.error("Transaction lookup failed:", txError);
      Alert.alert("Error", "Could not find transaction");
      return;
    }

    if (transaction.status === "success" && transaction.credits_added) {
      console.log("Transaction already processed, stopping here");
      Alert.alert("Info", "Payment was already processed");
      return;
    }

    if (status === "success") {
      // Step 1: Update payment status first
      console.log("Updating payment status to success");
      const { data: statusData, error: statusError } = await supabase
        .from("payments")
        .update({ status: "success" })
        .eq("transaction_id", transactionId)
        .eq("status", "pending")
        .select();

      console.log("Status update result:", { statusData, error: statusError });

      if (statusError) {
        throw new Error(
          `Failed to update payment status: ${statusError.message}`
        );
      }

      // Step 2: Get current user credits
      console.log("Fetching current user credits");
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      console.log("User credits fetch result:", { userData, error: userError });

      if (userError) {
        throw new Error(`Failed to get user credits: ${userError.message}`);
      }

      // Step 3: Calculate new credits total
      const currentCredits = userData.credits || 0;
      const creditsToAdd = transaction.credits;
      const newTotal = currentCredits + creditsToAdd;

      console.log("Credit calculation:", {
        currentCredits,
        creditsToAdd,
        newTotal,
        userId: user.id,
      });

      // Step 4: Update user credits
      console.log("Updating user credits");
      const { data: updateData, error: updateError } = await supabase
        .from("profiles")
        .update({ credits: newTotal })
        .eq("id", user.id)
        .select();

      console.log("Credits update result:", { updateData, error: updateError });

      if (updateError) {
        throw new Error(
          `Failed to update user credits: ${updateError.message}`
        );
      }

      // Step 5: Mark credits as added
      console.log("Marking credits as added");
      const { data: finalizeData, error: finalizeError } = await supabase
        .from("payments")
        .update({ credits_added: true })
        .eq("transaction_id", transactionId)
        .select();

      console.log("Finalize result:", { finalizeData, error: finalizeError });

      if (finalizeError) {
        throw new Error(`Failed to finalize payment: ${finalizeError.message}`);
      }

      // Step 6: Refresh UI
      console.log("Refreshing UI data");
      await Promise.all([fetchUserCredits(), fetchTransactions()]);

      Alert.alert(
        "Success",
        `${creditsToAdd} credits have been added to your account`
      );
    } else {
      // Handle failed payment
      console.log("Marking payment as failed");
      const { error: failureError } = await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("transaction_id", transactionId)
        .eq("status", "pending");

      if (failureError) {
        throw new Error(
          `Failed to mark payment as failed: ${failureError.message}`
        );
      }

      await fetchTransactions();
      Alert.alert(
        "Payment Failed",
        "Please try again or contact support if the issue persists"
      );
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    Alert.alert(
      "Error Processing Payment",
      "Please check if credits were added and contact support if there's an issue."
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
      <View style={tw`space-y-4 mb-6`}>
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
                  <View style={tw`flex-row items-center space-x-2`}>
                    <Text style={tw`text-base text-slate-600`}>
                      ₹{pkg.price}
                    </Text>
                    {pkg.discount && (
                      <Text style={tw`text-sm ml-1 text-slate-400 line-through`}>
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
      <View style={tw`space-y-4`}>
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
