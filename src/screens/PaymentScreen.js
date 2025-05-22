import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  Platform,
  BackHandler,
  NativeEventEmitter,
  NativeModules,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import tw from "twrnc";
import { RAZORPAY_KEY_ID } from '../config/razorpay';
import RazorpayService from '../services/razorpay';
import { colors, commonStyles } from '../theme/colors';
import { FontAwesome } from '@expo/vector-icons';

let RazorpayCheckout;
let razorpayEvents;
if (Platform.OS === 'android') {
  RazorpayCheckout = require('react-native-razorpay').default;
  const RazorpayEventEmitter = NativeModules.RazorpayEventEmitter;
  if (RazorpayEventEmitter) {
    razorpayEvents = new NativeEventEmitter(RazorpayEventEmitter);
  }
}

const creditPackages = [
  { 
    credits: 100, 
    price: 9, 
    originalPrice: 19,
    popular: false, 
    discount: true, 
    savings: "₹10", 
    label: "Starter"
  },
  {
    credits: 500, 
    price: 39, 
    originalPrice: 79,
    popular: true, 
    discount: true, 
    savings: "₹40", 
    label: "Best Value"
  },
  { 
    credits: 1200, 
    price: 79, 
    originalPrice: 149,
    popular: false, 
    discount: true, 
    savings: "₹70", 
    label: "Pro Pack"
  },
];

// Add ThemedNotification component
const ThemedNotification = ({ type, message, onClose }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(-20));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getNotificationStyle = () => {
    switch (type) {
      case "success":
        return { backgroundColor: colors.accent.sage, icon: "check-circle" };
      case "error":
        return {
          backgroundColor: colors.accent.orange,
          icon: "exclamation-circle",
        };
      case "warning":
        return {
          backgroundColor: colors.accent.olive,
          icon: "exclamation-triangle",
        };
      case "info":
        return { backgroundColor: colors.accent.orange, icon: "info-circle" };
      default:
        return { backgroundColor: colors.accent.sage, icon: "info-circle" };
    }
  };
  const style = getNotificationStyle();

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 20,
        right: 20,
        opacity: fadeAnim,
        transform: [{ translateY }],
        zIndex: 1000,
      }}
    >
      <View
        style={{
          backgroundColor: style.backgroundColor,
          borderRadius: commonStyles.borderRadius.medium,
          padding: commonStyles.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          ...commonStyles.shadow.medium,
        }}
      >
        <FontAwesome name={style.icon} size={20} color={colors.text.light} style={{ marginRight: 10 }} />
        <Text style={{ color: colors.text.light, flex: 1, fontSize: 16, fontWeight: '500' }}>
          {message}
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
            <FontAwesome name="times" size={16} color={colors.text.light} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

// Add CelebrationEffect component
const CelebrationEffect = ({ onComplete }) => {
  const [particles] = useState(() => Array(50).fill().map(() => ({
    x: new Animated.Value(Dimensions.get('window').width / 2),
    y: new Animated.Value(Dimensions.get('window').height / 2),
    scale: new Animated.Value(0),
    opacity: new Animated.Value(1),
    rotation: new Animated.Value(0),
    color: [colors.accent.sage, colors.accent.orange, colors.accent.olive, colors.accent.deepGreen][Math.floor(Math.random() * 4)],
  })));

  useEffect(() => {
    const animations = particles.map((particle, index) => {
      const angle = (index / particles.length) * Math.PI * 2;
      const distance = 200 + Math.random() * 100;
      const duration = 1000 + Math.random() * 1000;

      return Animated.parallel([
        Animated.timing(particle.x, {
          toValue: Math.cos(angle) * distance + Dimensions.get('window').width / 2,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: Math.sin(angle) * distance + Dimensions.get('window').height / 2,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 1,
          duration: duration * 0.3,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.rotation, {
          toValue: Math.random() * 360,
          duration,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      if (onComplete) onComplete();
    });
  }, []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            backgroundColor: particle.color,
            borderRadius: 4,
            transform: [
              { translateX: particle.x },
              { translateY: particle.y },
              { scale: particle.scale },
              { rotate: particle.rotation.interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg'],
              })},
            ],
            opacity: particle.opacity,
          }}
        />
      ))}
    </View>
  );
};

const PaymentManager = ({ user, supabase, credits = 0, fetchUserCredits, setActiveMode, setActiveTab }) => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionId, setTransactionId] = useState(null);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Add notification handler
  const showNotification = (type, message, duration = 3000) => {
    setNotification({ type, message });
    if (duration) {
      setTimeout(() => setNotification(null), duration);
    }
  };

  useEffect(() => {
    fetchTransactions();

    // Handle hardware back button press during payment
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (loading) return true;
      return false;
    });

    // Initialize Razorpay event listeners (Android only)
    let paymentSuccessListener;
    let paymentErrorListener;
    let externalWalletListener;

    if (Platform.OS === 'android' && razorpayEvents) {
      paymentSuccessListener = razorpayEvents.addListener(
        'Razorpay::PAYMENT_SUCCESS',
        handlePaymentSuccess
      );
      paymentErrorListener = razorpayEvents.addListener(
        'Razorpay::PAYMENT_ERROR',
        handlePaymentError
      );
      externalWalletListener = razorpayEvents.addListener(
        'Razorpay::EXTERNAL_WALLET_SELECTED',
        handleExternalWallet
      );
    }

    // Setup deep link handling
    let deepLinkSubscription = null;
    
    const setupDeepLinkHandling = async () => {
      if (transactionId) {
        // Modern approach for Linking event listener
        deepLinkSubscription = Linking.addEventListener('url', ({ url }) => {
          if (url) {
            processDeepLink(url);
          }
        });
        
        // Check if app was opened via deep link
        try {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            processDeepLink(initialUrl);
          }
        } catch (err) {
          console.error('Error getting initial URL:', err);
        }
      }
    };

    setupDeepLinkHandling();

    // Cleanup function
    return () => {
      backHandler.remove();
      
      // Clean up deep link listener
      if (deepLinkSubscription) {
        deepLinkSubscription.remove();
      }

      // Clean up Razorpay event listeners
      if (Platform.OS === 'android' && razorpayEvents) {
        if (paymentSuccessListener) {
          paymentSuccessListener.remove();
        }
        if (paymentErrorListener) {
          paymentErrorListener.remove();
        }
        if (externalWalletListener) {
          externalWalletListener.remove();
        }
      }
    };
  }, [transactionId, loading]);

  const handlePaymentSuccess = async (data) => {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = data;
      
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        throw new Error('Invalid payment response');
      }

      console.log('Processing payment success:', {
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id
      });
      
      await supabase.from("payments")
        .update({
          status: "processing",
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature
        })
        .eq("transaction_id", transactionId);

      console.log('Starting payment verification...');
      const verificationResult = await RazorpayService.verifyPayment({
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature
      });

      if (verificationResult) {
        console.log('Payment verified successfully');
        await fetchUserCredits();
        await fetchTransactions();
        
        showNotification('success', 'Payment successful! Your credits have been added to your account.');
        setShowCelebration(true);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      showNotification('error', error.message || "There was an error processing your payment.");
      
      await supabase.from("payments")
        .update({
          status: "failed",
          error_description: error.message || "Verification failed",
          verified: false
        })
        .eq("transaction_id", transactionId);
    } finally {
      setTransactionId(null);
      setProcessingPlan(null);
      setLoading(false);
    }
  };

  const processDeepLink = async (url) => {
    if (!transactionId) return;
    
    try {
      const urlObj = new URL(url);
      const paymentId = urlObj.searchParams.get('razorpay_payment_id');
      const orderId = urlObj.searchParams.get('razorpay_order_id');
      const signature = urlObj.searchParams.get('razorpay_signature');

      if (paymentId && orderId && signature) {
        await supabase.from("payments")
          .update({
            status: "processing",
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            razorpay_signature: signature
          })
          .eq("transaction_id", transactionId);

        const isVerified = await RazorpayService.verifyPayment({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature
        });

        if (isVerified) {
          await supabase.from("payments")
            .update({ status: "success", verified: true })
            .eq("transaction_id", transactionId);

          handleSuccessfulPayment(processingPlan);
        } else {
          throw new Error('Payment verification failed');
        }
      } else if (url.includes('payment/failure') || url.includes('payment/cancel')) {
        await supabase.from("payments")
          .update({ 
            status: "failed", 
            error_description: url.includes('payment/cancel') ? "Payment cancelled" : "Payment failed",
            verified: false 
          })
          .eq("transaction_id", transactionId);

        showNotification(
          url.includes('payment/cancel') ? 'warning' : 'error',
          url.includes('payment/cancel') ? "The payment was cancelled." : "The payment failed. Please try again."
        );
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      showNotification('error', error.message || "There was an error processing your payment.");
      
      await supabase.from("payments")
        .update({ 
          status: "failed", 
          error_description: error.message || "Verification failed", 
          verified: false 
        })
        .eq("transaction_id", transactionId);
    } finally {
      setTransactionId(null);
      setProcessingPlan(null);
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

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
    console.error("Payment error details:", error);
    
    if (transactionId) {
      await supabase.from("payments")
        .update({ 
          status: "failed", 
          error_description: error?.description || error?.message || "Payment failed",
          verified: false 
        })
        .eq("transaction_id", transactionId);
    }

    if (error?.code !== 0) {
      showNotification('error', error?.description || error?.message || "Payment failed");
    }

    setTransactionId(null);
    setProcessingPlan(null);
    setLoading(false);
  };

  const handleSuccessfulPayment = async (plan) => {
    try {
      setLoading(true);

      const selectedPackage = creditPackages.find(pkg => pkg.credits === parseInt(plan));
      if (!selectedPackage) throw new Error('Invalid credit package');

      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const newTotal = (userData?.credits || 0) + selectedPackage.credits;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: newTotal })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await Promise.all([fetchUserCredits(), fetchTransactions()]);

      showNotification('success', `${selectedPackage.credits} credits added to your account`);
    } catch (error) {
      console.error("Error:", error);
      showNotification('error', error.message || "Failed to add credits.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg) => {
    if (!user) {
      showNotification('warning', "Please log in to make a payment");
      return;
    }

    setLoading(true);
    const txnId = generateTransactionId();
    setTransactionId(txnId);
    setProcessingPlan(pkg.credits.toString());

    try {
      const { error: paymentInitError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          amount: pkg.price * 100,
          credits: pkg.credits,
          transaction_id: txnId,
          status: "pending",
          credits_added: false,
        });

      if (paymentInitError) throw new Error('Failed to initialize payment');

      const orderData = await RazorpayService.createOrder({
        amount: pkg.price * 100,
        currency: 'INR',
        receipt: txnId,
        notes: { plan: pkg.credits.toString(), userId: user.id }
      });

      if (!orderData?.id) throw new Error('Failed to create payment order');

      console.log('Starting payment with order:', orderData.id);
      
      const paymentData = await RazorpayService.initiatePayment({
        amount: pkg.price * 100,
        orderId: orderData.id,
        currency: 'INR',
        description: `${pkg.credits} Credits Purchase`,
        email: user.email,
        contact: user.phone || '',
        name: user.name || ''
      });

      console.log('Payment successful:', paymentData);

      await handlePaymentSuccess({
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_signature: paymentData.razorpay_signature
      });

    } catch (error) {
      console.error('Payment error:', error);
      setTransactionId(null);
      setProcessingPlan(null);

      await supabase
        .from("payments")
        .update({ 
          status: "failed", 
          error_description: error.message || 'Unknown error', 
          verified: false 
        })
        .eq("transaction_id", txnId);

      showNotification('error', error.message || "Failed to start payment");
    } finally {
      if (!transactionId) setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {showCelebration && (
        <CelebrationEffect onComplete={() => setShowCelebration(false)} />
      )}
      
      {/* Add notification component */}
      {notification && (
        <ThemedNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <View
        style={[
          tw`rounded-lg mb-4`,
          { backgroundColor: colors.background.card },
          commonStyles.shadow.light,
        ]}
      >
        <View
          style={[
            tw`p-4 rounded-lg`,
            { backgroundColor: colors.background.card },
            commonStyles.shadow.light,
          ]}
        >
          <Text style={[tw`text-3xl font-bold`, { color: colors.accent.sage }]}>
            {credits}
          </Text>
          <Text style={[tw`text-base mt-1`, { color: colors.text.secondary }]}>
            Credits remaining
          </Text>
        </View>
      </View>

      <View style={tw`mb-4`}>
        <Text
          style={[tw`text-lg font-semibold`, { color: colors.text.primary }]}
        >
          Purchase Credits
        </Text>
      </View>

      {creditPackages.map((pkg, index) => {
        const originalPrice = pkg.discount ? pkg.originalPrice : pkg.price;
        return (
          <TouchableOpacity
            key={index}
            style={[
              tw`mb-4 p-4 rounded-lg`,
              { backgroundColor: colors.background.card },
              commonStyles.shadow.light,
              pkg.popular && { borderWidth: 2, borderColor: colors.accent.sage }
            ]}
            onPress={() => handlePurchase(pkg)}
            disabled={loading}
          >
            <View style={tw`flex-row justify-between items-center`}>
              <View>
                <Text
                  style={[
                    tw`text-xl font-semibold`,
                    { color: colors.text.primary },
                  ]}
                >
                  {pkg.credits} Credits
                </Text>
                <Text style={[tw`text-base`, { color: colors.text.secondary }]}>
                  {pkg.label}
                </Text>
              </View>
              <View style={tw`items-end`}>
                <Text
                  style={[tw`text-xl font-bold`, { color: colors.accent.sage }]}
                >
                  ₹{pkg.price}
                </Text>
                {pkg.discount && (
                  <Text
                    style={[
                      tw`text-base line-through`,
                      { color: colors.text.muted },
                    ]}
                  >
                    ₹{originalPrice}
                  </Text>
                )}
              </View>
            </View>

            {pkg.popular && (
              <View
                style={[
                  tw`absolute -top-2 -right-2 px-2 py-1 rounded-full`,
                  { backgroundColor: colors.accent.sage },
                ]}
              >
                <Text
                  style={[
                    tw`text-sm font-medium`,
                    { color: colors.text.light },
                  ]}
                >
                  Popular
                </Text>
              </View>
            )}
            {loading && processingPlan === pkg.credits.toString() && (
              <View
                style={[
                  tw`mt-3 p-2 rounded-lg`,
                  { backgroundColor: colors.background.light },
                ]}
              >
                <ActivityIndicator color={colors.accent.sage} />
                <Text
                  style={[
                    tw`text-base text-center mt-1`,
                    { color: colors.text.secondary },
                  ]}
                >
                  Processing...
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={tw`mb-6 flex-row justify-between items-center`}>
        <Text
          style={[tw`text-lg font-semibold`, { color: colors.text.primary }]}
        >
          Transaction History
        </Text>
        {transactions.length > 0 && (
          <TouchableOpacity onPress={() => setActiveTab("transactions")}>
            <Text style={[tw`text-base`, { color: colors.accent.sage }]}>
              View All 
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {transactions.length === 0 ? (
        <View
          style={[
            tw`p-4 rounded-lg`,
            { backgroundColor: colors.background.card },
            commonStyles.shadow.light,
          ]}
        >
          <Text style={[tw`text-base text-center`, { color: colors.text.secondary }]}>
            No transaction history found
          </Text>
        </View>
      ) : (
        transactions.map((transaction, index) => (
          <View
            key={index}
            style={[
              tw`p-4 rounded-lg mb-3`,
              { backgroundColor: colors.background.card },
              commonStyles.shadow.light,
            ]}
          >
            <View style={tw`flex-row justify-between items-center`}>
              <View>
                <Text
                  style={[
                    tw`text-base font-medium`,
                    { color: colors.text.primary },
                  ]}
                >
                  {transaction.credits} Credits
                </Text>
                <Text style={[tw`text-base`, { color: colors.text.secondary }]}>
                  ₹{transaction.amount}
                </Text>
              </View>
              <View>
                <Text
                  style={[
                    tw`text-base font-medium`,
                    {
                      color:
                        transaction.status === "success"
                          ? colors.status.success
                          : transaction.status === "pending"
                          ? colors.status.warning
                          : colors.status.error,
                    },
                  ]}
                >
                  {transaction.status.charAt(0).toUpperCase() +
                    transaction.status.slice(1)}
                </Text>
                <Text style={[tw`text-sm`, { color: colors.text.muted }]}>
                  {new Date(transaction.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

export default PaymentManager;