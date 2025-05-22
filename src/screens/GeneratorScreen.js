import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar,
  BackHandler,
  Animated,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import AuthScreen from "./AuthScreen";
import UserDashboard from "./UserDashboard";
import GeneratorContent from "./GeneratorLogic";
import { useAuth } from "../hooks/useAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUsageTracking } from "../hooks/useFreeCredits";
import { colors, commonStyles } from "../theme/colors";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faCoins } from '@fortawesome/free-solid-svg-icons';

export const API_CONFIG = {
  BASE_URL:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  KEY: "AIzaSyCK3_EjIpgEJ5QXwT0tkyFGfEZvixYLBM8",
};

const LoadingAnimation = ({ type }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getIcon = () => {
    switch (type) {
      case "mood":
        return "magic";
      case "niche":
        return "hashtag";
      case "image":
        return "image";
      case "textbehind":
        return "text-width";
      default:
        return "magic";
    }
  };

  const getText = () => {
    switch (type) {
      case "mood":
        return "Creating smart captions...";
      case "niche":
        return "Finding trending hashtags...";
      case "image":
        return "Analyzing image...";
      case "textbehind":
        return "Processing text overlay...";
      default:
        return "Generating content...";
    }
  };

  const getThemeColor = () => {
    switch (type) {
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

  return (
    <View
      style={[
        tw`flex-1 items-center justify-center`,
        { backgroundColor: colors.background.main },
      ]}
    >
      <Animated.View
        style={[
          tw`items-center`,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View
          style={[
            tw`w-16 h-16 rounded-full items-center justify-center mb-6`,
            { backgroundColor: themeColor + "15" },
          ]}
        >
          <FontAwesome name={getIcon()} size={24} color={themeColor} />
        </View>

        <Text
          style={[tw`text-base font-medium`, { color: colors.text.primary }]}
        >
          {getText()}
        </Text>
      </Animated.View>
    </View>
  );
};

const GeneratorScreen = ({ activeMode, setActiveMode }) => {
  const { user, userProfile, supabase, fetchUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("generator");
  const [showAuth, setShowAuth] = useState(false);
  const [history, setHistory] = useState([]);
  const [userCredits, setUserCredits] = useState(0);
  const {
    anonymousUsageCount,
    incrementAnonymousUsage,
    MAX_ANONYMOUS_GENERATIONS,
  } = useUsageTracking();
  const [fadeAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(0));
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (user && userProfile) {
      setUserCredits(userProfile.credits);
      fetchHistory();
    }
  }, [user, userProfile]);

  // Handle dashboard:tab mode format
  useEffect(() => {
    if (activeMode?.startsWith("dashboard:")) {
      const tab = activeMode.split(":")[1];
      setActiveTab(tab);
    }
  }, [activeMode]);

  // Add back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (activeTab !== "generator") {
          setActiveTab("generator");
          return true;
        }
        setActiveMode(null);
        return true;
      }
    );

    return () => backHandler.remove();
  }, [activeTab]);

  const fetchHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("caption_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const deductCredit = async () => {
    if (!user || !userProfile) return false;

    try {
      const newCredits = userProfile.credits - 1;
      const { data, error } = await supabase
        .from("profiles")
        .update({ credits: newCredits })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      await fetchUserProfile(user.id);
      setUserCredits(newCredits);
      return true;
    } catch (error) {
      console.error("Error deducting credit:", error);
      return false;
    }
  };

  const deleteHistoryItem = async (id) => {
    try {
      const { data: existingItem, error: checkError } = await supabase
        .from("caption_history")
        .select("*")
        .eq("id", id)
        .single();

      if (checkError) {
        console.error("Error checking item:", checkError);
        Alert.alert("Error", "Could not find the item to delete");
        return;
      }

      const { error: deleteError } = await supabase
        .from("caption_history")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Deletion error details:", deleteError);
        throw deleteError;
      }

      fetchHistory();
      Alert.alert("Success", "History item deleted successfully");
    } catch (error) {
      console.error("Error deleting history item:", error);
      Alert.alert(
        "Error",
        "Failed to delete history item. Please check your permissions and try again."
      );
    }
  };

  const animateTransition = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleBack = () => {
    animateTransition(() => {
      if (activeTab !== "generator") {
        setActiveTab("generator");
      } else {
        setActiveMode(null);
      }
    });
  };

  const handleTabChange = (tab) => {
    animateTransition(() => setActiveTab(tab));
  };

  const getScreenTitle = () => {
    switch (activeTab) {
      case "generator":
        return activeMode === "mood"
          ? "Smart Captions"
          : activeMode === "niche"
          ? "Hashtag Pro"
          : activeMode === "image"
          ? "Image Captions"
          : "Generator";
      case "history":
        return "Generation History";
      case "credits":
        return "Credits";
      case "transactions":
        return "Transaction History";
      default:
        return "";
    }
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.main }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.main}
      />
      {showAuth ? (
        <AuthScreen onClose={() => setShowAuth(false)} />
      ) : (
        <>
          <Animated.View
            style={{
              flex: 1,
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            <View style={tw`flex-1`}>
              {activeTab === "generator" && (
                <>
                  {isGenerating ? (
                    <LoadingAnimation type={activeMode} />
                  ) : (
                    <>
                      {/* Back button and Credits */}
                      <View
                        style={[
                          tw`flex-row items-center px-4 py-3 pb-2 pt-6`,
                          { backgroundColor: colors.background.sage },
                        ]}
                      >
                        <TouchableOpacity
                          onPress={handleBack}
                          style={[
                            tw`p-2 rounded-xl`,
                            { backgroundColor: themeColor },
                          ]}
                        >
                          <FontAwesome
                            name="arrow-left"
                            size={14}
                            color="white"
                          />
                        </TouchableOpacity>
                        <Text
                          style={[
                            tw`text-lg font-semibold flex-1 ml-3`,
                            { color: colors.text.primary },
                          ]}
                        >
                          {getScreenTitle()}
                        </Text>
                        {user ? (
                          userCredits > 0 && (
                            <TouchableOpacity
                              onPress={() => handleTabChange("credits")}
                              style={[
                                tw`flex-row items-center px-3 py-1.5 rounded-full`,
                                { backgroundColor: themeColor },
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
                                {userCredits}
                              </Text>
                            </TouchableOpacity>
                          )
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleTabChange("credits")}
                            style={[
                              tw`flex-row items-center px-3 py-1.5 rounded-full`,
                              { backgroundColor: themeColor },
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

                      <ScrollView
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={false}
                      >
                        <GeneratorContent
                          activeMode={activeMode}
                          setActiveMode={setActiveMode}
                          user={user}
                          supabase={supabase}
                          userCredits={userCredits}
                          deductCredit={deductCredit}
                          API_CONFIG={API_CONFIG}
                          anonymousUsageCount={anonymousUsageCount}
                          MAX_ANONYMOUS_GENERATIONS={MAX_ANONYMOUS_GENERATIONS}
                          incrementAnonymousUsage={incrementAnonymousUsage}
                          themeColor={themeColor}
                          setShowAuth={setShowAuth}
                        />
                      </ScrollView>
                    </>
                  )}
                </>
              )}
              {(activeTab === "history" ||
                activeTab === "credits" ||
                activeTab === "transactions") && (
                <UserDashboard
                  activeTab={activeTab}
                  user={user}
                  history={history}
                  setShowAuth={setShowAuth}
                  setActiveMode={setActiveMode}
                  deleteHistoryItem={deleteHistoryItem}
                  supabase={supabase}
                  setActiveTab={setActiveTab}
                  activeMode={activeMode}
                />
              )}
            </View>
          </Animated.View>

          {/* Bottom Navigation */}
          <View
            style={[
              tw`flex-row justify-around`,
              {
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
                paddingBottom:
                  Platform.OS === "ios" ? 20 : commonStyles.spacing.md,
                marginHorizontal: 8,
              },
            ]}
          >
            {[
              { id: "generator", icon: "magic", label: "Generator" },
              { id: "history", icon: "history", label: "History" },
              { id: "credits", icon: "money", label: "Credits" },
              { id: "transactions", icon: "list", label: "Transactions" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={tw`flex-1 items-center`}
                onPress={() => handleTabChange(tab.id)}
              >
                <FontAwesome
                  name={tab.icon}
                  size={22}
                  color={
                    activeTab === tab.id
                      ? getThemeColor()
                      : colors.text.secondary
                  }
                />
                <Text
                  style={[
                    tw`text-xs mt-1`,
                    {
                      color:
                        activeTab === tab.id
                          ? getThemeColor()
                          : colors.text.secondary,
                      fontWeight: activeTab === tab.id ? "700" : "500",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default GeneratorScreen;
