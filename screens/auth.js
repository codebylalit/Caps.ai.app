import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { useAuth } from "../authcontext";

const AuthScreen = ({ onClose }) => {
  const { supabase, setUser, signInWithOtp, verifyOtp, otpLoading } = useAuth();
  const [authMethod, setAuthMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuthSuccess = async (userData) => {
    setUser(userData);
    onClose();
    Alert.alert(
      "Success",
      `Successfully ${isSignUp ? "signed up" : "logged in"}!`
    );
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({
          email,
          password,
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }

      if (result.error) throw result.error;

      if (result.data.user) {
        await handleAuthSuccess(result.data.user);
      }
    } catch (error) {
      console.error("Auth error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    try {
      const { error } = await signInWithOtp(email);
      if (error) throw error;

      setShowVerification(true);
      setResendTimer(30);
      Alert.alert('Success', `Verification code sent to ${email}`);
    } catch (error) {
      console.error('Error sending code:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code');
      return;
    }

    try {
      const { error } = await verifyOtp(email, verificationCode);
      if (error) throw error;
      onClose();
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Invalid code or verification failed. Please try again.');
    }
  };

  // Timer effect for resend cooldown
  React.useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((current) => current - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const renderEmailPasswordAuth = () => (
    <View>
      <Text style={tw`text-base text-slate-600 mb-2`}>Email</Text>
      <View style={tw`bg-white rounded-lg p-3 mb-4`}>
        <TextInput
          style={tw`text-lg`}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
      </View>

      <Text style={tw`text-base text-slate-600 mb-2`}>Password</Text>
      <View style={tw`bg-white rounded-lg p-3 mb-4`}>
        <TextInput
          style={tw`text-lg`}
          placeholder="Enter your password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={tw`p-4 bg-orange-500 rounded-lg mb-4 ${loading ? "opacity-50" : ""}`}
        onPress={handleEmailAuth}
        disabled={loading}
      >
        <Text style={tw`text-white text-center font-bold text-lg`}>
          {loading ? "Processing..." : isSignUp ? "Sign Up" : "Log In"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={tw`p-4`}>
        <Text style={tw`text-orange-500 text-center font-bold`}>
          {isSignUp
            ? "Already have an account? Log In"
            : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmailOtp = () => (
    <View>
      {!showVerification ? (
        <>
          <Text style={tw`text-base text-slate-600 mb-2`}>Email Address</Text>
          <View style={tw`bg-white rounded-lg flex-row items-center p-3 mb-4`}>
            <TextInput
              style={tw`flex-1 text-lg`}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!otpLoading}
            />
          </View>

          <TouchableOpacity
            style={tw`p-4 bg-orange-500 rounded-lg ${otpLoading ? "opacity-50" : ""}`}
            onPress={handleSendCode}
            disabled={otpLoading}
          >
            <Text style={tw`text-white text-center font-bold text-lg`}>
              {otpLoading ? "Sending Code..." : "Send Verification Code"}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={tw`text-base text-slate-600 mb-2`}>
            Enter verification code sent to {email}
          </Text>
          <View style={tw`bg-white rounded-lg flex-row items-center p-3 mb-4`}>
            <TextInput
              style={tw`flex-1 text-lg text-center tracking-widest letter-spacing-2`}
              placeholder="000000"
              value={verificationCode}
              onChangeText={(text) => {
                // Only allow digits
                const cleaned = text.replace(/[^0-9]/g, '');
                setVerificationCode(cleaned);
              }}
              editable={!otpLoading}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
            />
          </View>

          <TouchableOpacity
            style={tw`p-4 bg-orange-500 rounded-lg mb-4 ${otpLoading ? "opacity-50" : ""}`}
            onPress={handleVerifyCode}
            disabled={otpLoading}
          >
            <Text style={tw`text-white text-center font-bold text-lg`}>
              {otpLoading ? "Verifying..." : "Verify Code"}
            </Text>
          </TouchableOpacity>

          <View style={tw`flex-row justify-between items-center`}>
            <TouchableOpacity
              style={tw`p-4`}
              onPress={() => {
                setShowVerification(false);
                setVerificationCode("");
              }}
            >
              <Text style={tw`text-orange-500 text-center font-bold`}>
                Change Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw`p-4`}
              onPress={handleSendCode}
              disabled={resendTimer > 0 || otpLoading}
            >
              <Text
                style={tw`${
                  resendTimer > 0 ? "text-gray-400" : "text-orange-500"
                } text-center font-bold`}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  return (
    <ScrollView style={tw`flex-1 bg-orange-50`}>
      <View style={tw`p-6 mt-16`}>
        <View style={tw`flex-row justify-between items-center mb-8`}>
          <Text style={tw`text-3xl font-bold text-slate-800`}>
            {showVerification ? "Verify Email" : isSignUp ? "Sign Up" : "Sign In"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <View style={tw`w-8 h-8 rounded-full bg-slate-100 items-center justify-center`}>
              <FontAwesome name="times" size={16} color="#FB923C" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Auth Method Selector */}
        {!showVerification && (
          <View style={tw`flex-row mb-6`}>
            <TouchableOpacity
              style={tw`flex-1 p-4 rounded-l-lg ${
                authMethod === "email" ? "bg-orange-500" : "bg-white"
              }`}
              onPress={() => setAuthMethod("email")}
            >
              <Text
                style={tw`text-center font-bold ${
                  authMethod === "email" ? "text-white" : "text-slate-600"
                }`}
              >
                Email & Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`flex-1 p-4 rounded-r-lg ${
                authMethod === "otp" ? "bg-orange-500" : "bg-white"
              }`}
              onPress={() => setAuthMethod("otp")}
            >
              <Text
                style={tw`text-center font-bold ${
                  authMethod === "otp" ? "text-white" : "text-slate-600"
                }`}
              >
                Email OTP
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Auth Content */}
        {authMethod === "email" ? renderEmailPasswordAuth() : renderEmailOtp()}
      </View>
    </ScrollView>
  );
};

export default AuthScreen;
