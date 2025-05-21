import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { colors, commonStyles } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = new Animated.Value(0);

  const slides = [
    {
      id: 1,
      title: "Welcome to Caps.ai",
      description: "Your AI-powered caption generator for social media success",
      icon: "magic",
      gradient: [colors.accent.sage, colors.accent.olive],
    },
    {
      id: 2,
      title: "Smart Caption Generation",
      description: "Create engaging captions that connect with your audience",
      icon: "comment",
      gradient: [colors.accent.orange, colors.accent.sage],
    },
    {
      id: 3,
      title: "Ready to Start?",
      description: "Join thousands of creators making their content stand out",
      icon: "rocket",
      gradient: [colors.accent.olive, colors.accent.sage],
    }
  ];

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const renderSlide = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <View style={[tw`flex-1 items-center justify-center px-8`, { width }]}>
        <Animated.View 
          style={[
            tw`items-center justify-center mb-12`,
            {
              opacity,
              transform: [{ scale }],
            }
          ]}
        >
          <LinearGradient
            colors={item.gradient}
            style={[
              tw`w-32 h-32 rounded-3xl items-center justify-center mb-8`,
              commonStyles.shadow.large,
            ]}
          >
            <FontAwesome
              name={item.icon}
              size={50}
              color={colors.text.light}
            />
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={[
            tw`items-center`,
            {
              opacity,
              transform: [{ scale }],
            }
          ]}
        >
          <Text style={[
            tw`text-3xl font-bold text-center mb-4`,
            { color: colors.text.primary }
          ]}>
            {item.title}
          </Text>
          <Text style={[
            tw`text-lg text-center leading-relaxed px-4`,
            { color: colors.text.secondary }
          ]}>
            {item.description}
          </Text>
        </Animated.View>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={tw`flex-row justify-center items-center mb-8`}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [1, 1.5, 1], // Scale up the active dot
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                tw`w-2 h-2 rounded-full mx-1`,
                {
                  opacity,
                  transform: [{ scale }],
                  backgroundColor: colors.accent.sage,
                }
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background.main }]}>
      <View style={tw`flex-1`}>
        <Animated.FlatList
          data={slides}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderSlide}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false } // Set useNativeDriver to false for width animation
          )}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(
              event.nativeEvent.contentOffset.x / width
            );
            setCurrentIndex(newIndex);
          }}
        />

        {renderPagination()}

        <View style={tw`px-8 pb-8 flex-row justify-between items-center`}>
          <TouchableOpacity
            onPress={handleComplete}
            style={tw`py-3 px-6`}
          >
            <Text style={[tw`font-medium`, { color: colors.text.secondary }]}>
              Skip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (currentIndex === slides.length - 1) {
                handleComplete();
              } else {
                setCurrentIndex(currentIndex + 1);
                // We can keep this for now, it doesn't drive the problematic animation
                // scrollX.setValue((currentIndex + 1) * width);
              }
            }}
            style={[
              tw`py-3 px-8 rounded-full`,
              { backgroundColor: colors.accent.sage },
              commonStyles.shadow.medium,
            ]}
          >
            <Text style={[tw`font-semibold text-base`, { color: colors.text.light }]}>
              {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen; 