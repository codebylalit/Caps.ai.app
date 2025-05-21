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
import { colors, commonStyles } from "../../theme/colors";

const GeneratorContent = ({
  activeMode,
  setActiveMode,
  user,
  supabase,
  userCredits,
  anonymousUsageCount,
  MAX_ANONYMOUS_GENERATIONS,
  incrementAnonymousUsage,
  deductCredit,
  getThemeColors,
  API_CONFIG,
}) => {
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [hashtags, setHashtags] = useState([]);
  const [captionLength, setCaptionLength] = useState("medium");
  const [customInput, setCustomInput] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("happy");
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  const moods = [
    "Happy",
    "Excited",
    "Peaceful",
    "Grateful",
    "Creative",
    "Motivated",
    "Romantic",
    "Adventurous",
    "Reflective",
    "Playful",
  ];

  const niches = [
    "Travel",
    "Life",
    "Fashion",
    "Food",
    "Fitness",
    "Lifestyle",
    "Tech & Gadgets",
    "Sustainability",
    "Mental Health",
    "Parenting",
    "Pet Care",
    "DIY & Crafts",
    "Personal Finance",
    "Wellness & Self-Care",
    "Gaming",
    "Books & Literature",
    "Pop Culture & Entertainment",
    "Home Decor & Organization",
    "Beauty & Skincare",
    "Entrepreneurship",
    "Education & Learning",
    "Relationships & Dating",
    "Art & Design",
    "Photography",
    "Automobiles",
    "Science & Innovation",
    "Real Estate",
    "Luxury Living",
  ];

  const lengthConfigs = {
    short: { description: "1-2 sentences", wordCount: "5-10" },
    medium: { description: "2-3 sentences", wordCount: "10-15" },
    long: { description: "3-4 sentences", wordCount: "15-30" },
  };

  const saveToHistory = async (captionText, hashtagList) => {
    try {
      if (!user) {
        throw new Error("Please sign in to save captions");
      }

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

  const generateContent = async () => {
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

    if (user && userCredits <= 0) {
      Alert.alert(
        "No Credits",
        "You don't have enough credits. Please purchase more credits to continue."
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (user) {
        await deductCredit();
      } else {
        await incrementAnonymousUsage(); // Add this line
      }

      const generatePrompt = () => {
        const basePrompt = `Craft a compelling and unique Instagram caption that reflects the essence of a ${captionLength} ${activeMode} post. The caption should be attention-grabbing, authentic, and align with modern social media trends.`;

        switch (activeMode) {
          case "mood":
            return `${basePrompt} Convey a ${selectedCategory} mood through emotionally resonant language that evokes feelings and connects deeply with the audience.`;
          case "niche":
            return `${basePrompt} Focus on ${selectedCategory}-specific themes and insights. Use language and keywords that resonate with the target audience while staying trendy and engaging.`;
          case "image":
            return `${basePrompt} Use vivid, descriptive language to highlight the image's core elements and story. Ensure the caption is visually aligned and sparks curiosity.`;
          default:
            return `${basePrompt} Ensure it feels fresh, meaningful, and relatable for a broad audience.`;
        }
      };

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
                    text:
                      generatePrompt() +
                      (customInput
                        ? ` Additional context: ${customInput}`
                        : ""),
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) throw new Error("Generation failed");

      const data = await response.json();
      const generatedCaption = data.candidates[0].content.parts[0].text.trim();
      setCaption(generatedCaption);

      const generateHashtagPrompt = () => {
        switch (activeMode) {
          case "mood":
            return `Generate 5 trending hashtags that reflect ${selectedCategory} emotions and current social media trends.`;
          case "niche":
            return `Create 5 targeted hashtags for ${selectedCategory} that boost post visibility and engagement.`;
          case "image":
            return `Develop 5 strategic hashtags that complement the image's theme and maximize discoverability.`;
          default:
            return `Generate 5 relevant, trending hashtags.`;
        }
      };

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
                    text: generateHashtagPrompt(),
                  },
                ],
              },
            ],
          }),
        }
      );

      const hashtagData = await hashtagResponse.json();
      const generatedHashtags = hashtagData.candidates[0].content.parts[0].text
        .split(/\s+/)
        .filter((tag) => tag.startsWith("#"))
        .map((tag) => tag.replace("#", ""))
        .slice(0, 5);

      setHashtags(generatedHashtags);

      if (user) {
        await saveToHistory(generatedCaption, generatedHashtags);
      }
    } catch (error) {
      console.error("Generation error:", error);
      if (user) {
        try {
          await supabase
            .from("profiles")
            .update({ credits: userCredits })
            .eq("id", user.id);
        } catch (refundError) {
          console.error("Error refunding credit:", refundError);
        }
      } else {
        await incrementAnonymousUsage(); // Add this line
      }
      setError("Failed to generate content. Please try again.");
    } finally {
      setLoading(false);
    }
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

  return (
    <View style={tw`flex-1`}>
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
};

export default GeneratorContent;
