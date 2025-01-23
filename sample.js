import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert,
  Clipboard,
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

const API_CONFIG = {
  BASE_URL:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  KEY: "AIzaSyCK3_EjIpgEJ5QXwT0tkyFGfEZvixYLBM8",
};

const TabBar = ({ activeTab, onTabPress }) => (
  <View style={styles.tabBar}>
    {["Mood", "Niche", "Image"].map((tab) => (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tab,
          activeTab === tab.toLowerCase() && styles.activeTab,
        ]}
        onPress={() => onTabPress(tab.toLowerCase())}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === tab.toLowerCase() && styles.activeTabText,
          ]}
        >
          {tab}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const CaptionGenerator = () => {
  const [activeTab, setActiveTab] = useState("mood");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [hashtags, setHashtags] = useState([]);
  const [captionLength, setCaptionLength] = useState("medium");
  const [customInput, setCustomInput] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("happy");
  const [error, setError] = useState("");

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

  const generateContent = async () => {
    setError("");
    setLoading(true);

    try {
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
                      activeTab === "mood"
                        ? selectedCategory
                        : activeTab === "niche"
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
      setCaption(data.candidates[0].content.parts[0].text);

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
                    text: `Generate 5 trendy hashtags for: ${data.candidates[0].content.parts[0].text}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const hashtagData = await hashtagResponse.json();
      setHashtags(hashtagData.candidates[0].content.parts[0].text.split(" "));
    } catch (error) {
      setError("Failed to generate content");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const text = `${caption}\n\n${hashtags.map((tag) => `#${tag}`).join(" ")}`;
    Clipboard.setString(text);
    Alert.alert("Copied!", "Caption and hashtags copied to clipboard");
  };

  const renderLengthSelector = () => (
    <View style={styles.lengthSelector}>
      {Object.entries(lengthConfigs).map(([length, config]) => (
        <TouchableOpacity
          key={length}
          style={[
            styles.lengthOption,
            captionLength === length && styles.activeLengthOption,
          ]}
          onPress={() => setCaptionLength(length)}
        >
          <Text style={styles.lengthTitle}>{length}</Text>
          <Text style={styles.lengthDesc}>{config.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCategorySelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categorySelector}
    >
      {(activeTab === "mood" ? moods : niches).map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryChip,
            selectedCategory === category.toLowerCase() &&
              styles.activeCategoryChip,
          ]}
          onPress={() => setSelectedCategory(category.toLowerCase())}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === category.toLowerCase() &&
                styles.activeCategoryText,
            ]}
          >
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderImageTab = () => (
    <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
      {selectedImage ? (
        <Image
          source={{ uri: selectedImage.uri }}
          style={styles.selectedImage}
        />
      ) : (
        <Text style={styles.imageUploadText}>Select Image</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Caption Generator</Text>
        <Text style={styles.headerSubtitle}>Create engaging content</Text>
      </View>

      {/* Method Selector - Styled like the reference */}
      <View style={styles.methodContainer}>
        {["mood", "niche", "image"].map((method) => (
          <TouchableOpacity
            key={method}
            style={[
              styles.methodButton,
              generationMethod === method && styles.methodButtonActive,
            ]}
            onPress={() => setGenerationMethod(method)}
          >
            <Text
              style={[
                styles.methodButtonText,
                generationMethod === method && styles.methodButtonTextActive,
              ]}
            >
              {method.charAt(0).toUpperCase() + method.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* Length Selector */}
        <View style={styles.lengthSelector}>
          {Object.entries(lengthConfigs).map(([length, config]) => (
            <TouchableOpacity
              key={length}
              style={[
                styles.lengthOption,
                captionLength === length && styles.lengthOptionActive,
              ]}
              onPress={() => setCaptionLength(length)}
            >
              <Text style={styles.lengthTitle}>
                {length.charAt(0).toUpperCase() + length.slice(1)}
              </Text>
              <Text style={styles.lengthDesc}>{config.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Selection */}
        {generationMethod !== "image" && (
          <View style={styles.categoryContainer}>
            <Text style={styles.sectionTitle}>
              Select {generationMethod === "mood" ? "Mood" : "Niche"}
            </Text>
            <View style={styles.categoryGrid}>
              {(generationMethod === "mood" ? moods : niches).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.categoryCard,
                    selectedCategory === item.toLowerCase() &&
                      styles.categoryCardActive,
                  ]}
                  onPress={() => setSelectedCategory(item.toLowerCase())}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === item.toLowerCase() &&
                        styles.categoryTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Image Upload */}
        {generationMethod === "image" && (
          <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.selectedImage}
              />
            ) : (
              <View style={styles.imageUploadContent}>
                <Text style={styles.imageUploadText}>Select Image</Text>
                <Text style={styles.imageUploadSubtext}>
                  Tap to choose from gallery
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Custom Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Custom Context (Optional)</Text>
          <TextInput
            style={styles.input}
            value={customInput}
            onChangeText={setCustomInput}
            placeholder="Add keywords or specific context..."
            placeholderTextColor={theme.lightText}
            multiline
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Results Section */}
        {caption && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Generated Caption</Text>
            <Text style={styles.captionText}>{caption}</Text>

            {hashtags.length > 0 && (
              <View style={styles.hashtagContainer}>
                {hashtags.map((tag, index) => (
                  <Text key={index} style={styles.hashtag}>
                    #{tag}
                  </Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.copyButton}
              onPress={copyToClipboard}
            >
              <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Generate Button */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateContent}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Caption</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    padding: 20,
    backgroundColor: theme.navy,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.lightText,
    marginTop: 4,
  },
  methodContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 8,
    margin: 16,
    borderRadius: 12,
  },
  methodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  methodButtonActive: {
    backgroundColor: theme.primary,
  },
  methodButtonText: {
    color: theme.text,
    fontWeight: "500",
  },
  methodButtonTextActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  lengthSelector: {
    flexDirection: "row",
    marginBottom: 20,
  },
  lengthOption: {
    flex: 1,
    padding: 12,
    backgroundColor: "#fff",
    marginHorizontal: 4,
    borderRadius: 12,
  },
  lengthOptionActive: {
    backgroundColor: theme.secondary,
  },
  lengthTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
  },
  lengthDesc: {
    fontSize: 12,
    color: theme.lightText,
    marginTop: 4,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    margin: -4,
  },
  categoryCard: {
    width: "48%",
    margin: "1%",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
  },
  categoryCardActive: {
    backgroundColor: theme.primary,
  },
  categoryText: {
    color: theme.text,
    fontWeight: "500",
  },
  categoryTextActive: {
    color: "#fff",
  },
  imageUpload: {
    height: 200,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
  },
  selectedImage: {
    width: "100%",
    height: "100%",
  },
  imageUploadContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageUploadText: {
    fontSize: 18,
    color: theme.text,
    fontWeight: "600",
  },
  imageUploadSubtext: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    color: theme.text,
  },
  resultContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 12,
  },
  captionText: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.text,
    marginBottom: 16,
  },
  hashtagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  hashtag: {
    backgroundColor: theme.secondary,
    color: theme.primary,
    padding: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  generateButton: {
    backgroundColor: theme.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  copyButton: {
    backgroundColor: theme.background,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  copyButtonText: {
    color: theme.primary,
    fontWeight: "500",
  },
  errorText: {
    color: "#dc2626",
    marginBottom: 16,
  },
});

export default CaptionGenerator;
