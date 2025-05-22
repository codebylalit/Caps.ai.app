import React, { useEffect, useState, useRef } from "react";
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
  BackHandler,
  Easing,
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
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCoins } from "@fortawesome/free-solid-svg-icons";
import ConfettiCannon from 'react-native-confetti-cannon';

// Add new themed components
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
      case 'success':
        return { backgroundColor: colors.accent.orange, icon: 'check-circle' };
      case 'error':
        return { backgroundColor: colors.accent.sage, icon: 'exclamation-circle' };
      case 'warning':
        return { backgroundColor: colors.accent.olive, icon: 'exclamation-triangle' };
      case 'info':
        return { backgroundColor: colors.accent.blue, icon: 'info-circle' };
      default:
        return { backgroundColor: colors.accent.sage, icon: 'info-circle' };
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

const ThemedWelcomeMessage = ({ name, greeting }) => (
  <View style={{ marginBottom: commonStyles.spacing.lg }}>
    <Text
      style={[
        tw`text-3xl font-bold`,
        { color: colors.text.primary },
      ]}
    >
      Hi {name || "there"}
    </Text>
    <Text
      style={[
        tw`text-lg`,
        { color: colors.text.secondary, fontWeight: "500" },
      ]}
    >
      {greeting}
    </Text>
  </View>
);

const HomeScreen = ({ setActiveMode, activeMode  }) => {
  const { user, supabase } = useAuth();
  const confettiRef = useRef(null);
  const [hasShownCelebration, setHasShownCelebration] = useState(false);
  const [notification, setNotification] = useState(null);

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
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [authScreenVisible, setAuthScreenVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const tabAnimations = {
    home: new Animated.Value(1),
    create: new Animated.Value(1),
    profile: new Animated.Value(1),
  };

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
            showNotification('error', 'Failed to load profile data');
          } else {
            setDisplayName(data?.name || "User");
            showNotification('success', 'Welcome back!');
          }
        }

        // Check if we should show celebration
        const hasShownCelebrationBefore = await AsyncStorage.getItem("hasShownCelebration");
        if (!hasShownCelebrationBefore && !user) {
          setHasShownCelebration(true);
          await AsyncStorage.setItem("hasShownCelebration", "true");
          // Trigger confetti after a short delay
          setTimeout(() => {
            if (confettiRef.current) {
              confettiRef.current.start();
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Error during initialization:", error);
        showNotification('error', 'Failed to initialize app');
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

  // Add back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showGeneratorModal) {
        hideModal();
        return true;
      }
      if (showProfile) {
        setShowProfile(false);
        return true;
      }
      if (showAuth) {
        setShowAuth(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [showGeneratorModal, showProfile, showAuth]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showNotification('success', 'Successfully logged out');
    } catch (error) {
      console.error("Error signing out:", error.message);
      showNotification('error', 'Failed to log out. Please try again.');
    }
  };

  const handleLogin = () => {
    setAuthScreenVisible(true);
    showNotification('info', 'Please sign in to continue');
  };

  const handleAuthClose = () => {
    setAuthScreenVisible(false);
  };

    const getThemeColor = () => {
      switch (activeMode) {
        case "mood":
          return colors.accent.sage;
        case "niche":
          return colors.accent.orange;
        case "image":
          return colors.accent.olive;
        case "textbehind":
          return colors.accent.purple;
        default:
          return colors.accent.sage;
      }
    };
  
    const themeColor = getThemeColor();

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

  const animateTransition = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
    ]).start(() => {
      callback();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();
    });
  };

  const handleNavigation = (mode) => {
    animateTransition(() => setActiveMode(mode));
  };

  const animateTab = (tabName) => {
    // Reset all tabs
    Object.keys(tabAnimations).forEach(key => {
      Animated.timing(tabAnimations[key], {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    });

    // Animate selected tab
    Animated.timing(tabAnimations[tabName], {
      toValue: 1.2,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    setActiveTab(tabName);
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
      onPress={() => animateTransition(onPress)}
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

  // Update profile button
  const handleProfilePress = () => {
    animateTransition(() => setShowProfile(true));
  };

  // Add notification handler
  const showNotification = (type, message, duration = 3000) => {
    setNotification({ type, message });
    if (duration) {
      setTimeout(() => setNotification(null), duration);
    }
  };

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  if (showAuth) {
    return <AuthScreen onClose={() => setShowAuth(false)} />;
  }

  if (showProfile) {
    return (
      <ProfileScreen
        setActiveMode={(mode) => {
          if (mode === null) {
            animateTransition(() => setShowProfile(false));
          } else {
            animateTransition(() => setActiveMode(mode));
          }
        }}
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
      <ConfettiCannon
        ref={confettiRef}
        count={200}
        origin={{x: -10, y: 0}}
        autoStart={false}
        fadeOut={true}
        colors={['#FFD700', '#FFA500', '#FF69B4', '#87CEEB', '#98FB98']}
      />
      {/* Add notification component */}
      {notification && (
        <ThemedNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View
            style={{
              paddingHorizontal: commonStyles.spacing.xl,
              paddingTop: commonStyles.spacing.xl,
            }}
          >
            {/* Header */}
            <View style={[
              tw`flex-row justify-between items-center mb-4`,
              { minHeight: 60 }
            ]}>
              <View style={tw`flex-1 mr-4`}>
                <ThemedWelcomeMessage
                  name={localUser?.name || displayName}
                  greeting={currentGreeting}
                />
              </View>
              {user ? (
                <TouchableOpacity
                  onPress={handleProfilePress}
                  style={{
                    backgroundColor: colors.accent.sage,
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    alignItems: "center",
                    justifyContent: "center",
                    ...commonStyles.shadow.light,
                    flexShrink: 0,
                    marginTop: -24
                  }}
                >
                  <Text
                    style={{
                      color: colors.text.light,
                      fontSize: 18,
                      fontWeight: "700",
                      textTransform: "uppercase",
                    }}
                  >
                    {(localUser?.name || displayName || "U")[0]}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => handleNavigation("credits")}
                  style={[
                    tw`flex-row items-center px-4 py-2 rounded-full`,
                    { backgroundColor: themeColor },
                    { flexShrink: 0, marginTop: -24 },
                  ]}
                >
                  <FontAwesomeIcon
                    icon={faCoins}
                    size={12}
                    color={colors.text.light}
                    style={tw`mr-1.5`}
                  />
                  <Text
                    style={[
                      tw`text-sm font-semibold`,
                      { color: colors.text.light },
                    ]}
                  >
                    {MAX_ANONYMOUS_GENERATIONS - anonymousUsageCount}
                  </Text>
                </TouchableOpacity>
              )}
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
                  onPress={() => handleNavigation("mood")}
                />
                <FeatureCard
                  icon="hashtag"
                  title="Hashtag Pro"
                  description="Trending hashtags"
                  color={colors.accent.orange}
                  onPress={() => handleNavigation("niche")}
                />
                <FeatureCard
                  icon="image"
                  title="Image Captions"
                  description="Vision-based captions"
                  color={colors.accent.olive}
                  onPress={() => handleNavigation("image")}
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
      </Animated.View>

      {/* Modern Bottom Navigation */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: commonStyles.spacing.md,
          backgroundColor: colors.background.main,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: 'rgba(0,0,0,0.05)',
          ...commonStyles.shadow.medium,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: Platform.OS === 'ios' ? 20 : commonStyles.spacing.md,
          marginHorizontal: 8,
        }}
      >
        <TouchableOpacity 
          style={{ alignItems: "center" }}
          onPress={() => animateTab('home')}
        >
          <Animated.View
            style={{
              transform: [{ scale: tabAnimations.home }],
              backgroundColor: activeTab === 'home' ? colors.accent.sage + '20' : 'transparent',
              padding: 12,
              borderRadius: 12,
            }}
          >
            <FontAwesome 
              name="home" 
              size={22} 
              color={activeTab === 'home' ? colors.accent.sage : colors.text.secondary} 
            />
          </Animated.View>
          <Text
            style={{
              color: activeTab === 'home' ? colors.accent.sage : colors.text.secondary,
              fontSize: 12,
              marginTop: 4,
              fontWeight: activeTab === 'home' ? "700" : "500",
            }}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ alignItems: "center" }}
          onPress={() => {
            animateTab('create');
            showModal();
          }}
        >
          <Animated.View
            style={{
              transform: [{ scale: tabAnimations.create }],
              backgroundColor: activeTab === 'create' ? colors.accent.orange + '20' : 'transparent',
              padding: 12,
              borderRadius: 12,
            }}
          >
            <FontAwesome 
              name="plus" 
              size={22} 
              color={activeTab === 'create' ? colors.accent.orange : colors.text.secondary} 
            />
          </Animated.View>
          <Text
            style={{
              color: activeTab === 'create' ? colors.accent.orange : colors.text.secondary,
              fontSize: 12,
              marginTop: 4,
              fontWeight: activeTab === 'create' ? "700" : "500",
            }}
          >
            Create
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ alignItems: "center" }}
          onPress={() => {
            animateTab('profile');
            user ? setShowProfile(true) : setShowAuth(true);
          }}
        >
          <Animated.View
            style={{
              transform: [{ scale: tabAnimations.profile }],
              backgroundColor: activeTab === 'profile' ? colors.accent.purple + '20' : 'transparent',
              padding: 12,
              borderRadius: 12,
            }}
          >
            <FontAwesome 
              name="user" 
              size={22} 
              color={activeTab === 'profile' ? colors.accent.purple : colors.text.secondary} 
            />
          </Animated.View>
          <Text
            style={{
              color: activeTab === 'profile' ? colors.accent.purple : colors.text.secondary,
              fontSize: 12,
              marginTop: 4,
              fontWeight: activeTab === 'profile' ? "700" : "500",
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
                    handleNavigation("mood");
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
                    handleNavigation("niche");
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
                    marginBottom: 16,
                    alignItems: "center",
                    ...commonStyles.shadow.light,
                  }}
                  onPress={() => {
                    hideModal();
                    handleNavigation("image");
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

      {/* Auth Screen Modal */}
      {authScreenVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <AuthScreen onClose={handleAuthClose} />
        </View>
      )}
    </SafeAreaView>
  );
};

export default HomeScreen;
