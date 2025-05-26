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
      gradient: [colors.accent.orange, colors.accent.olive],
    },
    {
      id: 2,
      title: "Smart Content Creation",
      description: "Generate engaging captions and discover trending hashtags that connect with your audience",
      icon: "hashtag",
      gradient: [colors.accent.orange, colors.accent.sage],
    },
    {
      id: 3,
      title: "Ready to Shine?",
      description: "Join creators who are making their content stand out with Hashly",
      icon: "rocket",
      gradient: [colors.accent.sage, colors.accent.orange],
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
          tw`w-32 h-32 rounded-3xl items-center justify-center mb-8`,
          commonStyles.shadow.large,
        ]}
      >
        <FontAwesome name={item.icon} size={50} color={colors.text.light} />
      </LinearGradient>

      <Text
        style={[
          tw`text-4xl font-extrabold text-center mb-4`,
          {
            color: colors.text.primary,
            letterSpacing: -0.5,
          },
        ]}
      >
        {item.title}
      </Text>

      <Text
        style={[
          tw`text-lg text-center px-4`,
          {
            color: colors.text.secondary,
            lineHeight: 24,
            letterSpacing: 0.2,
          },
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
      <View style={tw`w-full px-6 pt-6 pb-2`}>
        <View style={tw`w-full h-2 bg-gray-200 rounded-full overflow-hidden`}>
          <Animated.View
            style={[
              tw`h-2 rounded-full`,
              {
                width: `${100 / slides.length}%`,
                transform: [{ translateX }],
                backgroundColor: colors.accent.orange,
              },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background.main }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.main}
      />
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

      <View style={tw`px-6 mb-8`}>
        {/* Skip Button (outlined) */}
        <TouchableOpacity
          onPress={handleComplete}
          style={[
            tw`mb-3 py-3 rounded-full border`,
            { 
              borderColor: colors.accent.orange, 
              alignItems: "center",
              ...commonStyles.shadow.light,
            },
          ]}
        >
          <Text
            style={[tw`text-base font-medium`, { color: colors.accent.orange }]}
          >
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
                  animated: true,
                });
              }
            }
          }}
          style={[
            tw`py-3 rounded-full`,
            {
              backgroundColor: colors.accent.orange,
              alignItems: "center",
              ...commonStyles.shadow.medium,
            },
          ]}
        >
          <Text style={[tw`text-base font-bold`, { color: colors.text.light }]}>
            {currentIndex === slides.length - 1 ? "Get Started" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
