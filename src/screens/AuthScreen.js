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
import { useAuth } from "../hooks/useAuth";
import { colors, commonStyles } from "../theme/colors";

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
      "Welcome! 👋",
      `You've successfully ${
        isSignUp ? "created your account" : "signed in"
      }! Let's get started.`,
      [{ text: "Let's Go!" }]
    );
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert(
        "Missing Information",
        "Please enter both your email and password to continue.",
        [{ text: "Got it" }]
      );
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
      Alert.alert(
        "Authentication Issue",
        error.message === "Invalid login credentials"
          ? "The email or password you entered doesn't match our records. Please check and try again."
          : "We couldn't complete the authentication. Please try again or contact support if the issue persists.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!email || !email.includes("@")) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address to receive your verification code.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const { error } = await signInWithOtp(email);
      if (error) throw error;

      setShowVerification(true);
      setResendTimer(30);
      Alert.alert(
        "Code Sent! 📧",
        `We've sent a verification code to ${email}. Please check your inbox and spam folder.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error sending code:", error);
      Alert.alert(
        "Code Sending Failed",
        "We had trouble sending your verification code. Please check your email address and try again.",
        [{ text: "Try Again" }]
      );
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert(
        "Invalid Code",
        "Please enter the 6-digit verification code from your email.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const { error } = await verifyOtp(email, verificationCode);
      if (error) throw error;
      onClose();
    } catch (error) {
      console.error("Verification error:", error);
      Alert.alert(
        "Verification Failed",
        "The code you entered is incorrect or has expired. Please try again or request a new code.",
        [{ text: "OK" }]
      );
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
      <Text
        style={[
          {
            color: colors.text.secondary,
            fontSize: 16,
            fontWeight: "500",
            marginBottom: 8,
          },
        ]}
      >
        Email
      </Text>
      <View
        style={[
          {
            backgroundColor: colors.background.card,
            borderRadius: commonStyles.borderRadius.medium,
            ...commonStyles.shadow.light,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border.light,
            overflow: "hidden",
          },
        ]}
      >
        <TextInput
          style={{
            color: colors.text.primary,
            fontSize: 16,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
          placeholder="Enter your email"
          placeholderTextColor={colors.text.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
      </View>

      <Text
        style={[
          {
            color: colors.text.secondary,
            fontSize: 16,
            fontWeight: "500",
            marginBottom: 8,
          },
        ]}
      >
        Password
      </Text>
      <View
        style={[
          {
            backgroundColor: colors.background.card,
            borderRadius: commonStyles.borderRadius.medium,
            ...commonStyles.shadow.light,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: colors.border.light,
            overflow: "hidden",
          },
        ]}
      >
        <TextInput
          style={{
            color: colors.text.primary,
            fontSize: 16,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
          placeholder="Enter your password"
          placeholderTextColor={colors.text.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[
          {
            backgroundColor: colors.accent.orange,
            borderRadius: commonStyles.borderRadius.medium,
            ...commonStyles.shadow.medium,
            padding: 16,
            marginBottom: 24,
            alignItems: "center",
            opacity: loading ? 0.5 : 1,
          },
        ]}
        onPress={handleEmailAuth}
        disabled={loading}
      >
        <Text
          style={{ color: colors.text.light, fontWeight: "700", fontSize: 18 }}
        >
          {loading ? "Processing..." : isSignUp ? "Sign Up" : "Log In"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsSignUp(!isSignUp)}
        style={{ padding: 16 }}
      >
        <Text
          style={{
            color: colors.accent.orange,
            textAlign: "center",
            fontWeight: "700",
            fontSize: 16,
          }}
        >
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
          <Text
            style={[
              { color: colors.text.secondary, fontSize: 16, marginBottom: 8 },
            ]}
          >
            Email Address
          </Text>
          <View
            style={[
              {
                backgroundColor: colors.background.card,
                borderRadius: commonStyles.borderRadius.medium,
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                marginBottom: 16,
              },
            ]}
          >
            <TextInput
              style={{ flex: 1, color: colors.text.primary, fontSize: 16 }}
              placeholder="Enter your email"
              placeholderTextColor={colors.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!otpLoading}
            />
          </View>

          <TouchableOpacity
            style={[
              {
                backgroundColor: colors.accent.orange,
                borderRadius: commonStyles.borderRadius.medium,
                padding: 16,
                alignItems: "center",
                marginBottom: 0,
                opacity: otpLoading ? 0.5 : 1,
              },
            ]}
            onPress={handleSendCode}
            disabled={otpLoading}
          >
            <Text
              style={{
                color: colors.text.light,
                fontWeight: "700",
                fontSize: 18,
              }}
            >
              {otpLoading ? "Sending Code..." : "Send Verification Code"}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text
            style={[
              { color: colors.text.secondary, fontSize: 16, marginBottom: 8 },
            ]}
          >
            Enter verification code sent to {email}
          </Text>
          <View
            style={[
              {
                backgroundColor: colors.background.card,
                borderRadius: commonStyles.borderRadius.medium,
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                marginBottom: 16,
              },
            ]}
          >
            <TextInput
              style={{
                flex: 1,
                color: colors.text.primary,
                fontSize: 20,
                textAlign: "center",
                letterSpacing: 4,
              }}
              placeholder="000000"
              placeholderTextColor={colors.text.muted}
              value={verificationCode}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, "");
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
            style={[
              {
                backgroundColor: colors.accent.orange,
                borderRadius: commonStyles.borderRadius.medium,
                padding: 16,
                alignItems: "center",
                marginBottom: 16,
                opacity: otpLoading ? 0.5 : 1,
              },
            ]}
            onPress={handleVerifyCode}
            disabled={otpLoading}
          >
            <Text
              style={{
                color: colors.text.light,
                fontWeight: "700",
                fontSize: 18,
              }}
            >
              {otpLoading ? "Verifying..." : "Verify Code"}
            </Text>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              style={{ padding: 16 }}
              onPress={() => {
                setShowVerification(false);
                setVerificationCode("");
              }}
            >
              <Text
                style={{
                  color: colors.accent.orange,
                  textAlign: "center",
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                Change Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ padding: 16 }}
              onPress={handleSendCode}
              disabled={resendTimer > 0 || otpLoading}
            >
              <Text
                style={{
                  color:
                    resendTimer > 0 ? colors.text.muted : colors.accent.orange,
                  textAlign: "center",
                  fontWeight: "700",
                  fontSize: 16,
                }}
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background.main }}>
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 24,
          marginTop: 48,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <Text
            style={{
              fontSize: 36,
              fontWeight: "800",
              color: colors.text.primary,
              letterSpacing: -1,
            }}
          >
            {showVerification
              ? "Verify Email"
              : isSignUp
              ? "Sign Up"
              : "Sign In"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.background.card,
                ...commonStyles.shadow.light,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.border.light,
              }}
            >
              <FontAwesome
                name="times"
                size={20}
                color={colors.text.secondary}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Auth Method Selector */}
        {!showVerification && (
          <View
            style={{
              flexDirection: "row",
              marginBottom: 32,
              backgroundColor: colors.background.card,
              borderRadius: commonStyles.borderRadius.medium,
              ...commonStyles.shadow.light,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.border.light,
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                padding: 16,
                backgroundColor:
                  authMethod === "email"
                    ? colors.accent.orange
                    : colors.background.card,
                alignItems: "center",
              }}
              onPress={() => setAuthMethod("email")}
            >
              <Text
                style={{
                  fontWeight: "700",
                  color:
                    authMethod === "email"
                      ? colors.text.light
                      : colors.text.secondary,
                }}
              >
                Email & Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                padding: 16,
                backgroundColor:
                  authMethod === "otp"
                    ? colors.accent.orange
                    : colors.background.card,
                alignItems: "center",
              }}
              onPress={() => setAuthMethod("otp")}
            >
              <Text
                style={{
                  fontWeight: "700",
                  color:
                    authMethod === "otp"
                      ? colors.text.light
                      : colors.text.secondary,
                }}
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
