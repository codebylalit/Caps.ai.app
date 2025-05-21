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

export const API_CONFIG = {
  BASE_URL:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  KEY: "AIzaSyCK3_EjIpgEJ5QXwT0tkyFGfEZvixYLBM8",
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

  useEffect(() => {
    if (user && userProfile) {
      setUserCredits(userProfile.credits);
      fetchHistory();
    }
  }, [user, userProfile]);

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

  const handleBack = () => {
    if (activeTab !== "generator") {
      setActiveTab("generator");
    } else {
      setActiveMode(null);
    }
  };

  const getScreenTitle = () => {
    switch (activeTab) {
      case "generator":
        return activeMode === "mood" ? "Smart Captions" :
               activeMode === "niche" ? "Hashtag Pro" :
               activeMode === "image" ? "Image Captions" : "Generator";
      case "history":
        return "Generation History";
      case "credits":
        return "Credits";
      case "transactions":
        return "Transactions";
      default:
        return "";
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.main }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.main} />
      {showAuth ? (
        <AuthScreen onClose={() => setShowAuth(false)} />
      ) : (
        <>
          <View style={tw`flex-1`}>
            {activeTab === "generator" && (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* Back button and Credits */}
                <View style={[
                  tw`flex-row items-center px-4 py-3 pb-2`, // Adjusted padding
                  { backgroundColor: colors.background.main }, // Keep background consistent
                ]}>
                  <TouchableOpacity
                    onPress={handleBack}
                    style={tw`p-2`}
                  >
                    <FontAwesome
                      name="chevron-left"
                      size={16}
                      color={colors.text.primary}
                    />
                  </TouchableOpacity>
                  <Text style={[ // Add title here as well for context
                    tw`text-lg font-semibold flex-1 ml-3`,
                    { color: colors.text.primary }
                  ]}>
                    {getScreenTitle()}
                  </Text>
                  {user && userCredits > 0 && (
                    <View style={[
                      tw`px-3 py-1.5 rounded-full`,
                      { backgroundColor: colors.accent.sage }, // Accent color for credits
                    ]}>
                      <Text style={[tw`text-sm font-medium`, { color: colors.text.light }]}>
                        {userCredits} Credits
                      </Text>
                    </View>
                  )}
                </View>

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
                />
              </ScrollView>
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
              />
            )}
          </View>

          {/* Bottom Navigation */}
          <View style={[
            tw`flex-row`,
            { 
              backgroundColor: colors.background.main,
              borderTopWidth: 1,
              borderTopColor: colors.border.light,
              ...commonStyles.shadow.medium,
            }
          ]}>
            {[
              { id: "generator", icon: "magic", label: "Generator" },
              { id: "history", icon: "history", label: "History" },
              { id: "credits", icon: "money", label: "Credits" },
              { id: "transactions", icon: "list", label: "Transactions" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  tw`flex-1 py-4 items-center`,
                  { backgroundColor: colors.background.main }
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <FontAwesome
                  name={tab.icon}
                  size={20}
                  color={activeTab === tab.id ? colors.accent.sage : colors.text.muted}
                />
                <Text
                  style={[
                    tw`text-xs mt-1`,
                    { 
                      color: activeTab === tab.id ? colors.accent.sage : colors.text.muted,
                      fontWeight: activeTab === tab.id ? '600' : '500'
                    }
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
