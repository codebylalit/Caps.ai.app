import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Text, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { createClient } from "@supabase/supabase-js";
import AuthScreen from "./auth";
import UserDashboard from "./dashboard";
import GeneratorContent from "./generatorlogic";
import { useAuth } from "../authcontext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUsageTracking } from "./freecredits";

const supabase = createClient(
  "https://dmnpjqczfykzvrdjzodt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbnBqcWN6ZnlrenZyZGp6b2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMjcxNzUsImV4cCI6MjA1MjYwMzE3NX0.l8zF00ZssGO7HDJnPMHpFrFyTRkIDU3JHQeESe_OyPk"
);

export const API_CONFIG = {
  BASE_URL:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  KEY: "AIzaSyCK3_EjIpgEJ5QXwT0tkyFGfEZvixYLBM8",
};

const GeneratorScreen = ({ activeMode, setActiveMode }) => {
  const { user, supabase } = useAuth();
  const [activeTab, setActiveTab] = useState("generator");
  const [showAuth, setShowAuth] = useState(false);
  const [history, setHistory] = useState([]);
  const [userCredits, setUserCredits] = useState(0);
  const {
    anonymousUsageCount,
    incrementAnonymousUsage,
    MAX_ANONYMOUS_GENERATIONS,
  } = useUsageTracking(); // Add usage tracking hook

  useEffect(() => {
    if (user) {
      fetchUserCredits();
      fetchHistory();
    }
  }, [user]);

  const fetchUserCredits = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (!data || data.credits === null) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ credits: 10 })
          .eq("id", user.id);

        if (updateError) throw updateError;
        setUserCredits(10);
      } else {
        setUserCredits(data.credits);
      }
    } catch (error) {
      console.error("Error fetching/initializing credits:", error);
      setUserCredits(0);
    }
  };

  const fetchHistory = async () => {
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
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ credits: userCredits - 1 })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      setUserCredits(data.credits);
    } catch (error) {
      console.error("Error deducting credit:", error);
      throw error;
    }
  };

  const getThemeColors = () => {
    switch (activeMode) {
      case "mood":
        return {
          bg: "bg-orange-200",
          text: "text-orange-600",
          iconColor: "#FB923C",
        };
      case "niche":
        return {
          bg: "bg-violet-200",
          text: "text-violet-600",
          iconColor: "#8B5CF6",
        };
      case "image":
        return {
          bg: "bg-green-200",
          text: "text-green-600",
          iconColor: "#34D399",
        };
      default:
        return {
          bg: "bg-orange-200",
          text: "text-orange-600",
          iconColor: "#FB923C",
        };
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

  return (
    <View style={tw`flex-1 mt-8`}>
      {showAuth ? (
        <AuthScreen onClose={() => setShowAuth(false)} />
      ) : (
        <>
          <View style={tw`flex-1`}>
            {activeTab === "generator" && (
              <GeneratorContent
                activeMode={activeMode}
                setActiveMode={setActiveMode}
                user={user}
                supabase={supabase}
                userCredits={userCredits}
                deductCredit={deductCredit}
                getThemeColors={getThemeColors}
                API_CONFIG={API_CONFIG}
                anonymousUsageCount={anonymousUsageCount}
                MAX_ANONYMOUS_GENERATIONS={MAX_ANONYMOUS_GENERATIONS}
                incrementAnonymousUsage={incrementAnonymousUsage}
              />
            )}
            {(activeTab === "history" ||
              activeTab === "profile" ||
              activeTab === "credits") && (
              <UserDashboard
                activeTab={activeTab}
                user={user}
                history={history}
                setShowAuth={setShowAuth}
                setActiveMode={setActiveMode}
                deleteHistoryItem={deleteHistoryItem}
                supabase={supabase}
                getThemeColors={getThemeColors}
              />
            )}
          </View>
          {/* Bottom Navigation */}
          <View style={tw`flex-row border-t border-slate-200 bg-white`}>
            {[
              { id: "generator", icon: "magic", label: "Generator" },
              { id: "history", icon: "history", label: "History" },
              { id: "credits", icon: "money", label: "Credits" },
              { id: "profile", icon: "user", label: "Profile" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={tw`flex-1 py-4 items-center`}
                onPress={() => setActiveTab(tab.id)}
              >
                <FontAwesome
                  name={tab.icon}
                  size={20}
                  color={activeTab === tab.id ? "#FB923C" : "#64748B"}
                />
                <Text
                  style={tw`text-xs mt-1 ${
                    activeTab === tab.id ? "text-orange-500" : "text-slate-500"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

export default GeneratorScreen;
