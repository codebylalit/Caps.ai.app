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
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');

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
      handleNavigation("search");
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
            }}
          >
            {/* Header */}
            <View
              style={[
                tw`flex-row justify-between items-center mb-4 ${{
                  backgroundColor: colors.background.card,
                }},
 `,
                { minHeight: 60 },
              ]}
            >
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
                    marginTop: -24,
                    borderWidth: 0.5,
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
                  backgroundColor: colors.background.card,
                  borderRadius: commonStyles.borderRadius.medium,
                  paddingHorizontal: commonStyles.spacing.md,
                  paddingVertical: commonStyles.spacing.md,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 0.5,
                  ...commonStyles.shadow.light,
                }}
              >
                <FontAwesome
                  name="search"
                  size={18}
                  color={colors.text.secondary}
                  style={{ marginRight: commonStyles.spacing.xs }}
                />
                <TextInput
                  placeholder="Search hashtags, captions, or styles..."
                  placeholderTextColor={colors.text.secondary}
                  style={{
                    flex: 1,
                    color: colors.text.primary,
                    fontSize: 16,
                  }}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType="search"
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
                    <Text style={{ color: colors.text.secondary, fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
                      Categories
                    </Text>
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
                          <Text style={{ color: colors.text.primary, fontSize: 12 }}>{category.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Trending Searches */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ color: colors.text.secondary, fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
                      Trending Now
                    </Text>
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
                          <Text style={{ color: colors.text.primary, fontSize: 14, marginRight: 8 }}>#{index + 1}</Text>
                          <Text style={{ color: colors.text.primary, fontSize: 14 }}>{trend.text}</Text>
                        </View>
                        <Text style={{ color: colors.text.secondary, fontSize: 12 }}>{trend.count} posts</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Recent Searches */}
                  {searchQuery.length === 0 && (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ color: colors.text.secondary, fontSize: 14, fontWeight: '600' }}>
                          Recent Searches
                        </Text>
                        {recentSearches.length > 0 && (
                          <TouchableOpacity onPress={clearRecentSearches}>
                            <Text style={{ color: colors.accent.sage, fontSize: 14 }}>Clear All</Text>
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
                            <Text style={{ color: colors.text.primary, fontSize: 14 }}>{search}</Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={{ color: colors.text.secondary, fontSize: 14, textAlign: 'center', padding: 10 }}>
                          No recent searches
                        </Text>
                      )}
                    </>
                  )}

                  {/* Search Suggestions */}
                  {searchQuery.length > 0 && (
                    <>
                      <Text style={{ color: colors.text.secondary, fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
                        Suggestions
                      </Text>
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
                          <Text style={{ color: colors.text.primary, fontSize: 14 }}>{suggestion}</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </View>
              )}
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
            {/* <View style={{ marginBottom: commonStyles.spacing.xl }}>
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
            </View> */}
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
          borderColor: "rgba(0,0,0,0.05)",
          ...commonStyles.shadow.medium,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: Platform.OS === "ios" ? 20 : commonStyles.spacing.md,
          marginHorizontal: 8,
        }}
      >
        <TouchableOpacity
          style={{ alignItems: "center" }}
          onPress={() => animateTab("home")}
        >
          <Animated.View
            style={{
              transform: [{ scale: tabAnimations.home }],
              backgroundColor:
                activeTab === "home"
                  ? colors.accent.sage + "20"
                  : "transparent",
              padding: 12,
              borderRadius: 12,
            }}
          >
            <FontAwesome
              name="home"
              size={22}
              color={
                activeTab === "home"
                  ? colors.accent.sage
                  : colors.text.secondary
              }
            />
          </Animated.View>
          <Text
            style={{
              color:
                activeTab === "home"
                  ? colors.accent.sage
                  : colors.text.secondary,
              fontSize: 12,
              marginTop: 4,
              fontWeight: activeTab === "home" ? "700" : "500",
            }}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ alignItems: "center" }}
          onPress={() => {
            animateTab("create");
            showModal();
          }}
        >
          <Animated.View
            style={{
              transform: [{ scale: tabAnimations.create }],
              backgroundColor:
                activeTab === "create"
                  ? colors.accent.teal + "20"
                  : "transparent",
              padding: 12,
              borderRadius: 12,
            }}
          >
            <FontAwesome
              name="plus"
              size={22}
              color={
                activeTab === "create"
                  ? colors.accent.teal
                  : colors.text.secondary
              }
            />
          </Animated.View>
          <Text
            style={{
              color:
                activeTab === "create"
                  ? colors.accent.teal
                  : colors.text.secondary,
              fontSize: 12,
              marginTop: 4,
              fontWeight: activeTab === "create" ? "700" : "500",
            }}
          >
            Create
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ alignItems: "center" }}
          onPress={() => {
            animateTab("profile");
            user ? setShowProfile(true) : setShowAuth(true);
          }}
        >
          <Animated.View
            style={{
              transform: [{ scale: tabAnimations.profile }],
              backgroundColor:
                activeTab === "profile"
                  ? colors.accent.purple + "20"
                  : "transparent",
              padding: 12,
              borderRadius: 12,
            }}
          >
            <FontAwesome
              name="user"
              size={22}
              color={
                activeTab === "profile"
                  ? colors.accent.purple
                  : colors.text.secondary
              }
            />
          </Animated.View>
          <Text
            style={{
              color:
                activeTab === "profile"
                  ? colors.accent.purple
                  : colors.text.secondary,
              fontSize: 12,
              marginTop: 4,
              fontWeight: activeTab === "profile" ? "700" : "500",
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
                      borderColor: colors.accent.sage,
                      backgroundColor: colors.accent.sage,
                    }}
                    onPress={() => {
                      hideModal();
                      handleNavigation("mood");
                    }}
                  >
                    <FontAwesome
                      name="magic"
                      size={28}
                      color={colors.text.light}
                    />
                    <Text
                      style={{
                        color: colors.text.light,
                        fontSize: 13,
                        marginTop: 8,
                        fontWeight: "600",
                      }}
                    >
                      Caption
                    </Text>
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
                      borderColor: colors.accent.orange,
                      backgroundColor: colors.accent.orange,
                    }}
                    onPress={() => {
                      hideModal();
                      handleNavigation("niche");
                    }}
                  >
                    <FontAwesome
                      name="hashtag"
                      size={28}
                      color={colors.text.light}
                    />
                    <Text
                      style={{
                        color: colors.text.light,
                        fontSize: 13,
                        marginTop: 8,
                        fontWeight: "600",
                      }}
                    >
                      Hashtags
                    </Text>
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
                      borderColor: colors.accent.olive,
                      backgroundColor: colors.accent.olive,
                    }}
                    onPress={() => {
                      hideModal();
                      handleNavigation("image");
                    }}
                  >
                    <FontAwesome
                      name="image"
                      size={28}
                      color={colors.text.light}
                    />
                    <Text
                      style={{
                        color: colors.text.light,
                        fontSize: 13,
                        marginTop: 8,
                        fontWeight: "600",
                      }}
                    >
                      image
                    </Text>
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
    </SafeAreaView>
  );
};

export default HomeScreen;
