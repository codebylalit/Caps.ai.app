import React, { useState, useEffect } from "react";
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
  const { supabase, setUser } = useAuth();
  const [authMethod, setAuthMethod] = useState("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
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

  const handlePhoneSendCode = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid 10-digit phone number"
      );
      return;
    }

    setLoading(true);
    try {
      const fullPhoneNumber = `+91${phoneNumber}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
      });

      if (error) throw error;

      setShowVerification(true);
      setResendTimer(30);
      Alert.alert("Success", `Verification code sent to +91 ${phoneNumber}`);
    } catch (error) {
      console.error("Error sending code:", error);
      Alert.alert(
        "Error",
        "Failed to send verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const fullPhoneNumber = `+91${phoneNumber}`;
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhoneNumber,
        token: verificationCode,
        type: "sms",
      });

      if (error) throw error;

      if (data?.user) {
        await handleAuthSuccess(data.user);
      }
    } catch (error) {
      console.error("Verification error:", error);
      Alert.alert(
        "Error",
        "Invalid code or verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPhoneAuth = () =>
    !showVerification ? (
      <View>
        <Text style={tw`text-base text-slate-600 mb-2`}>Phone Number</Text>
        <View style={tw`bg-white rounded-lg flex-row items-center p-3 mb-4`}>
          <Text style={tw`mr-2 text-slate-600 text-lg`}>+91</Text>
          <TextInput
            style={tw`flex-1 text-lg`}
            placeholder="Enter 10-digit number"
            keyboardType="number-pad"
            maxLength={10}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        <TouchableOpacity
          style={tw`p-4 bg-orange-500 rounded-lg ${
            loading ? "opacity-50" : ""
          }`}
          onPress={handlePhoneSendCode}
          disabled={loading}
        >
          <Text style={tw`text-white text-center font-bold text-lg`}>
            {loading ? "Sending Code..." : "Send Verification Code"}
          </Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View>
        <Text style={tw`text-base text-slate-600 mb-2`}>
          Enter verification code sent to +91 {phoneNumber}
        </Text>
        <View style={tw`bg-white rounded-lg flex-row items-center p-3 mb-4`}>
          <TextInput
            style={tw`flex-1 text-lg text-center tracking-widest`}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={verificationCode}
            onChangeText={setVerificationCode}
          />
        </View>

        <TouchableOpacity
          style={tw`p-4 bg-orange-500 rounded-lg mb-4 ${
            loading ? "opacity-50" : ""
          }`}
          onPress={handleVerifyCode}
          disabled={loading}
        >
          <Text style={tw`text-white text-center font-bold text-lg`}>
            {loading ? "Verifying..." : "Verify Code"}
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
              Change Phone Number
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`p-4`}
            onPress={handlePhoneSendCode}
            disabled={resendTimer > 0 || loading}
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
      </View>
    );

  const renderEmailAuth = () => (
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
        />
      </View>

      <TouchableOpacity
        style={tw`p-4 bg-orange-500 rounded-lg mb-4 ${
          loading ? "opacity-50" : ""
        }`}
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

  return (
    <ScrollView style={tw`flex-1 bg-orange-50`}>
      <View style={tw`p-6 mt-16`}>
        <View style={tw`flex-row justify-between items-center mb-8`}>
          <Text style={tw`text-3xl font-bold text-slate-800`}>
            {showVerification
              ? "Verify Phone"
              : isSignUp
              ? "Sign Up"
              : "Sign In"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <View
              style={tw`w-8 h-8 rounded-full bg-slate-100 items-center justify-center`}
            >
              <FontAwesome name="times" size={16} color="#FB923C" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Auth Method Selector */}
        {!showVerification && (
          <View style={tw`flex-row mb-6`}>
            <TouchableOpacity
              style={tw`flex-1 p-4 rounded-l-lg ${
                authMethod === "phone" ? "bg-orange-500" : "bg-white"
              }`}
              onPress={() => setAuthMethod("phone")}
            >
              <Text
                style={tw`text-center font-bold ${
                  authMethod === "phone" ? "text-white" : "text-slate-600"
                }`}
              >
                Phone
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`flex-1 p-4 rounded-r-lg ${
                authMethod === "email" ? "bg-orange-500" : "bg-white"
              }`}
              onPress={() => setAuthMethod("email")}
            >
              <Text
                style={tw`text-center font-bold ${
                  authMethod === "email" ? "text-white" : "text-slate-600"
                }`}
              >
                Email
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Auth Content */}
        {authMethod === "phone" ? renderPhoneAuth() : renderEmailAuth()}
      </View>
    </ScrollView>
  );
};

export default AuthScreen;
