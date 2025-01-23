import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Clipboard,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { createClient } from "@supabase/supabase-js";
import AuthScreen from "./auth";
import UserDashboard from "./dashboard";
import { useAuth } from "../authcontext";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const { user, supabase } = useAuth(); // Use the auth context instead of local state
  const [activeTab, setActiveTab] = useState("generator");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [hashtags, setHashtags] = useState([]);
  const [captionLength, setCaptionLength] = useState("medium");
  const [customInput, setCustomInput] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("happy");
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [history, setHistory] = useState([]);
  const [userCredits, setUserCredits] = useState(0);
  const [anonymousUsageCount, setAnonymousUsageCount] = useState(0);
  const MAX_ANONYMOUS_GENERATIONS = 10;
  // Add this new useEffect to fetch credits when component mounts
  useEffect(() => {
    if (user) {
      fetchUserCredits();
    }
  }, [user]);

  useEffect(() => {
    const loadAnonymousUsage = async () => {
      try {
        const savedCount = await AsyncStorage.getItem('anonymousUsageCount');
        if (savedCount !== null) {
          setAnonymousUsageCount(parseInt(savedCount));
        }
      } catch (error) {
        console.error('Error loading anonymous usage count:', error);
      }
    };
    loadAnonymousUsage();
  }, []);

  // Save anonymous usage count whenever it changes
  useEffect(() => {
    const saveAnonymousUsage = async () => {
      try {
        await AsyncStorage.setItem('anonymousUsageCount', anonymousUsageCount.toString());
      } catch (error) {
        console.error('Error saving anonymous usage count:', error);
      }
    };
    saveAnonymousUsage();
  }, [anonymousUsageCount]);


  const fetchUserCredits = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      // If no credits record exists, initialize with 10 free credits
      if (!data || data.credits === null) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ credits: 10 }) // Give 10 free credits to new users
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

  // Replace the deductCredit function with:
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

  const generateContent = async () => {
    // Check if anonymous user has reached limit
     if (!user && anonymousUsageCount >= MAX_ANONYMOUS_GENERATIONS) {
       Alert.alert(
         "Free Limit Reached",
         "You've reached the limit of 10 free generations. Please sign in to continue using the app.",
         [
           { text: "Sign In", onPress: () => setShowAuth(true) },
           { text: "Cancel", style: "cancel" },
         ]
       );
       return;
     }

    // Check credits only for logged-in users
    if (user && userCredits <= 0) {
      Alert.alert(
        "No Credits",
        "You don't have enough credits. Please purchase more credits to continue."
      );
      setActiveTab("credits");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Only deduct credits for logged-in users
      if (user) {
        await deductCredit();
      } else {
        // Increment anonymous usage count
        setAnonymousUsageCount((prev) => prev + 1);
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}?key=${API_CONFIG.KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Generate a ${captionLength} Instagram caption with a ${
                      activeMode === "mood"
                        ? selectedCategory
                        : activeMode === "niche"
                        ? selectedCategory
                        : "descriptive"
                    } tone. ${customInput ? `Context: ${customInput}` : ""}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) throw new Error("Generation failed");

      const data = await response.json();
      const generatedCaption = data.candidates[0].content.parts[0].text;
      setCaption(generatedCaption);

      // Generate hashtags
      const hashtagResponse = await fetch(
        `${API_CONFIG.BASE_URL}?key=${API_CONFIG.KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Generate 5 trendy hashtags for: ${generatedCaption}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const hashtagData = await hashtagResponse.json();
      const generatedHashtags =
        hashtagData.candidates[0].content.parts[0].text.split(" ");
      setHashtags(generatedHashtags);

      // Only save to history for logged-in users
      if (user) {
        await saveToHistory(generatedCaption, generatedHashtags);
      }
    } catch (error) {
      console.error("Generation error:", error);
      // Refund credit only for logged-in users
      if (user) {
        try {
          const { error: refundError } = await supabase
            .from("user_credits")
            .update({ credits: userCredits })
            .eq("user_id", user.id);

          if (refundError) throw refundError;
          setUserCredits(userCredits);
        } catch (refundError) {
          console.error("Error refunding credit:", refundError);
        }
      } else {
        // Decrement anonymous usage count if generation failed
        setAnonymousUsageCount((prev) => prev - 1);
      }
      setError("Failed to generate content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

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

  // In your saveToHistory function
  const saveToHistory = async (captionText, hashtagList) => {
    try {
      if (!user) {
        throw new Error("Please sign in to save captions");
      }

      // Add debugging
      console.log("Attempting to save with user ID:", user.id);
      console.log("Caption data:", {
        user_id: user.id,
        caption: captionText,
        hashtags: hashtagList,
        mode: activeMode,
        category: selectedCategory,
        custom_input: customInput || null,
        created_at: new Date().toISOString(),
      });

      const { error: insertError } = await supabase
        .from("caption_history")
        .insert({
          user_id: user.id,
          caption: captionText,
          hashtags: hashtagList,
          mode: activeMode,
          category: selectedCategory,
          custom_input: customInput || null,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Detailed insert error:", insertError);
        throw insertError;
      }

      await fetchHistory();
    } catch (error) {
      console.error("Error saving to history:", error);
      Alert.alert(
        "Save Failed",
        error.message === "Please sign in to save captions"
          ? error.message
          : "Failed to save caption. Please try again."
      );
      throw error;
    }
  };

  const deleteHistoryItem = async (id) => {
    try {
      // First check if the item exists
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

      // Log the existing item to verify we're targeting the correct record
      console.log("Attempting to delete item:", existingItem);

      // Attempt deletion with explicit user_id check for security
      const { error: deleteError } = await supabase
        .from("caption_history")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // Add this line to ensure user owns the record

      if (deleteError) {
        console.error("Deletion error details:", deleteError);
        throw deleteError;
      }

      // Verify deletion
      const { data: checkDeleted, error: verifyError } = await supabase
        .from("caption_history")
        .select("*")
        .eq("id", id)
        .single();

      if (verifyError && verifyError.code === "PGRST116") {
        // Item was successfully deleted (not found)
        fetchHistory();
        Alert.alert("Success", "History item deleted successfully");
      } else {
        throw new Error("Item still exists after deletion attempt");
      }
    } catch (error) {
      console.error("Error deleting history item:", error);
      Alert.alert(
        "Error",
        "Failed to delete history item. Please check your permissions and try again."
      );
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

  const moods = ["Happy", "Excited", "Peaceful", "Grateful", "Creative"];
  const niches = ["Travel", "Fashion", "Food", "Fitness", "Lifestyle"];

  const lengthConfigs = {
    short: { description: "1-2 sentences", wordCount: "10-15" },
    medium: { description: "2-3 sentences", wordCount: "20-35" },
    long: { description: "3-4 sentences", wordCount: "30-60" },
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      setError("Failed to pick image");
    }
  };

  const copyToClipboard = () => {
    const text = `${caption}\n\n${hashtags.map((tag) => `#${tag}`).join(" ")}`;
    Clipboard.setString(text);
    Alert.alert("Copied!", "Caption and hashtags copied to clipboard");
  };

  const renderLengthSelector = () => (
    <View style={tw`flex-row mb-6 gap-2`}>
      {Object.entries(lengthConfigs).map(([length, config]) => (
        <TouchableOpacity
          key={length}
          style={tw`flex-1 p-4 rounded-2xl bg-white items-center shadow-sm ${
            captionLength === length ? getThemeColors().bg : ""
          }`}
          onPress={() => setCaptionLength(length)}
        >
          <Text
            style={tw`text-sm font-semibold ${
              captionLength === length
                ? getThemeColors().text
                : "text-slate-800"
            } mb-1`}
          >
            {length.charAt(0).toUpperCase() + length.slice(1)}
          </Text>
          <Text style={tw`text-xs text-slate-600`}>{config.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCategorySelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={tw`mb-6`}
    >
      {(activeMode === "mood" ? moods : niches).map((category) => (
        <TouchableOpacity
          key={category}
          style={tw`px-5 py-3 rounded-full bg-white shadow-sm mr-2 ${
            selectedCategory === category.toLowerCase()
              ? getThemeColors().bg
              : ""
          }`}
          onPress={() => setSelectedCategory(category.toLowerCase())}
        >
          <Text
            style={tw`text-sm font-medium ${
              selectedCategory === category.toLowerCase()
                ? getThemeColors().text
                : "text-slate-800"
            }`}
          >
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderGeneratorContent = () => (
    <View style={tw`flex-1`}>
      {/* Decorative elements */}
      <View style={tw`absolute top-0 right-0 -mr-6 opacity-10`}>
        <FontAwesome
          name="hashtag"
          size={100}
          color={getThemeColors().iconColor}
        />
      </View>

      <ScrollView
        style={tw`flex-1 px-4 py-3`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`mb-6 flex-row items-center justify-between`}>
          <TouchableOpacity
            style={tw`flex-row items-center`}
            onPress={() => setActiveMode(null)}
          >
            <FontAwesome
              name="arrow-left"
              size={16}
              color="#1F2937"
              style={tw`mr-2`}
            />
            <Text style={tw`text-base text-slate-800 font-medium`}>Back</Text>
          </TouchableOpacity>
          {user ? (
            // Display credits for logged-in users
            <View
              style={tw`flex-row items-center bg-white p-2 rounded-xl shadow-sm`}
            >
              <Text style={tw`text-sm text-slate-600 font-medium`}>
                Credits:
              </Text>
              <Text
                style={tw`ml-1 text-sm font-semibold ${getThemeColors().text}`}
              >
                {userCredits}
              </Text>
            </View>
          ) : (
            // Display free credits for anonymous users
            <View
              style={tw`flex-row items-center bg-white p-2 rounded-xl shadow-sm`}
            >
              <Text style={tw`text-sm text-slate-600 font-medium`}>
                Free Credits:
              </Text>
              <Text
                style={tw`ml-1 text-sm font-semibold ${getThemeColors().text}`}
              >
                {MAX_ANONYMOUS_GENERATIONS - anonymousUsageCount}
              </Text>
            </View>
          )}
        </View>

        {/* Remaining content */}
        {renderLengthSelector()}

        {activeMode === "image" ? (
          <TouchableOpacity
            style={tw`h-48 bg-white rounded-2xl mb-6 justify-center items-center border-2 border-dashed border-green-200`}
            onPress={pickImage}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.uri }}
                style={tw`w-full h-full rounded-2xl`}
              />
            ) : (
              <View style={tw`items-center`}>
                <FontAwesome
                  name="camera"
                  size={24}
                  color={getThemeColors().iconColor}
                  style={tw`mb-2`}
                />
                <Text style={tw`text-base ${getThemeColors().text}`}>
                  Select Image
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          renderCategorySelector()
        )}

        <TextInput
          style={tw`bg-white p-4 rounded-2xl mb-6 text-base text-slate-800 shadow-sm`}
          value={customInput}
          onChangeText={setCustomInput}
          placeholder="Add custom context (optional)"
          placeholderTextColor="#64748B"
        />

        {error ? (
          <Text style={tw`text-red-500 mb-4 text-sm`}>{error}</Text>
        ) : null}

        {caption ? (
          <View style={tw`bg-white p-5 rounded-2xl mb-6 shadow-sm`}>
            <Text style={tw`text-base text-slate-800 mb-4 leading-6`}>
              {caption}
            </Text>
            <View style={tw`flex-row flex-wrap mb-4 gap-2`}>
              {hashtags.map((tag, index) => (
                <Text
                  key={index}
                  style={tw`${getThemeColors().text} text-sm font-medium`}
                >
                  #{tag}
                </Text>
              ))}
            </View>
            <TouchableOpacity
              style={tw`p-3 rounded-xl ${getThemeColors().bg} items-center`}
              onPress={copyToClipboard}
            >
              <Text style={tw`${getThemeColors().text} font-semibold`}>
                Copy to Clipboard
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={tw`${getThemeColors().bg} p-4 rounded-2xl items-center mb-6 ${
            loading ? "opacity-70" : ""
          }`}
          onPress={generateContent}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={getThemeColors().iconColor} />
          ) : (
            <Text style={tw`${getThemeColors().text} text-base font-semibold`}>
              Generate Caption
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <View style={tw`flex-1 mt-8`}>
      {showAuth ? (
        <AuthScreen onClose={() => setShowAuth(false)} />
      ) : (
        <>
          <View style={tw`flex-1`}>
            {activeTab === "generator" && renderGeneratorContent()}
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
              { id: "credits", icon: "money", label: "Credits" }, // Add this new tab
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
