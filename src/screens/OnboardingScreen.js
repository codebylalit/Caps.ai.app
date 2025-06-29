import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  StyleSheet,
  FlatList,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { colors, commonStyles } from "../theme/colors";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const OnboardingScreen = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const slides = [
    {
      id: 1,
      title: "Welcome to Hashly",
      description: "Your AI-powered social media companion for engaging captions and trending hashtags",
      icon: "magic",
      gradient: [colors.accent.teal, colors.accent.blue],
    },
    {
      id: 2,
      title: "Smart Content Creation",
      description: "Generate engaging captions and discover trending hashtags that connect with your audience",
      icon: "hashtag",
      gradient: [colors.accent.purple, colors.accent.pink],
    },
    {
      id: 3,
      title: "Ready to Shine?",
      description: "Join creators who are making their content stand out with Hashly",
      icon: "smile-o",
      gradient: [colors.accent.teal, colors.accent.yellow

      ],
    },
  ];

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      if (typeof onComplete === 'function') {
        onComplete();
      } else {
        console.error("onComplete prop is not a function");
      }
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }
  };

  const renderSlide = ({ item }) => (
    <View style={[tw`flex-1 items-center justify-center px-8`, { width }]}>
      <LinearGradient
        colors={item.gradient}
        style={[
          { width: 130, height: 130, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 32, ...commonStyles.shadow.large },
        ]}
      >
        <FontAwesome name={item.icon} size={54} color={colors.text.light} />
      </LinearGradient>

      <Text
        style={[
          { fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 12, color: colors.text.primary, letterSpacing: -0.5 },
        ]}
      >
        {item.title}
      </Text>

      <Text
        style={[
          { fontSize: 17, textAlign: 'center', color: colors.text.secondary, lineHeight: 26, letterSpacing: 0.2, marginBottom: 0, paddingHorizontal: 8 },
        ]}
      >
        {item.description}
      </Text>
    </View>
  );

  const renderProgressBar = () => {
    const inputRange = slides.map((_, i) => i * width);

    const translateX = scrollX.interpolate({
      inputRange,
      outputRange: slides.map((_, i) => (i * width) / slides.length),
    });

    return (
      <View style={{ width: '100%', paddingHorizontal: 28, paddingTop: 28, paddingBottom: 10 }}>
        <View style={{ width: '100%', height: 7, backgroundColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
          <Animated.View
            style={[
              { height: 7, borderRadius: 8, width: `${100 / slides.length}%`, transform: [{ translateX }], backgroundColor: '#AEE6E6' },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={["#E3F0FF", "#AEE6E6", "#FFF9DB"]}
        style={{ flex: 1 }}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        {/* Creative background visuals */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} pointerEvents="none">
          <FontAwesome name="magic" size={120} color={colors.accent.teal} style={{ position: 'absolute', top: 40, left: -30, opacity: 0.08, transform: [{ rotate: '-18deg' }] }} />
          <FontAwesome name="hashtag" size={100} color={colors.accent.purple} style={{ position: 'absolute', top: 180, right: -20, opacity: 0.07, transform: [{ rotate: '12deg' }] }} />
          <FontAwesome name="smile-o" size={110} color={colors.accent.yellow} style={{ position: 'absolute', bottom: 80, left: 10, opacity: 0.09, transform: [{ rotate: '-8deg' }] }} />
          <FontAwesome name="image" size={90} color={colors.accent.blue} style={{ position: 'absolute', bottom: 30, right: 0, opacity: 0.07, transform: [{ rotate: '8deg' }] }} />
        </View>
        {renderProgressBar()}

        <Animated.FlatList
          ref={flatListRef}
          data={slides}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderSlide}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(
              event.nativeEvent.contentOffset.x / width
            );
            setCurrentIndex(newIndex);
          }}
          scrollEnabled={true}
          bounces={false}
          decelerationRate="fast"
          snapToInterval={width}
          snapToAlignment="center"
        />

        <View style={{ paddingHorizontal: 28, marginBottom: 28 }}>
          <View style={{ gap: 10 }}>
            {/* Skip Button (outlined, soft bg) */}
            <TouchableOpacity
              onPress={handleComplete}
              style={{
                paddingVertical: 15,
                borderRadius: 22,
                borderWidth: 1.5,
                borderColor: '#AEE6E6',
                alignItems: 'center',
                backgroundColor: 'rgba(174,230,230,0.18)',
                ...commonStyles.shadow.light,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#66B2B2' }}>
                Skip
              </Text>
            </TouchableOpacity>

            {/* Next / Get Started Button (filled) */}
            <TouchableOpacity
              onPress={() => {
                if (currentIndex === slides.length - 1) {
                  handleComplete();
                } else {
                  try {
                    const nextIndex = currentIndex + 1;
                    setCurrentIndex(nextIndex);
                    flatListRef.current?.scrollToIndex({
                      index: nextIndex,
                      animated: true,
                    });
                  } catch (error) {
                    console.error("Error navigating to next slide:", error);
                    flatListRef.current?.scrollToOffset({
                      offset: (currentIndex + 1) * width,
                    });
                  }
                }
              }}
              style={{
                paddingVertical: 15,
                borderRadius: 22,
                alignItems: 'center',
                backgroundColor: undefined,
                overflow: 'hidden',
                ...commonStyles.shadow.medium,
              }}
            >
              <LinearGradient
                colors={["#AEE6E6", colors.accent.teal]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: '100%',
                  paddingVertical: 15,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 120,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary, letterSpacing: 0.2 }}>
                  {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
