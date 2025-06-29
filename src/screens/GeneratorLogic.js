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
  Animated,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { useAuth } from "../hooks/useAuth";
import { colors, commonStyles } from "../theme/colors";
import DotsLoader from '../components/DotsLoader';
import AppText from '../components/AppText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCoins } from '@fortawesome/free-solid-svg-icons';

const ThemedAlert = ({ visible, title, message, buttons, onClose, children, themeColor }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={tw`flex-1 bg-black/20 justify-center items-center`}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                tw`w-[300px] rounded-xl p-5`,
                {
                  backgroundColor: colors.background.card,
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
                commonStyles.shadow.light,
              ]}
            >
              <AppText
                style={[
                  tw`text-xl font-bold mb-1.5 text-center`,
                  { color: colors.text.primary },
                ]}
              >
                {title}
              </AppText>
              <AppText
                style={[
                  tw`text-sm mb-5 text-center`,
                  { color: colors.text.secondary },
                ]}
              >
                {message}
              </AppText>
              {children}
              <View style={tw`flex-row gap-2`}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      onClose();
                      button.onPress?.();
                    }}
                    style={[
                      tw`flex-1 py-2.5 rounded-lg items-center`,
                      {
                        backgroundColor: button.style === "default"
                          ? themeColor
                          : 'transparent',
                        borderWidth: button.style === "cancel" ? 1 : 0,
                        borderColor: themeColor + "30",
                      },
                    ]}
                  >
                    <AppText
                      style={[
                        tw`text-sm font-medium`,
                        {
                          color: button.style === "default"
                            ? colors.text.light
                            : colors.text.primary,
                        },
                      ]}
                    >
                      {button.text}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

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
  themeColor,
  setShowAuth,
  setActiveTab,
}) => {
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [hashtags, setHashtags] = useState([]);
  const [captionLength, setCaptionLength] = useState("medium");
  const [customInput, setCustomInput] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("happy");
  const [error, setError] = useState("");
  const [showAdditionalContext, setShowAdditionalContext] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [alertConfig, setAlertConfig] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [showReportConfirmation, setShowReportConfirmation] = useState(false);

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
    short: { description: "1-2 sentences", wordCount: "5-10", hashtagCount: 7 },
    medium: {
      description: "2-3 sentences",
      wordCount: "10-15",
      hashtagCount: 14,
    },
    long: {
      description: "3-4 sentences",
      wordCount: "15-30",
      hashtagCount: 21,
    },
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
        quality: 0.8,
        allowsMultipleSelection: false,
        exif: true,
      });

      if (!result.canceled) {
        const selectedAsset = result.assets[0];

        // Validate image size (max 10MB)
        const response = await fetch(selectedAsset.uri);
        const blob = await response.blob();
        const sizeInMB = blob.size / (1024 * 1024);

        if (sizeInMB > 10) {
          setError("Image size should be less than 10MB");
          return;
        }

        // Validate image dimensions
        if (selectedAsset.width < 500 || selectedAsset.height < 500) {
          setError("Image dimensions should be at least 500x500 pixels");
          return;
        }

        setSelectedImage(selectedAsset);
        setError("");
      }
    } catch (error) {
      console.error("Image picker error:", error);
      setError("Failed to pick image. Please try again.");
    }
  };

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    Alert.alert("Copied!", "Content copied to clipboard.");
  };

  const analyzeImage = async (imageUri) => {
    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call Vision API for image analysis
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
                    text: "Analyze this image and provide a detailed description of:\n1. Main subjects and objects\n2. Colors and visual elements\n3. Mood and atmosphere\n4. Composition and style\n5. Notable details",
                  },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: base64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.4,
              topK: 32,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) throw new Error("Image analysis failed");
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Image analysis error:", error);
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!user && anonymousUsageCount >= MAX_ANONYMOUS_GENERATIONS) {
      setAlertConfig({
        visible: true,
        title: "Need More Credits!",
        message: "You've used all 5 free generations. Sign up to get 5 more free credits",
        buttons: [
          {
            text: "Close",
            style: "cancel",
          },
          {
            text: "Sign Up",
            style: "default",
            onPress: () => {
              setAlertConfig(null);
              setShowAuth(true);
            },
          },
        ],
      });
      return;
    }

    if (user && userCredits <= 0) {
      setAlertConfig({
        visible: true,
        title: (
          <View style={tw`flex-row items-center justify-center`}>
            <FontAwesomeIcon
              icon={faCoins}
              size={20}
              color={themeColor}
              style={tw`mr-2`}
            />
            <AppText
              style={[
                tw`text-xl font-bold`,
                { color: colors.text.primary },
              ]}
            >
              Out of Credits
            </AppText>
          </View>
        ),
        message: "You've used all your credits. Purchase more to continue creating amazing content!",
        buttons: [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Buy Credits",
            style: "default",
            onPress: () => setActiveTab("credits"),
          },
        ],
      });
      return;
    }

    // Validate inputs based on mode
    if (activeMode === "image") {
      if (!selectedImage) {
        setError("Please upload an image first");
        return;
      }
    } else if (!customInput.trim() && activeMode === "meme") {
      setError("Please provide some context for better results");
      return;
    }

    setError("");
    setLoading(true);
    setCaption("");
    setHashtags([]);

    try {
      if (user) {
        await deductCredit();
      } else {
        await incrementAnonymousUsage();
      }

      let imageAnalysis = null;
      if (activeMode === "image" && selectedImage) {
        imageAnalysis = await analyzeImage(selectedImage.uri);
        if (!imageAnalysis) {
          throw new Error("Failed to analyze image. Please try again.");
        }
      }

      // Only generate caption if not in niche (Hashtag Pro) mode
      if (activeMode !== "niche") {
        const generatePrompt = () => {
          const lengthGuide = lengthConfigs[captionLength];
          const basePrompt = `Create an engaging Instagram caption that is ${captionLength} in length (${lengthGuide.wordCount} words). The caption should be authentic, relatable, and optimized for engagement.`;

          switch (activeMode) {
            case "mood":
              return `${basePrompt} 
              Focus on conveying a ${selectedCategory} mood through:
              - Emotional resonance and personal connection
              - Authentic storytelling and vulnerability
              - Relatable experiences and feelings
              - Positive and uplifting tone
              Additional context: ${customInput || "Share a moment that captures this mood"
                }`;

            case "image":
              return `${basePrompt}
              Based on this image analysis:
              ${imageAnalysis}

              Create a caption that:
              1. Highlights the key visual elements and story
              2. Connects the image with emotional impact
              3. Encourages viewer interaction and engagement
              4. Maintains a natural, conversational tone
              5. Includes a subtle call to action

              Additional context: ${customInput || "Share what makes this image special"
                }

              Guidelines:
              - Keep the tone authentic and personal
              - Focus on the story behind the image
              - Use descriptive but concise language
              - Make it relatable to the target audience
              - Include an engaging question or call to action`;

            default:
              return `${basePrompt}
              Ensure the caption:
              - Has a clear message and purpose
              - Uses engaging storytelling
              - Includes a call to action
              - Maintains brand voice
              Additional context: ${customInput}`;
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
                      text: generatePrompt(),
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (!response.ok) throw new Error("Generation failed");

        const data = await response.json();
        const generatedCaption =
          data.candidates[0].content.parts[0].text.trim();
        setCaption(generatedCaption);
      } else {
        // For Hashtag Pro mode, set empty caption
        setCaption("");
      }

      const generateHashtagPrompt = () => {
        const baseHashtagPrompt = `Generate ${lengthConfigs[captionLength].hashtagCount} highly relevant and trending hashtags that will maximize post visibility and engagement.`;

        switch (activeMode) {
          case "mood":
            return `${baseHashtagPrompt}
            For a ${selectedCategory} mood post:
            - Include emotion-specific hashtags
            - Add trending mood-related hashtags
            - Include community hashtags
            Additional context: ${customInput || ""}`;

          case "niche":
            return `${baseHashtagPrompt}
            For the ${selectedCategory} niche:
            - Use niche-specific hashtags
            - Include trending industry hashtags
            - Add community engagement hashtags
            - Add viral/trending hashtags
            - Include location-based hashtags if relevant
            Additional context: ${customInput || ""}

            Guidelines:
            - Focus on high-engagement hashtags
            - Mix popular and niche-specific tags
            - Include trending hashtags in the category
            - Ensure tags are currently active and relevant
            - Consider seasonal trends if applicable`;

          case "image":
            return `${baseHashtagPrompt}
            Based on this image analysis:
            ${imageAnalysis}

            Generate hashtags that:
            1. Describe the visual content
            2. Target the image's theme
            3. Include trending visual hashtags
            4. Add community engagement

            Additional context: ${customInput || ""}

            Guidelines:
            - Use specific, descriptive hashtags
            - Include relevant trending tags
            - Mix popular and niche hashtags
            - Ensure relevance to the image content`;

          default:
            return `${baseHashtagPrompt}
            Ensure hashtags are:
            - Relevant to the content
            - Currently trending
            - Optimized for engagement
            Additional context: ${customInput}`;
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
                    text:
                      generateHashtagPrompt() +
                      "\n\nReturn ONLY hashtags in this format: #tag1 #tag2 #tag3 #tag4 #tag5",
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      const hashtagData = await hashtagResponse.json();
      const hashtagText =
        hashtagData.candidates[0].content.parts[0].text.trim();

      // Extract hashtags from the response and limit to the selected length
      const generatedHashtags = hashtagText.match(/#\w+/g) || []; // Match all hashtags starting with #

      // Limit hashtags based on selected length
      const maxHashtags = lengthConfigs[captionLength].hashtagCount;
      const limitedHashtags = generatedHashtags.slice(0, maxHashtags);

      // Remove '#' for Smart Caption and Image-based Caption modes
      const processedHashtags =
        activeMode === "niche"
          ? limitedHashtags
          : limitedHashtags.map((tag) => tag.replace("#", ""));

      setHashtags(processedHashtags);

      if (user) {
        await saveToHistory(
          activeMode === "niche" ? "" : caption,
          processedHashtags
        );
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
        await incrementAnonymousUsage();
      }
      setError(
        error.message || "Failed to generate content. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const reportContent = async () => {
    if (!user) {
      setAlertConfig({
        title: "Sign In Required",
        message: "You must be signed in to report content.",
        buttons: [{ text: "OK", style: "default", onPress: () => setShowAuth(true) }],
      });
      return;
    }

    setShowReportConfirmation(false); // Close the input modal
    setLoading(true);

    try {
      const { error: insertError } = await supabase.from("content_reports").insert({
        reporter_id: user.id,
        generated_caption: caption,
        generated_hashtags: hashtags,
        report_reason: reportReason || "No specific reason provided.",
        report_time: new Date().toISOString(),
        mode: activeMode,
        category: selectedCategory,
        custom_input: customInput || null,
      });

      if (insertError) {
        console.error("Detailed report insert error:", insertError);
        throw insertError;
      }

      setAlertConfig({
        title: "Report Submitted",
        message: "Thank you for your report. We will review the content.",
        buttons: [{ text: "OK", style: "default" }],
      });
      setReportReason(""); // Clear the reason after submission
    } catch (error) {
      console.error("Error reporting content:", error);
      setAlertConfig({
        title: "Report Failed",
        message: "Failed to submit report. Please try again.",
        buttons: [{ text: "OK", style: "default" }],
      });
    } finally {
      setLoading(false);
    }
  };

  const renderLengthSelector = () => (
    <View style={tw`p-2`}>
      {/* <View style={tw`flex-row items-center mb-4`}>
        <FontAwesome name="text-width" size={20} color={themeColor} style={tw`mr-2`} />
        <Text style={[tw`text-xl font-semibold`, { color: colors.text.primary }]}>
          Caption Length
        </Text>
      </View> */}
      <View style={tw`flex-row justify-between gap-3`}>
        {Object.entries(lengthConfigs).map(([key, config]) => (
          <TouchableOpacity
            key={key}
            style={[
              tw`flex-1 py-4 px-3 rounded-xl items-center`,
              {
                backgroundColor:
                  captionLength === key ? themeColor : colors.background.card,
                borderWidth: 1,
                borderColor:
                  captionLength === key ? themeColor : themeColor + "30",
                ...commonStyles.shadow.light,
              },
            ]}
            onPress={() => setCaptionLength(key)}
          >
            <AppText
              style={[
                tw`text-base font-semibold`,
                {
                  color:
                    captionLength === key
                      ? colors.text.light
                      : colors.text.primary,
                },
              ]}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </AppText>
            <AppText
              style={[
                tw`text-sm mt-1`,
                {
                  color:
                    captionLength === key
                      ? colors.text.light + "CC"
                      : colors.text.muted,
                },
              ]}
            >
              {config.wordCount} words
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCategorySelector = () => (
    <View style={tw`p-2`}>
      <View style={tw`flex-row items-center mb-4`}>
        <FontAwesome
          name={
            activeMode === "mood"
              ? "smile-o"
              : activeMode === "niche"
                ? "tags"
                : "list"
          }
          size={20}
          color={themeColor}
          style={tw`mr-2`}
        />
        <AppText
          style={[tw`text-xl font-semibold`, { color: colors.text.primary }]}
        >
          {activeMode === "mood"
            ? "Mood"
            : activeMode === "niche"
              ? "Niche"
              : "Category"}
        </AppText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tw`-mx-4 px-4`}
        contentContainerStyle={tw`gap-2`}
      >
        {(activeMode === "mood" ? moods : niches).map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              tw`py-2.5 px-4 rounded-full`,
              {
                backgroundColor:
                  selectedCategory === category.toLowerCase()
                    ? themeColor
                    : colors.background.card,
                borderWidth: 1,
                borderColor:
                  selectedCategory === category.toLowerCase()
                    ? themeColor
                    : themeColor + "30",
                ...commonStyles.shadow.light,
              },
            ]}
            onPress={() => setSelectedCategory(category.toLowerCase())}
          >
            <AppText
              style={[
                tw`text-sm font-medium`,
                {
                  color:
                    selectedCategory === category.toLowerCase()
                      ? colors.text.light
                      : colors.text.primary,
                },
              ]}
            >
              {category}
            </AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const toggleAdditionalContext = () => {
    setShowAdditionalContext(!showAdditionalContext);
    Animated.timing(animation, {
      toValue: showAdditionalContext ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.main }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.main}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[tw`px-4 pb-32`, { gap: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {renderLengthSelector()}
        {renderCategorySelector()}

        {activeMode === "image" && (
          <View style={tw`mb-4 p-2`}>
            <View style={tw`flex-row items-center mb-4`}>
              <FontAwesome
                name="image"
                size={20}
                color={themeColor}
                style={tw`mr-2`}
              />
              <AppText
                style={[
                  tw`text-xl font-semibold`,
                  { color: colors.text.primary },
                ]}
              >
                Upload Image
              </AppText>
            </View>
            <TouchableOpacity
              style={[
                tw`h-48 rounded-xl items-center justify-center`,
                {
                  backgroundColor: colors.background.card,
                  borderWidth: 2,
                  borderColor: themeColor + "30",
                  borderStyle: "dashed",
                },
                commonStyles.shadow.light,
              ]}
              onPress={pickImage}
            >
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={tw`w-full h-full rounded-xl`}
                />
              ) : (
                <View style={tw`items-center`}>
                  <FontAwesome
                    name="cloud-upload"
                    size={40}
                    color={themeColor}
                    style={tw`mb-3`}
                  />
                  <AppText
                    style={[tw`text-base font-medium`, { color: themeColor }]}
                  >
                    Tap to upload image
                  </AppText>
                  <AppText
                    style={[tw`text-sm mt-1`, { color: colors.text.muted }]}
                  >
                    JPG, PNG up to 10MB
                  </AppText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={tw`p-2`}>
          <TouchableOpacity
            style={[
              tw`flex-row items-center justify-between p-4 rounded-xl`,
              {
                backgroundColor: colors.background.card,
                borderWidth: 1,
                borderColor: themeColor + "30",
              },
              commonStyles.shadow.light,
            ]}
            onPress={toggleAdditionalContext}
          >
            <View style={tw`flex-row items-center`}>
              <FontAwesome
                name={showAdditionalContext ? "minus-circle" : "plus-circle"}
                size={24}
                color={themeColor}
                style={tw`mr-3`}
              />
              <AppText
                style={[
                  tw`text-base font-medium`,
                  { color: colors.text.primary },
                ]}
              >
                {showAdditionalContext
                  ? "Hide Additional Context"
                  : "Add Additional Context"}
              </AppText>
            </View>
            <FontAwesome
              name={showAdditionalContext ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.text.muted}
            />
          </TouchableOpacity>

          <Animated.View
            style={[
              tw`overflow-hidden`,
              {
                height: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 200],
                }),
                opacity: animation,
              },
            ]}
          >
            <TextInput
              style={[
                tw`p-4 rounded-xl text-base min-h-[120px] mt-4`,
                {
                  backgroundColor: colors.background.card,
                  color: colors.text.primary,
                  borderWidth: 1,
                  borderColor: themeColor + "30",
                },
                commonStyles.shadow.light,
              ]}
              placeholder="Add any specific details or context..."
              placeholderTextColor={colors.text.muted}
              multiline
              textAlignVertical="top"
              value={customInput}
              onChangeText={setCustomInput}
            />
          </Animated.View>
        </View>

        <TouchableOpacity
          style={[
            tw`py-4 rounded-xl items-center`,
            {
              backgroundColor: themeColor,
              ...commonStyles.shadow.medium,
            },
          ]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.light} size={20} />
          ) : (
            <View style={tw`flex-row items-center`}>
              <FontAwesome
                name="magic"
                size={20}
                color={colors.text.light}
                style={tw`mr-2`}
              />
              <AppText
                style={[
                  tw`text-lg font-semibold`,
                  { color: colors.text.light },
                ]}
              >
                Generate Content
              </AppText>
            </View>
          )}
        </TouchableOpacity>

        {error && (
          <View style={tw`bg-red-50 p-4 rounded-xl`}>
            <AppText
              style={[
                tw`text-red-500 text-center`,
                { color: colors.status.error },
              ]}
            >
              {error}
            </AppText>
          </View>
        )}

        {hashtags.length > 0 && (
          <View style={tw`mt-4 mb-8`}>
            <View style={tw`flex-row items-center mb-4`}>
              <FontAwesome
                name="hashtag"
                size={20}
                color={themeColor}
                style={tw`mr-2`}
              />
              <AppText
                style={[
                  tw`text-xl font-semibold`,
                  { color: colors.text.primary },
                ]}
              >
                Hashtags
              </AppText>
            </View>
            <View style={tw`flex-row flex-wrap`}>
              {hashtags.map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    tw`px-3 py-1.5 rounded-full mr-2 mb-2`,
                    { backgroundColor: themeColor + "20" },
                  ]}
                  onPress={() => copyToClipboard(tag)}
                >
                  <AppText
                    style={[
                      tw`text-sm font-medium`,
                      { color: themeColor },
                    ]}
                  >
                    #{tag}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {caption && (
          <View style={tw`mb-8`}>
            <View style={tw`flex-row items-center mb-4`}>
              <FontAwesome
                name="pencil"
                size={20}
                color={themeColor}
                style={tw`mr-2`}
              />
              <AppText
                style={[
                  tw`text-xl font-semibold`,
                  { color: colors.text.primary },
                ]}
              >
                Caption
              </AppText>
            </View>
            <View
              style={[
                tw`p-4 rounded-xl`,
                {
                  backgroundColor: colors.background.card,
                  borderWidth: 1,
                  borderColor: themeColor + "30",
                },
                commonStyles.shadow.light,
              ]}
            >
              <AppText
                style={[
                  tw`text-base`,
                  { color: colors.text.primary, lineHeight: 24 },
                ]}
              >
                {caption}
              </AppText>
              <TouchableOpacity
                style={tw`mt-4 items-center`}
                onPress={() => copyToClipboard(caption)}
              >
                <FontAwesome
                  name="copy"
                  size={20}
                  color={colors.text.muted}
                />
                <AppText
                  style={[
                    tw`text-sm mt-1`,
                    { color: colors.text.muted, fontWeight: "500" },
                  ]}
                >
                  Copy Caption
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Modal
          animationType="slide"
          transparent={true}
          visible={showReportConfirmation}
          onRequestClose={() => setShowReportConfirmation(false)}
        >
          <View
            style={tw`flex-1 justify-center items-center bg-black/50 px-4`}
          >
            <View
              style={[
                tw`w-full max-w-sm p-6 rounded-lg`,
                { backgroundColor: colors.background.card },
                commonStyles.shadow.medium,
              ]}
            >
              <AppText
                style={[
                  tw`text-lg font-semibold mb-4 text-center`,
                  { color: colors.text.primary },
                ]}
              >
                Report Content
              </AppText>
              <AppText
                style={[
                  tw`text-sm mb-4 text-center`,
                  { color: colors.text.secondary },
                ]}
              >
                Please describe why you are reporting this content:
              </AppText>
              <TextInput
                style={[
                  tw`border p-3 rounded-lg mb-4`,
                  { borderColor: colors.border.primary, color: colors.text.primary },
                ]}
                placeholder="Enter reason here..."
                placeholderTextColor={colors.text.muted}
                multiline
                numberOfLines={4}
                value={reportReason}
                onChangeText={setReportReason}
              />
              <View style={tw`flex-row justify-between`}>
                <TouchableOpacity
                  style={[
                    tw`flex-1 py-3 rounded-lg mr-2`,
                    { backgroundColor: colors.accent.sage },
                  ]}
                  onPress={reportContent}
                >
                  <AppText
                    style={[
                      tw`text-center font-semibold`,
                      { color: colors.text.light },
                    ]}
                  >
                    Submit Report
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    tw`flex-1 py-3 rounded-lg`,
                    { backgroundColor: colors.background.main },
                  ]}
                  onPress={() => setShowReportConfirmation(false)}
                >
                  <AppText
                    style={[
                      tw`text-center font-semibold`,
                      { color: colors.text.primary },
                    ]}
                  >
                    Cancel
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Themed Alert */}
      {alertConfig && (
        <ThemedAlert
          visible={alertConfig.visible}
          title={
            <View style={tw`flex-row items-center justify-center`}>
              <FontAwesomeIcon
                icon={faCoins}
                size={20}
                color={themeColor}
                style={tw`mr-2`}
              />
              <AppText
                style={[
                  tw`text-xl font-bold`,
                  { color: colors.text.primary },
                ]}
              >
                Out of Credits
              </AppText>
            </View>
          }
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig(null)}
          themeColor={themeColor}
        />
      )}
    </SafeAreaView>
  );
};

export default GeneratorContent;