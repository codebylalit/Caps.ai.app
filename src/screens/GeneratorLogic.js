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
  SafeAreaView,
  StatusBar,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { useAuth } from "../hooks/useAuth";
import { colors, commonStyles } from "../theme/colors";

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
    <View style={tw`mb-6`}>
      <Text style={[tw`text-xl font-semibold mb-3`, { color: colors.text.primary }]}>
        Caption Length
      </Text>
      <View style={tw`flex-row justify-between`}>
        {Object.entries(lengthConfigs).map(([key, config]) => (
          <TouchableOpacity
            key={key}
            style={[
              tw`flex-1 mx-1 py-3 px-4 rounded-lg items-center`,
              {
                backgroundColor: captionLength === key ? colors.accent.sage : colors.background.card,
                ...commonStyles.shadow.light,
              },
            ]}
            onPress={() => setCaptionLength(key)}
          >
            <Text
              style={[
                tw`text-base font-medium`,
                {
                  color: captionLength === key ? colors.text.light : colors.text.primary,
                },
              ]}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
            <Text
              style={[
                tw`text-sm mt-1`,
                {
                  color: captionLength === key ? colors.text.light : colors.text.muted,
                },
              ]}
            >
              {config.wordCount} words
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCategorySelector = () => (
    <View style={tw`mb-6`}>
      <Text style={[tw`text-lg font-semibold mb-3`, { color: colors.text.primary }]}>
        {activeMode === "mood" ? "Mood" : activeMode === "niche" ? "Niche" : "Category"}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tw`-mx-4 px-4`}
      >
        {(activeMode === "mood" ? moods : niches).map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              tw`mr-3 py-2 px-4 rounded-full`,
              {
                backgroundColor: selectedCategory === category.toLowerCase() ? colors.accent.sage : colors.background.card,
                ...commonStyles.shadow.light,
              },
            ]}
            onPress={() => setSelectedCategory(category.toLowerCase())}
          >
            <Text
              style={[
                tw`text-sm font-medium`,
                {
                  color: selectedCategory === category.toLowerCase() ? colors.text.light : colors.text.primary,
                },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.main }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.main} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: commonStyles.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {renderLengthSelector()}
        {renderCategorySelector()}

        {activeMode === "image" && (
          <View style={tw`mb-6`}>
            <Text style={[tw`text-lg font-semibold mb-3`, { color: colors.text.primary }]}>
              Upload Image
            </Text>
            <TouchableOpacity
              style={[
                tw`h-40 rounded-lg items-center justify-center`,
                {
                  backgroundColor: colors.background.card,
                  borderWidth: 2,
                  borderColor: colors.border.light,
                  borderStyle: "dashed",
                },
              ]}
              onPress={pickImage}
            >
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={tw`w-full h-full rounded-lg`}
                />
              ) : (
                <View style={tw`items-center`}>
                  <FontAwesome
                    name="image"
                    size={32}
                    color={colors.text.muted}
                    style={tw`mb-2`}
                  />
                  <Text style={[tw`text-sm`, { color: colors.text.muted }]}>
                    Tap to upload image
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={tw`mb-6`}>
          <Text style={[tw`text-lg font-semibold mb-3`, { color: colors.text.primary }]}>
            Additional Context
          </Text>
          <TextInput
            style={[
              tw`p-4 rounded-lg text-base`,
              {
                backgroundColor: colors.background.card,
                color: colors.text.primary,
                ...commonStyles.shadow.light,
              },
            ]}
            placeholder="Add any specific details or context..."
            placeholderTextColor={colors.text.muted}
            multiline
            numberOfLines={4}
            value={customInput}
            onChangeText={setCustomInput}
          />
        </View>

        <TouchableOpacity
          style={[
            tw`py-4 rounded-lg items-center`,
            {
              backgroundColor: colors.accent.sage,
              ...commonStyles.shadow.medium,
            },
          ]}
          onPress={generateContent}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.light} />
          ) : (
            <Text style={[tw`text-lg font-semibold`, { color: colors.text.light }]}>
              Generate Content
            </Text>
          )}
        </TouchableOpacity>

        {error && (
          <Text style={[tw`text-red-500 mt-4 text-center`, { color: colors.status.error }]}>
            {error}
          </Text>
        )}

        {caption && (
          <View style={tw`mt-8`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={[tw`text-lg font-semibold`, { color: colors.text.primary }]}>
                Generated Content
              </Text>
              <TouchableOpacity
                style={[
                  tw`py-2 px-4 rounded-lg`,
                  { backgroundColor: colors.accent.sage },
                  commonStyles.shadow.light,
                ]}
                onPress={copyToClipboard}
              >
                <Text style={{ color: colors.text.light }}>Copy All</Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                tw`p-4 rounded-lg mb-4`,
                { backgroundColor: colors.background.card },
                commonStyles.shadow.light,
              ]}
            >
              <Text style={[tw`text-base`, { color: colors.text.primary }]}>
                {caption}
              </Text>
            </View>

            <View
              style={[
                tw`p-4 rounded-lg`,
                { backgroundColor: colors.background.card },
                commonStyles.shadow.light,
              ]}
            >
              <Text style={[tw`text-base`, { color: colors.text.primary }]}>
                {hashtags.map((tag) => `#${tag}`).join(" ")}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default GeneratorContent;
