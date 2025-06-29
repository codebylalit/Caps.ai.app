import React, { useEffect, useState, useRef } from "react";
import {
  View,
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
  BackHandler,
  Easing,
  ActivityIndicator,
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
import DotsLoader from '../components/DotsLoader';
import AppText from '../components/AppText';

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
        <AppText style={{ color: colors.text.light, flex: 1, fontSize: 16, fontWeight: '500' }}>
          {message}
        </AppText>
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
  <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
    <AppText
      style={[
        tw`text-2xl font-bold`,
        { color: colors.text.primary, marginBottom: 2 },
      ]}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      Hi {name || "there"}
    </AppText>
    <AppText
      style={[
        tw`text-base`,
        { color: colors.text.secondary, fontWeight: "500" },
      ]}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      {greeting}
    </AppText>
  </View>
);

const HomeScreen = ({ setActiveMode, activeMode, onNavigate }) => {
  const { user, supabase } = useAuth();
  const confettiRef = useRef(null);
  const [hasShownCelebration, setHasShownCelebration] = useState(false);
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  // Add these constants
  const TRENDING_SEARCHES = [
    { text: 'Summer Vibes', count: '2.3M' },
    { text: 'Food Photography', count: '1.8M' },
    { text: 'Travel Diary', count: '1.5M' },
    { text: 'Fitness Journey', count: '1.2M' }
  ];

  const SEARCH_CATEGORIES = [
    { icon: 'camera', label: 'Photos' },
    { icon: 'video-camera', label: 'Videos' },
    { icon: 'hashtag', label: 'Hashtags' },
    { icon: 'user', label: 'Users' }
  ];

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
    setLoading(true);
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
            // Only show welcome message if it hasn't been shown before for this user
            const hasShownWelcomeForUser = await AsyncStorage.getItem(`hasShownWelcome_${user.id}`);
            if (!hasShownWelcomeForUser) {
              showNotification('success', 'Welcome back!');
              await AsyncStorage.setItem(`hasShownWelcome_${user.id}`, 'true');
            }
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
      } finally {
        setLoading(false);
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
        setActiveTab('home');
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
      case "meme":
        return colors.accent.yellow;
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
    setActiveTab('home');
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

  const handleModeSelect = (mode) => {
    setTransitionLoading(true);
    setActiveMode(mode);
    onNavigate('generator', mode);
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

  // FeatureCard for content creation (redesigned)
  const FeatureCard = ({ icon, title, description, color, onPress, iconBg }) => {
    const [pressAnim] = useState(new Animated.Value(1));
    const gradientColors = [color, color + 'CC', color + '99'];

    const handlePressIn = () => {
      Animated.spring(pressAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }).start();
    };
    const handlePressOut = () => {
      Animated.spring(pressAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }).start();
    };

    // Helper: check if icon is an emoji (not a FontAwesome name)
    const isEmoji = typeof icon === 'string' && icon.length <= 2 && /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u1F600-\u1F64F]|[\u1F300-\u1F5FF]|[\u1F680-\u1F6FF]|[\u1F1E0-\u1F1FF]/.test(icon);

    return (
      <Animated.View style={{
        transform: [{ scale: pressAnim }],
        marginBottom: commonStyles.spacing.lg,
      }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          style={{
            borderRadius: commonStyles.borderRadius.large,
            overflow: 'hidden',
            ...commonStyles.shadow.medium,
          }}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 32,
              paddingHorizontal: 32,
              borderRadius: commonStyles.borderRadius.large,
              minHeight: 100,
            }}
          >
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 28,
              backgroundColor: iconBg || 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 22,
              shadowColor: color,
              shadowOpacity: 0.18,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}>
              {isEmoji ? (
                <AppText style={{ fontSize: 28, color: colors.text.light, textAlign: 'center' }}>{icon}</AppText>
              ) : (
                <FontAwesome name={icon} size={28} color={colors.text.light} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <AppText
                style={{
                  color: colors.text.light,
                  fontSize: 18,
                  fontWeight: '300',
                  marginBottom: 4,
                  letterSpacing: 0.2,
                }}
              >
                {title}
              </AppText>
              <AppText
                style={{
                  color: colors.text.light,
                  fontSize: 15,
                  opacity: 0.92,
                  fontWeight: '700',
                  lineHeight: 22,
                }}
              >
                {description}
              </AppText>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

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

  // Add this after other useEffect hooks
  useEffect(() => {
    // Load recent searches from AsyncStorage
    const loadRecentSearches = async () => {
      try {
        const searches = await AsyncStorage.getItem('recentSearches');
        if (searches) {
          setRecentSearches(JSON.parse(searches));
        }
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    };
    loadRecentSearches();
  }, []);

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length > 0) {
      setShowSearchResults(true);
      // Simulate search suggestions (replace with actual API call)
      const suggestions = [
        'travel photography',
        'food blogging',
        'fitness journey',
        'fashion trends',
        'nature photography'
      ].filter(item => item.toLowerCase().includes(text.toLowerCase()));
      setSearchSuggestions(suggestions);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleSearchSubmit = async () => {
    if (searchQuery.trim()) {
      // Add to recent searches
      const newRecentSearches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(newRecentSearches);
      try {
        await AsyncStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
      } catch (error) {
        console.error('Error saving recent searches:', error);
      }
      // Handle search submission
      handleModeSelect("search");
    }
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    try {
      await AsyncStorage.removeItem('recentSearches');
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  // Replace getGreetingEmoji with getGreetingIcon
  const getGreetingIcon = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return { name: 'sun-o', color: '#FFD166' }; // Morning ☀️
    }

    if (hour >= 12 && hour < 17) {
      return { name: 'coffee', color: '#FFB347' }; // Afternoon ☕
    }

    if (hour >= 17 && hour < 20) {
      return { name: 'coffee', color: '#FF7043' }; // Evening ☁️ (sunset vibe)
    }

    return { name: 'moon-o', color: '#90CAF9' }; // Night 🌙
  };


  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.main }}>
        <DotsLoader color={colors.accent.sage} size={16} />
      </SafeAreaView>
    );
  }

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
            animateTransition(() => {
              setShowProfile(false);
              setActiveTab('home');
            });
          } else {
            animateTransition(() => setActiveMode(mode));
          }
        }}
        setShowAuth={setShowAuth}
      />
    );
  }

  // Show loader overlay if navigating away
  if (transitionLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.main }}>
        <DotsLoader color={colors.accent.sage} size={16} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={[colors.background.main, '#F5F7FA', '#E8ECF3']}
        style={{ flex: 1 }}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: -10, y: 0 }}
          autoStart={false}
          fadeOut={true}
          colors={["#FFD700", "#FFA500", "#FF69B4", "#87CEEB", "#98FB98"]}
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
                paddingBottom: commonStyles.spacing.xl * 1,
              }}
            >
              {/* Header */}
              <View
                style={{
                  borderRadius: commonStyles.borderRadius.large,
                  marginBottom: 12,
                  paddingVertical: 20,
                  paddingHorizontal: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 54,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText
                    style={{
                      color: colors.text.primary,
                      fontSize: 48,
                      fontWeight: '300',
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {`Hi, ${(localUser?.name || displayName || 'there')}`}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppText
                      style={{
                        color: colors.text.secondary,
                        fontSize: 18,
                        fontWeight: '700',
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {currentGreeting}
                    </AppText>
                    <FontAwesome
                      name={getGreetingIcon().name}
                      size={20}
                      color={getGreetingIcon().color}
                      style={{ marginLeft: 6, marginTop: 4 }}
                    />
                  </View>
                </View>
                {user ? (
                  <TouchableOpacity
                    onPress={handleProfilePress}
                    style={{
                      backgroundColor: colors.accent.sage,
                      width: 80,
                      height: 80,
                      borderRadius: 50,
                      marginTop: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      ...commonStyles.shadow.medium,
                      flexShrink: 0,
                      borderWidth: 1,
                      borderColor: colors.background.main,
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      source={{
                        uri: `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(localUser?.name || displayName || "User")}`,
                      }}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 22,
                        backgroundColor: 'white',
                      }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleModeSelect("credits")}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: themeColor,
                      flexShrink: 0,
                      borderWidth: 1,
                      borderColor: colors.background.main,
                      ...commonStyles.shadow.light,
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faCoins}
                      size={14}
                      color={colors.text.light}
                      style={{ marginRight: 6 }}
                    />
                    <AppText
                      style={{
                        color: colors.text.light,
                        fontSize: 18,
                        fontWeight: '700',
                      }}
                    >
                      {MAX_ANONYMOUS_GENERATIONS - anonymousUsageCount}
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Bar */}
              <View style={{ marginBottom: commonStyles.spacing.xl + 10 }}>
                <View
                  style={{
                    borderRadius: 24,
                    paddingHorizontal: 22,
                    paddingVertical: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    ...commonStyles.shadow.light,
                  }}
                >
                  <FontAwesome
                    name="search"
                    size={20}
                    color={colors.text.secondary}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    placeholder="Search hashtags, captions, or styles..."
                    placeholderTextColor={colors.text.secondary}
                    style={{
                      flex: 1,
                      color: colors.text.primary,
                      fontSize: 17,
                      fontWeight: '500',
                    }}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                    selectionColor={colors.accent.sage}
                    underlineColorAndroid="transparent"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchQuery("");
                        setShowSearchResults(false);
                      }}
                      style={{ padding: 5 }}
                    >
                      <FontAwesome name="times-circle" size={18} color={colors.text.secondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <View
                  style={{
                    position: 'absolute',
                    top: 60,
                    left: 0,
                    right: 0,
                    backgroundColor: colors.background.card,
                    borderRadius: commonStyles.borderRadius.medium,
                    padding: commonStyles.spacing.md,
                    zIndex: 1000,
                    ...commonStyles.shadow.medium,
                  }}
                >
                  {/* Categories */}
                  <View style={{ marginBottom: 15 }}>
                    <AppText style={{ color: colors.text.secondary, fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
                      Categories
                    </AppText>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      {SEARCH_CATEGORIES.map((category, index) => (
                        <TouchableOpacity
                          key={index}
                          style={{
                            alignItems: 'center',
                            width: '23%',
                          }}
                          onPress={() => setActiveFilter(category.label.toLowerCase())}
                        >
                          <View
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 25,
                              backgroundColor: colors.background.main,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: 5,
                              borderWidth: 1,
                              borderColor: activeFilter === category.label.toLowerCase() ? colors.accent.sage : colors.background.main,
                            }}
                          >
                            <FontAwesome name={category.icon} size={20} color={colors.text.primary} />
                          </View>
                          <AppText style={{ color: colors.text.primary, fontSize: 12 }}>{category.label}</AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Trending Searches */}
                  <View style={{ marginBottom: 15 }}>
                    <AppText style={{ color: colors.text.secondary, fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
                      Trending Now
                    </AppText>
                    {TRENDING_SEARCHES.map((trend, index) => (
                      <TouchableOpacity
                        key={index}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 8,
                          borderBottomWidth: index < TRENDING_SEARCHES.length - 1 ? 1 : 0,
                          borderBottomColor: colors.background.main,
                        }}
                        onPress={() => {
                          setSearchQuery(trend.text);
                          handleSearchSubmit();
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <AppText style={{ color: colors.text.primary, fontSize: 14, marginRight: 8 }}>#{index + 1}</AppText>
                          <AppText style={{ color: colors.text.primary, fontSize: 14 }}>{trend.text}</AppText>
                        </View>
                        <AppText style={{ color: colors.text.secondary, fontSize: 12 }}>{trend.count} posts</AppText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Recent Searches */}
                  {searchQuery.length === 0 && (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <AppText style={{ color: colors.text.secondary, fontSize: 14, fontWeight: '600' }}>
                          Recent Searches
                        </AppText>
                        {recentSearches.length > 0 && (
                          <TouchableOpacity onPress={clearRecentSearches}>
                            <AppText style={{ color: colors.accent.sage, fontSize: 14 }}>Clear All</AppText>
                          </TouchableOpacity>
                        )}
                      </View>
                      {recentSearches.length > 0 ? (
                        recentSearches.map((search, index) => (
                          <TouchableOpacity
                            key={index}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 10,
                              borderBottomWidth: index < recentSearches.length - 1 ? 1 : 0,
                              borderBottomColor: colors.background.main,
                            }}
                            onPress={() => {
                              setSearchQuery(search);
                              handleSearchSubmit();
                            }}
                          >
                            <FontAwesome name="history" size={16} color={colors.text.secondary} style={{ marginRight: 10 }} />
                            <AppText style={{ color: colors.text.primary, fontSize: 14 }}>{search}</AppText>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <AppText style={{ color: colors.text.secondary, fontSize: 14, textAlign: 'center', padding: 10 }}>
                          No recent searches
                        </AppText>
                      )}
                    </>
                  )}

                  {/* Search Suggestions */}
                  {searchQuery.length > 0 && (
                    <>
                      <AppText style={{ color: colors.text.secondary, fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
                        Suggestions
                      </AppText>
                      {searchSuggestions.map((suggestion, index) => (
                        <TouchableOpacity
                          key={index}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 10,
                            borderBottomWidth: index < searchSuggestions.length - 1 ? 1 : 0,
                            borderBottomColor: colors.background.main,
                          }}
                          onPress={() => {
                            setSearchQuery(suggestion);
                            handleSearchSubmit();
                          }}
                        >
                          <FontAwesome name="search" size={16} color={colors.text.secondary} style={{ marginRight: 10 }} />
                          <AppText style={{ color: colors.text.primary, fontSize: 14 }}>{suggestion}</AppText>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </View>
              )}

              {/* Content Creation Section (minimal, no section title/subtitle) */}
              <View style={{ marginBottom: commonStyles.spacing.lg }}>
                <View style={{ flexDirection: "column" }}>
                  <FeatureCard
                    icon="magic"
                    title="Smart Captions"
                    description="AI-powered captions"
                    color={colors.accent.beige}
                    onPress={() => {
                      setTransitionLoading(true);
                      setTimeout(() => {
                        handleModeSelect("mood");
                      }, 400);
                    }}
                  />
                  <FeatureCard
                    icon="hashtag"
                    title="Hashtag Pro"
                    description="Trending hashtags"
                    color={colors.accent.teal}
                    onPress={() => {
                      setTransitionLoading(true);
                      setTimeout(() => {
                        handleModeSelect("niche");
                      }, 400);
                    }}
                  />
                  <FeatureCard
                    icon="image"
                    title="Image Captions"
                    description="Vision-based captions"
                    color={colors.accent.sage}
                    onPress={() => {
                      setTransitionLoading(true);
                      setTimeout(() => {
                        handleModeSelect("image");
                      }, 400);
                    }}
                  />
                  <FeatureCard
                    icon="smile-o"
                    title="Meme Generator"
                    description="Create viral memes with AI"
                    color={colors.accent.yellowDark}
                    onPress={() => {
                      setTransitionLoading(true);
                      setTimeout(() => {
                        onNavigate("meme");
                      }, 400);
                    }}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
          {/* Add bottom padding to prevent content from being too close to nav */}
          {/* This should be inside the ScrollView, not after it */}
          <View style={{ height: 32 }} />
        </Animated.View>

        {/* Minimal Modern Bottom Navigation */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 10,
            paddingHorizontal: 28,
            backgroundColor: 'rgba(255,255,255,0.85)',
            borderRadius: 32,
            position: "absolute",
            left: 24,
            right: 24,
            bottom: Platform.OS === "ios" ? 28 : 18,
            shadowColor: colors.shadow.dark,
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 2 },
            elevation: 6,
          }}
        >
          <TouchableOpacity
            style={{ alignItems: "center", flex: 1 }}
            onPress={() => animateTab("home")}
          >
            <Animated.View
              style={{
                transform: [{ scale: tabAnimations.home }],
                backgroundColor: 'transparent',
                padding: 8,
                borderRadius: 16,
              }}
            >
              <FontAwesome
                name="home"
                size={26}
                color={colors.accent.sage}
              />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: "center", flex: 1 }}
            onPress={() => {
              animateTab("create");
              showModal();
            }}
          >
            <Animated.View
              style={{
                transform: [{ scale: tabAnimations.create }],
                backgroundColor: 'transparent',
                padding: 8,
                borderRadius: 16,
              }}
            >
              <FontAwesome
                name="plus"
                size={26}
                color={colors.text.secondary}
              />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: "center", flex: 1 }}
            onPress={() => {
              animateTab("profile");
              user ? setShowProfile(true) : setShowAuth(true);
            }}
          >
            <Animated.View
              style={{
                transform: [{ scale: tabAnimations.profile }],
                backgroundColor: 'transparent',
                padding: 8,
                borderRadius: 16,
              }}
            >
              <FontAwesome
                name="user"
                size={26}
                color={colors.text.secondary}
              />
            </Animated.View>
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
                backgroundColor: "rgba(0,0,0,0.8)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <TouchableWithoutFeedback>
                <Animated.View
                  style={{
                    width: 280,
                    padding: 20,
                    alignItems: "center",
                    opacity: modalOpacity,
                    transform: [{ scale: modalScale }],
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: 20,
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        width: 90,
                        height: 90,
                        borderRadius: 12,
                        padding: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1.5,
                        backgroundColor: colors.accent.beige,
                      }}
                      onPress={() => {
                        hideModal();
                        handleModeSelect("mood");
                      }}
                    >
                      <FontAwesome
                        name="magic"
                        size={28}
                        color={colors.text.light}
                      />
                      <AppText
                        style={{
                          color: colors.text.light,
                          fontSize: 13,
                          marginTop: 8,
                          fontWeight: "600",
                        }}
                      >
                        Caption
                      </AppText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        width: 90,
                        height: 90,
                        borderRadius: 12,
                        padding: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1.5,
                        borderColor: colors.accent.teal,
                        backgroundColor: colors.accent.teal,
                      }}
                      onPress={() => {
                        hideModal();
                        handleModeSelect("niche");
                      }}
                    >
                      <FontAwesome
                        name="hashtag"
                        size={28}
                        color={colors.text.light}
                      />
                      <AppText
                        style={{
                          color: colors.text.light,
                          fontSize: 13,
                          marginTop: 8,
                          fontWeight: "600",
                        }}
                      >
                        Hashtags
                      </AppText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        width: 90,
                        height: 90,
                        borderRadius: 12,
                        padding: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1.5,
                        borderColor: colors.accent.sage,
                        backgroundColor: colors.accent.sage,
                      }}
                      onPress={() => {
                        hideModal();
                        handleModeSelect("image");
                      }}
                    >
                      <FontAwesome
                        name="image"
                        size={28}
                        color={colors.text.light}
                      />
                      <AppText
                        style={{
                          color: colors.text.light,
                          fontSize: 13,
                          marginTop: 8,
                          fontWeight: "600",
                        }}
                      >
                        image
                      </AppText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        width: 90,
                        height: 90,
                        borderRadius: 12,
                        padding: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1.5,
                        borderColor: colors.accent.yellowDark,
                        backgroundColor: colors.accent.yellowDark,
                      }}
                      onPress={() => {
                        hideModal();
                        setTransitionLoading(true);
                        onNavigate("meme");
                      }}
                    >
                      <FontAwesome
                        name="smile-o"
                        size={28}
                        color={colors.text.light}
                      />
                      <AppText
                        style={{
                          color: colors.text.light,
                          fontSize: 13,
                          marginTop: 8,
                          fontWeight: "600",
                        }}
                      >
                        AI Memes
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Auth Screen Modal */}
        {authScreenVisible && (
          <View
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <AuthScreen onClose={handleAuthClose} />
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

export default HomeScreen;
