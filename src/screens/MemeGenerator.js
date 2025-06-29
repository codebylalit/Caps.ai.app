import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ViewShot from 'react-native-view-shot';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';
import { useUsageTracking } from '../hooks/useFreeCredits';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCoins } from '@fortawesome/free-solid-svg-icons';
import tw from 'twrnc';
import { colors, commonStyles } from '../theme/colors';
import DotsLoader from '../components/DotsLoader';
import AppText from '../components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GEMINI_API_KEY = 'AIzaSyCK3_EjIpgEJ5QXwT0tkyFGfEZvixYLBM8';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY;
const SERPAPI_KEY = 'c66912920da76f60ee2192de442bba1734cee33982e2466eca990ae1762573a5';

// Add mapping from Gemini template names to memegen.link slugs
const MEMEGEN_TEMPLATES = {
  'Drake': 'drake',
  'Success Kid': 'success',
  'Distracted Boyfriend': 'disaster_girl',
  'Two Buttons': 'twobuttons',
  'Change My Mind': 'changemymind',
  'Expanding Brain': 'expanding_brain',
  'Mocking Spongebob': 'mocking_spongebob',
  'One Does Not Simply': 'onedoesnotsimply',
  'Batman Slapping Robin': 'batmanslappingrobin',
  'Left Exit 12 Off Ramp': 'left_exit_12_off_ramp',
  'UNO Draw 25': 'uno_draw_25',
  'Roll Safe': 'rollsafe',
  'Two Men Arm Wrestling': 'armwrestling',
  'Waiting Skeleton': 'waiting_skeleton',
  'Is This a Pigeon': 'is_this_a_pigeon',
  // Add more as needed
};

function slugify(text) {
  return encodeURIComponent(text.replace(/ /g, '_').replace(/\?/g, '~q').replace(/%/g, '~p').replace(/#/g, '~h').replace(/\//g, '~s').replace(/"/g, "''").replace(/-/g, '--'));
}

async function getGeminiMemeCaption({ topic, imageBase64 }) {
  let contents = [];
  let prompt = '';
  if (imageBase64) {
    prompt = 'Write a short, punchy meme caption (max 6 words) for this image.';
    contents.push({
      parts: [
        {
          inline_data: {
            mime_type: 'image/jpeg',
            data: imageBase64,
          },
        },
        {
          text: prompt,
        },
      ],
    });
  } else if (topic) {
    prompt = `Write a short, punchy meme caption (max 6 words) for this topic: ${topic}`;
    contents.push({
      parts: [
        {
          text: prompt,
        },
      ],
    });
  }
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 60,
      },
    }),
  });
  const data = await response.json();
  if (
    data &&
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0].text
  ) {
    const text = data.candidates[0].content.parts[0].text.trim();
    return { caption: text };
  }
  return { caption: '' };
}

async function fetchMemeImageFromSerpAPI(template) {
  const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(template + ' meme')}&tbm=isch&api_key=${SERPAPI_KEY}`;
  try {
    const response = await fetch(searchUrl);
    const data = await response.json();
    const results = data.images_results || [];
    if (results.length === 0) return '';
    // Pick a random image from the results
    const randomIndex = Math.floor(Math.random() * results.length);
    const imageUrl = results[randomIndex].original || results[randomIndex].thumbnail || '';
    return imageUrl;
  } catch (e) {
    return '';
  }
}

const ThemedAlert = ({ visible, title, message, buttons, onClose, children, loadingMessage }) => {
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
                { width: 300, borderRadius: 18, padding: 20, backgroundColor: colors.background.card, opacity: fadeAnim, transform: [{ scale: scaleAnim }], shadowColor: colors.accent.yellowDark, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
                commonStyles.shadow.light,
              ]}
            >
              <AppText
                style={{ fontSize: 20, fontWeight: '900', marginBottom: 6, color: colors.text.primary, textAlign: 'center', letterSpacing: 0.1 }}
              >
                {title}
              </AppText>
              <AppText
                style={{ fontSize: 15, color: colors.text.secondary, textAlign: 'center', marginBottom: 18, lineHeight: 21 }}
              >
                {loadingMessage || message}
              </AppText>
              {children}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      onClose();
                      button.onPress?.();
                    }}
                    style={[
                      { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
                      button.style === 'default' ? {
                        backgroundColor: colors.accent.yellowDark,
                        marginLeft: index !== 0 ? 8 : 0,
                      } : {
                        backgroundColor: colors.background.card,
                        borderWidth: 2,
                        borderColor: colors.accent.yellowDark + '40',
                        marginLeft: index !== 0 ? 8 : 0,
                      }
                    ]}
                  >
                    <AppText
                      style={[
                        { fontWeight: '700', fontSize: 16, textAlign: 'center' },
                        button.style === 'default' ? { color: colors.text.light } : { color: colors.accent.yellowDark }
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

const MemeGenerator = ({ navigation, onNavigate, setActiveMode, activeMode }) => {
  const [topic, setTopic] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const examplePrompts = [
    'Try: cat meme',
    'Try: office joke',
    'Try: Monday mood',
    'Try: gym motivation',
    'Try: coffee addiction',
    'Try: coding life',
    'Try: dog vs cat',
    'Try: weekend plans',
    'Try: exam stress',
    'Try: startup struggle',
  ];
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [memeImageUrl, setMemeImageUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const { user, supabase } = useAuth();
  const { credits, deductCredit, refreshCredits } = useCredits(supabase, user);
  const { anonymousUsageCount, incrementAnonymousUsage, MAX_ANONYMOUS_GENERATIONS } = useUsageTracking();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [alertConfig, setAlertConfig] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [memeFadeAnim] = useState(new Animated.Value(1));
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showInputError, setShowInputError] = useState(false);
  const [inputShakeAnim] = useState(new Animated.Value(0));
  const [generateScale] = useState(new Animated.Value(1));
  const [downloadScale] = useState(new Animated.Value(1));
  const [nextScale] = useState(new Animated.Value(1));
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successFadeAnim] = useState(new Animated.Value(0));

  // Height of your header (adjust if you change header height)
  const HEADER_HEIGHT = 60;

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % examplePrompts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, []);

  // Onboarding tooltip logic
  useEffect(() => {
    AsyncStorage.getItem('memeGenOnboarded').then(val => {
      if (!val) setShowOnboarding(true);
    });
  }, []);
  const dismissOnboarding = () => {
    setShowOnboarding(false);
    AsyncStorage.setItem('memeGenOnboarded', '1');
  };

  // Shake animation for input error
  const triggerInputError = () => {
    setShowInputError(true);
    Animated.sequence([
      Animated.timing(inputShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(inputShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(inputShakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(inputShakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(inputShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => setShowInputError(false));
  };

  // Button press scale animation helpers
  const animateScale = (anim) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
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

  const handleBack = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 30,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
    ]).start(() => {
      if (onNavigate) {
        onNavigate('home');
      }
    });
  };

  // Fade-in animation for new meme
  const showMemeWithFade = () => {
    memeFadeAnim.setValue(0);
    Animated.timing(memeFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  // Modified generateMeme to handle empty topic
  const handleGeneratePress = () => {
    if (!topic.trim()) {
      triggerInputError();
      return;
    }

    // Check for sufficient credits
    if (user && credits <= 0) {
      setAlertConfig({
        visible: true,
        title: (
          <View style={tw`flex-row items-center justify-center`}>
            <FontAwesomeIcon
              icon={faCoins}
              size={20}
              color={colors.accent.yellowDark}
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
        message: "You've used all your credits. Purchase more to continue creating amazing memes!",
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Buy Credits',
            style: 'default',
            onPress: () => {
              if (typeof onNavigate === 'function') {
                onNavigate('generator', 'dashboard:credits');
              } else if (typeof setActiveMode === 'function') {
                setActiveMode('dashboard:credits');
              }
            },
          },
        ],
      });
      return;
    }

    // Check for anonymous user limit
    if (!user && anonymousUsageCount >= MAX_ANONYMOUS_GENERATIONS) {
      setAlertConfig({
        visible: true,
        title: "Need More Credits!",
        message: "You've used all 5 free generations. Sign up to get 5 more free credits",
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Up',
            style: 'default',
            onPress: () => {
              // Show auth screen
              // You might need to add setShowAuth prop if not available
            },
          },
        ],
      });
      return;
    }

    animateScale(generateScale);
    generateMeme();
  };

  // Modified generateMeme to trigger fade-in
  const generateMeme = async () => {
    setLoading(true);
    try {
      // Deduct credit for authenticated users
      if (user) {
        const success = await deductCredit();
        if (!success) {
          setLoading(false);
          return; // Alert is already shown by deductCredit
        }
      } else {
        // Increment anonymous usage
        await incrementAnonymousUsage();
      }

      let aiResult = { caption: '' };
      if (topic.trim()) {
        aiResult = await getGeminiMemeCaption({ topic });
      } else {
        setLoading(false);
        setAlertConfig({ visible: true, title: 'Input Required', message: 'Please enter a topic.', buttons: [{ text: 'OK', style: 'default' }] });
        return;
      }
      setCaption(aiResult.caption);
      // Fetch meme image from SerpAPI using the topic/idea
      const imageUrl = await fetchMemeImageFromSerpAPI(topic);
      setMemeImageUrl(imageUrl);
      showMemeWithFade();
    } catch (e) {
      setAlertConfig({ visible: true, title: 'AI Error', message: e.message, buttons: [{ text: 'OK', style: 'default' }] });
    }
    setLoading(false);
  };

  // Show success message with animation
  const showSuccessToast = () => {
    setShowSuccessMessage(true);
    Animated.sequence([
      Animated.timing(successFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(successFadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowSuccessMessage(false));
  };

  // Download meme image to device, charging 1 credit or using anonymous free quota
  const handleDownloadPress = () => {
    setAlertConfig({
      visible: true,
      title: 'Download Meme',
      message: 'Each download costs 1 credit. Do you want to continue?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'default',
          onPress: () => downloadMeme(),
        },
      ],
    });
  };

  const downloadMeme = async () => {
    if (!memeImageUrl) return;
    setDownloading(true);
    if (user) {
      const success = await deductCredit();
      if (!success) {
        setDownloading(false);
        return; // Alert is already shown by deductCredit
      }
    } else {
      if (anonymousUsageCount >= MAX_ANONYMOUS_GENERATIONS) {
        setAlertConfig({ visible: true, title: 'Limit reached', message: 'You have used all your free downloads. Please log in to get more credits.', buttons: [{ text: 'OK', style: 'default' }] });
        setDownloading(false);
        return;
      }
      await incrementAnonymousUsage();
    }
    try {
      const filename = memeImageUrl.split('/').pop().split('?')[0];
      const fileUri = FileSystem.cacheDirectory + filename;
      const { uri } = await FileSystem.downloadAsync(memeImageUrl, fileUri);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setAlertConfig({ visible: true, title: 'Permission required', message: 'Please allow access to save images.', buttons: [{ text: 'OK', style: 'default' }] });
        setDownloading(false);
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      if (user) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
        await refreshCredits();
      } else {
        setAlertConfig({ visible: true, title: 'Downloaded!', message: `Meme image saved to your gallery. ${MAX_ANONYMOUS_GENERATIONS - anonymousUsageCount} free downloads left.`, buttons: [{ text: 'OK', style: 'default' }] });
      }
      showSuccessToast();
    } catch (e) {
      setAlertConfig({ visible: true, title: 'Download Error', message: e.message, buttons: [{ text: 'OK', style: 'default' }] });
    }
    setDownloading(false);
  };

  // Modified handleDownloadPress and Next
  const handleDownloadButton = () => {
    animateScale(downloadScale);
    handleDownloadPress();
  };
  const handleNextButton = () => {
    animateScale(nextScale);
    generateMeme();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, minWidth: 0 }}>
          <TouchableOpacity style={[styles.headerIcon, { marginRight: 8 }]} onPress={handleBack}>
            <FontAwesome name="arrow-left" size={20} color={colors.accent.yellowDark} />
          </TouchableOpacity>
          <AppText style={[styles.headerTitle, { color: colors.accent.yellowDark, fontSize: 18, fontWeight: '900', marginLeft: 4 }]} numberOfLines={1} ellipsizeMode="tail">
            Back
          </AppText>
        </View>
        <TouchableOpacity
          style={[
            tw`flex-row items-center px-2 py-1 rounded-full`,
            { backgroundColor: colors.accent.yellowDark, flexShrink: 0, maxWidth: 110 },
          ]}
          activeOpacity={1}
        >
          <FontAwesomeIcon
            icon={faCoins}
            size={12}
            color={colors.text.light}
            style={tw`mr-1`}
          />
          <AppText
            style={[
              tw`text-sm font-semibold`,
              { color: colors.text.light },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {user ? credits : MAX_ANONYMOUS_GENERATIONS - anonymousUsageCount}
          </AppText>
        </TouchableOpacity>
      </View>

      {/* KeyboardAvoidingView wraps the scrollable content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={HEADER_HEIGHT}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Centered input, error, and button */}
          <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: 16 }}>
            <AppText style={styles.sectionTitle}>
              AI Meme Generator
            </AppText>
            <AppText style={tw`text-gray-600  text-center mb-6 leading-6`}>
              Turn any idea into a viral meme
            </AppText>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.topicInput, { width: '100%', maxWidth: 320 }]}
                value={topic}
                onChangeText={setTopic}
                placeholder={examplePrompts[placeholderIndex]}
                placeholderTextColor={colors.text.muted}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {showInputError && (
                <AppText style={styles.inputErrorText}>
                  Please enter a topic to generate a meme.
                </AppText>
              )}
            </View>

            <TouchableOpacity
              style={[styles.generateButton, { marginTop: 12, paddingHorizontal: 8 }]}
              onPress={handleGeneratePress}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.text.light} />
                  <AppText style={{ color: colors.text.light, fontWeight: '700', fontSize: 15, marginLeft: 8 }}>
                    Generating...
                  </AppText>
                </View>
              ) : (
                <>
                  <FontAwesome name="magic" size={16} color={colors.text.light} style={{ marginRight: 6 }} />
                  <AppText style={{ color: colors.text.light, fontWeight: '700', fontSize: 15 }}>
                    Generate Meme
                  </AppText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Meme preview, download/next buttons, etc. */}
          {memeImageUrl ? (
            <>
              <Animated.View style={styles.memeCard}>
                <Image source={{ uri: memeImageUrl }} style={styles.memeImage} resizeMode="contain" />
              </Animated.View>
              <View style={styles.buttonRow}>
                <Animated.View style={{ flex: 1, transform: [{ scale: downloadScale }] }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.accent.yellowDark,
                      borderTopLeftRadius: 12,
                      borderBottomLeftRadius: 12,
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      paddingVertical: 12,
                      shadowColor: colors.accent.yellowDark,
                      shadowOpacity: 0.18,
                      shadowRadius: 8,
                      elevation: 3,
                      minHeight: 48,
                    }}
                    onPress={handleDownloadButton}
                    disabled={downloading || !memeImageUrl}
                    activeOpacity={0.85}
                  >
                    <FontAwesome name="download" size={17} color={colors.text.light} style={{ marginRight: 5 }} />
                    <AppText style={{ color: colors.text.light, fontWeight: '700', fontSize: 15 }}>
                      {downloading ? 'Downloading...' : 'Download'}
                    </AppText>
                  </TouchableOpacity>
                </Animated.View>
                <View style={{ width: 2, backgroundColor: colors.background.main }} />
                <Animated.View style={{ flex: 1, transform: [{ scale: nextScale }] }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: colors.accent.yellowDark,
                      borderTopRightRadius: 16,
                      borderBottomRightRadius: 16,
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      paddingVertical: 10,
                      minHeight: 48,
                    }}
                    onPress={handleNextButton}
                    disabled={loading || !memeImageUrl}
                    activeOpacity={0.8}
                  >
                    <FontAwesome name="arrow-right" size={20} color={colors.accent.yellowDark} />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </>
          ) : (
            <View style={styles.placeholderContent}>
              <View style={styles.placeholderIcon}>
                <FontAwesome name="smile-o" size={48} color={colors.accent.yellowDark} />
              </View>

              <AppText style={styles.placeholderTitle}>
                Let's create a meme!
              </AppText>

              <AppText style={styles.placeholderSubtitle}>
                Type in a topic above and tap <AppText style={styles.highlight}>Generate Meme</AppText>. Let your creativity do the talking
              </AppText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Alerts, Toasts, etc. */}
      <ThemedAlert
        visible={!!alertConfig}
        title={alertConfig?.title}
        message={alertConfig?.message}
        buttons={alertConfig?.buttons || [{ text: 'OK', style: 'default' }]}
        onClose={() => setAlertConfig(null)}
      />
      {showSuccessMessage && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 80,
            left: 20,
            right: 20,
            backgroundColor: colors.accent.yellowDark,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.accent.yellowDark,
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5,
            opacity: successFadeAnim,
            zIndex: 1000,
          }}
        >
          <FontAwesome name="check-circle" size={16} color={colors.text.light} style={{ marginRight: 8 }} />
          <AppText style={{ color: colors.text.light, fontWeight: '600', fontSize: 14 }}>
            Downloaded! Meme saved to gallery
          </AppText>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFCF7' },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0E8',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    textAlign: 'left',
    marginLeft: 8,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 8,
  },
  topicInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE89E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
    shadowColor: '#FFE89E',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    minHeight: 56,
    width: '100%',
    maxWidth: 320,
  },
  inputErrorText: {
    color: '#E53935',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  generateButton: {
    backgroundColor: colors.accent.yellowDark,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: colors.accent.yellowDark,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 56,
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  memeCard: {
    width: 320,
    height: 320,
    backgroundColor: '#000',
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 24,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  memeImage: {
    width: 320,
    height: 320,
    position: 'absolute',
    top: 0,
    left: 0
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 320,
    marginTop: 2,
    marginBottom: 8,
    borderRadius: 16,
  },
  placeholderContent: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 24,
    paddingHorizontal: 10,
    backgroundColor: '#fffefc', // softer background (optional)
    borderRadius: 16,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  placeholderIcon: {
    backgroundColor: "#fff8dc", // warm light yellow
    padding: 16,
    borderRadius: 50,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },

  placeholderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  placeholderSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    paddingHorizontal: 4,
  },

  sectionTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.accent.yellowDark,
    marginBottom: 2,
    marginTop: -4,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default MemeGenerator; 
