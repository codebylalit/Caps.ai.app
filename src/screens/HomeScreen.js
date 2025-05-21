import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  TextInput,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import AuthScreen from "./AuthScreen";
import OnboardingScreen from "./OnboardingScreen";
import ProfileScreen from "./ProfileScreen";
import { useAuth } from "../hooks/useAuth";
import { useUsageTracking } from "../hooks/useFreeCredits";
import { LinearGradient } from "expo-linear-gradient";
import { colors, commonStyles } from "../theme/colors";

const HomeScreen = ({ setActiveMode }) => {
  const { user, supabase } = useAuth();

  // Define the function before using it in state initialization
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 22) return "Good Evening";
    return "Good Night";
  };

  const [showAuth, setShowAuth] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [modalScale] = useState(new Animated.Value(0));
  const [modalOpacity] = useState(new Animated.Value(0));
  const [currentGreeting, setCurrentGreeting] = useState(
    getTimeBasedGreeting()
  );
  const { anonymousUsageCount, MAX_ANONYMOUS_GENERATIONS } = useUsageTracking();
  const [localUser, setLocalUser] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check onboarding status
        const hasSeenOnboarding = await AsyncStorage.getItem(
          "hasSeenOnboarding"
        );
        setShowOnboarding(hasSeenOnboarding !== "true");

        // Fetch user profile if logged in
        if (user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", user.id)
            .single();

          if (error) {
            console.error("Error fetching profile:", error.message);
          } else {
            setDisplayName(data?.name || "User");
          }
        }
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    };

    initializeApp();

    // Set up greeting update interval
    const intervalId = setInterval(() => {
      const newGreeting = getTimeBasedGreeting();
      setCurrentGreeting(newGreeting);
    }, 5000); // Update every 5 seconds for testing

    return () => clearInterval(intervalId);
  }, [user]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };

  const handleLogin = () => {
    setShowAuth(true);
  };

  const animateModal = (show) => {
    if (show) {
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(modalScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(modalScale, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
      ]).start(() => setShowGeneratorModal(false));
    }
  };

  const showModal = () => {
    setShowGeneratorModal(true);
    setTimeout(() => animateModal(true), 10);
  };

  const hideModal = () => {
    animateModal(false);
  };

  // FeatureCard for content creation
  const FeatureCard = ({ icon, title, description, color, onPress }) => (
    <TouchableOpacity
      style={{
        borderRadius: commonStyles.borderRadius.large,
        padding: commonStyles.spacing.lg,
        marginBottom: commonStyles.spacing.lg,
        backgroundColor: color,
        ...commonStyles.shadow.medium,
        width: "100%",
      }}
      onPress={onPress}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, marginRight: commonStyles.spacing.md }}>
          <Text
            style={{
              color: colors.text.light,
              fontSize: 20,
              fontWeight: "800",
              marginBottom: commonStyles.spacing.sm,
              letterSpacing: 0.5,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: colors.text.light,
              fontSize: 16,
              opacity: 0.95,
              fontWeight: "500",
            }}
          >
            {description}
          </Text>
        </View>
        <View
          style={{
            width: 48,
            height: 48,
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name={icon} size={22} color={colors.text.light} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  if (showAuth) {
    return <AuthScreen onClose={() => setShowAuth(false)} />;
  }

  if (showProfile) {
    return (
      <ProfileScreen
        setActiveMode={() => setShowProfile(false)}
        setShowAuth={setShowAuth}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.main }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.main}
      />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View
          style={{
            paddingHorizontal: commonStyles.spacing.xl,
            paddingTop: commonStyles.spacing.xl,
          }}
        >
          {/* Header */}
          <View style={[tw`flex-row justify-between items-center mb-10`]}>
            <View>
              <Text
                style={[
                  tw`text-3xl font-bold mb-2`,
                  { color: colors.text.primary },
                ]}
              >
                Hi {localUser?.name || displayName || "there"}
              </Text>
              <Text
                style={[
                  tw`text-lg`,
                  { color: colors.text.secondary, fontWeight: "500" },
                ]}
              >
                {currentGreeting}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setActiveMode("credits")}
              style={{
                backgroundColor: colors.accent.sage,
                paddingHorizontal: commonStyles.spacing.lg,
                paddingVertical: commonStyles.spacing.sm,
                borderRadius: commonStyles.borderRadius.medium,
                ...commonStyles.shadow.light,
              }}
            >
              <Text
                style={{
                  color: colors.text.light,
                  fontSize: 16,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                Credits: {MAX_ANONYMOUS_GENERATIONS - anonymousUsageCount}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={{ marginBottom: commonStyles.spacing.xl }}>
            <View
              style={{
                backgroundColor: colors.accent.sage,
                borderRadius: commonStyles.borderRadius.medium,
                paddingHorizontal: commonStyles.spacing.lg,
                paddingVertical: commonStyles.spacing.md,
                flexDirection: "row",
                alignItems: "center",
                ...commonStyles.shadow.light,
              }}
            >
              <FontAwesome
                name="search"
                size={18}
                color={colors.text.light}
                style={{ marginRight: commonStyles.spacing.sm }}
              />
              <TextInput
                placeholder="Search for content..."
                placeholderTextColor="rgba(255, 255, 255, 0.8)"
                style={{
                  flex: 1,
                  color: colors.text.light,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              />
            </View>
          </View>

          {/* Content Creation Section */}
          <View style={{ marginBottom: commonStyles.spacing.xl }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: commonStyles.spacing.lg,
              }}
            >
              <Text
                style={{
                  color: colors.text.primary,
                  fontSize: 24,
                  fontWeight: "800",
                  letterSpacing: 0.5,
                }}
              >
                Content Creation
              </Text>
              <TouchableOpacity>
                <Text
                  style={{
                    color: colors.accent.sage,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  See all
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "column" }}>
              <FeatureCard
                icon="magic"
                title="Smart Captions"
                description="AI-powered captions"
                color={colors.accent.sage}
                onPress={() => setActiveMode("mood")}
              />
              <FeatureCard
                icon="hashtag"
                title="Hashtag Pro"
                description="Trending hashtags"
                color={colors.accent.orange}
                onPress={() => setActiveMode("niche")}
              />
              <FeatureCard
                icon="image"
                title="Image Captions"
                description="Vision-based captions"
                color={colors.accent.olive}
                onPress={() => setActiveMode("image")}
              />
            </View>
          </View>

          {/* Recent Activities */}
          <View style={{ marginBottom: commonStyles.spacing.xl }}>
            <Text
              style={{
                color: colors.text.primary,
                fontSize: 24,
                fontWeight: "800",
                marginBottom: commonStyles.spacing.lg,
                letterSpacing: 0.5,
              }}
            >
              Recent Activities
            </Text>
            <View
              style={{
                backgroundColor: colors.accent.beige,
                borderRadius: commonStyles.borderRadius.medium,
                padding: commonStyles.spacing.lg,
                marginBottom: commonStyles.spacing.md,
                ...commonStyles.shadow.light,
              }}
            >
              <Text
                style={{
                  color: colors.text.primary,
                  fontWeight: "700",
                  fontSize: 18,
                  marginBottom: commonStyles.spacing.sm,
                  letterSpacing: 0.3,
                }}
              >
                Generated Content
              </Text>
              <Text
                style={{
                  color: colors.text.secondary,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                View your recent generations
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: commonStyles.spacing.lg,
          backgroundColor: colors.background.main,
          borderTopWidth: 1,
          borderTopColor: colors.accent.beige,
          ...commonStyles.shadow.medium,
        }}
      >
        <TouchableOpacity style={{ alignItems: "center" }}>
          <FontAwesome name="home" size={22} color={colors.text.primary} />
          <Text
            style={{
              color: colors.text.primary,
              fontSize: 13,
              marginTop: commonStyles.spacing.sm,
              fontWeight: "600",
            }}
          >
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: "center" }} onPress={showModal}>
          <FontAwesome name="plus" size={22} color={colors.text.primary} />
          <Text
            style={{
              color: colors.text.primary,
              fontSize: 13,
              marginTop: commonStyles.spacing.sm,
              fontWeight: "600",
            }}
          >
            Create
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ alignItems: "center" }}
          onPress={() => (user ? setShowProfile(true) : setShowAuth(true))}
        >
          <FontAwesome name="user" size={22} color={colors.text.primary} />
          <Text
            style={{
              color: colors.text.primary,
              fontSize: 13,
              marginTop: commonStyles.spacing.sm,
              fontWeight: "600",
            }}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Generator Options Modal */}
      <Modal
        visible={showGeneratorModal}
        transparent
        animationType="none"
        onRequestClose={hideModal}
      >
        <TouchableWithoutFeedback onPress={hideModal}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.35)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={{
                  width: 320,
                  backgroundColor: colors.background.card,
                  borderRadius: commonStyles.borderRadius.large,
                  padding: 28,
                  alignItems: "center",
                  ...commonStyles.shadow.medium,
                  opacity: modalOpacity,
                  transform: [{ scale: modalScale }],
                }}
              >
                <Text
                  style={{
                    color: colors.text.primary,
                    fontSize: 24,
                    fontWeight: "800",
                    marginBottom: 8,
                  }}
                >
                  Create New Content
                </Text>
                <Text
                  style={{
                    color: colors.text.secondary,
                    fontSize: 16,
                    fontWeight: "500",
                    marginBottom: 24,
                    textAlign: "center",
                  }}
                >
                  Choose your preferred method
                </Text>
                <TouchableOpacity
                  style={{
                    width: "100%",
                    backgroundColor: colors.accent.sage,
                    borderRadius: commonStyles.borderRadius.medium,
                    padding: 18,
                    marginBottom: 16,
                    alignItems: "center",
                    ...commonStyles.shadow.light,
                  }}
                  onPress={() => {
                    hideModal();
                    setActiveMode("mood");
                  }}
                >
                  <Text
                    style={{
                      color: colors.text.light,
                      fontSize: 18,
                      fontWeight: "700",
                      marginBottom: 2,
                    }}
                  >
                    Smart Captions
                  </Text>
                  <Text
                    style={{
                      color: colors.text.light,
                      fontSize: 14,
                      opacity: 0.9,
                      fontWeight: "500",
                    }}
                  >
                    Generate AI-powered captions
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    width: "100%",
                    backgroundColor: colors.accent.orange,
                    borderRadius: commonStyles.borderRadius.medium,
                    padding: 18,
                    marginBottom: 16,
                    alignItems: "center",
                    ...commonStyles.shadow.light,
                  }}
                  onPress={() => {
                    hideModal();
                    setActiveMode("niche");
                  }}
                >
                  <Text
                    style={{
                      color: colors.text.light,
                      fontSize: 18,
                      fontWeight: "700",
                      marginBottom: 2,
                    }}
                  >
                    Hashtag Pro
                  </Text>
                  <Text
                    style={{
                      color: colors.text.light,
                      fontSize: 14,
                      opacity: 0.9,
                      fontWeight: "500",
                    }}
                  >
                    Find trending hashtags
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    width: "100%",
                    backgroundColor: colors.accent.olive,
                    borderRadius: commonStyles.borderRadius.medium,
                    padding: 18,
                    marginBottom: 0,
                    alignItems: "center",
                    ...commonStyles.shadow.light,
                  }}
                  onPress={() => {
                    hideModal();
                    setActiveMode("image");
                  }}
                >
                  <Text
                    style={{
                      color: colors.text.light,
                      fontSize: 18,
                      fontWeight: "700",
                      marginBottom: 2,
                    }}
                  >
                    Image Captions
                  </Text>
                  <Text
                    style={{
                      color: colors.text.light,
                      fontSize: 14,
                      opacity: 0.9,
                      fontWeight: "500",
                    }}
                  >
                    Create image-based captions
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;
