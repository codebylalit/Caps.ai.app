import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../authcontext';
import tw from 'twrnc';

const OtpLogin = ({ onClose }) => {
  const { signInWithOtp, verifyOtp, otpLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const { error } = await signInWithOtp(email);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setShowOtpInput(true);
      Alert.alert('Success', 'Check your email for the login code');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    const { error } = await verifyOtp(email, otp);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      onClose();
    }
  };

  return (
    <View style={tw`flex-1 justify-center px-6 bg-white`}>
      <View style={tw`bg-white rounded-lg p-6 shadow-lg`}>
        <Text style={tw`text-2xl font-bold mb-6 text-center text-gray-800`}>
          {showOtpInput ? 'Enter Verification Code' : 'Sign In with Email'}
        </Text>

        {!showOtpInput ? (
          <>
            <TextInput
              style={tw`bg-gray-100 rounded-lg px-4 py-3 mb-4`}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!otpLoading}
            />

            <TouchableOpacity
              style={tw`bg-orange-500 rounded-lg py-3 mb-4`}
              onPress={handleSendOtp}
              disabled={otpLoading}
            >
              {otpLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={tw`text-white text-center font-semibold`}>
                  Send Login Code
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={tw`bg-gray-100 rounded-lg px-4 py-3 mb-4`}
              placeholder="Enter verification code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              editable={!otpLoading}
            />

            <TouchableOpacity
              style={tw`bg-orange-500 rounded-lg py-3 mb-4`}
              onPress={handleVerifyOtp}
              disabled={otpLoading}
            >
              {otpLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={tw`text-white text-center font-semibold`}>
                  Verify Code
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={tw`mt-4`}
          onPress={() => {
            if (showOtpInput) {
              setShowOtpInput(false);
              setOtp('');
            } else {
              onClose();
            }
          }}
        >
          <Text style={tw`text-gray-600 text-center`}>
            {showOtpInput ? 'Back to Email' : 'Cancel'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OtpLogin; 