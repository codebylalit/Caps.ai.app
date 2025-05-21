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
import tw from '../../tw-rn';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

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
      color: "violet",
      bgColor: "bg-violet-50",
      iconColor: "text-violet-500",
      borderColor: "border-violet-200"
    },
    {
      id: 2,
      title: "Smart Caption Generation",
      description: "Create engaging captions that connect with your audience",
      icon: "comment",
      color: "orange",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-500",
      borderColor: "border-orange-200"
    },
    {
      id: 3,
      title: "Ready to Start?",
      description: "Join thousands of creators making their content stand out",
      icon: "rocket",
      color: "emerald",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-500",
      borderColor: "border-emerald-200"
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
    });

    return (
      <View style={[tw`flex-1 items-center justify-center px-8`, { width }]}>
        <View style={tw`${item.bgColor} p-8 rounded-full mb-8 border-2 ${item.borderColor}`}>
          <FontAwesome
            name={item.icon}
            size={60}
            style={tw`${item.iconColor}`}
          />
        </View>
        <Text style={tw`text-3xl font-bold text-neutral-800 text-center mb-4`}>
          {item.title}
        </Text>
        <Text style={tw`text-lg text-neutral-600 text-center leading-relaxed`}>
          {item.description}
        </Text>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={tw`flex-row justify-center items-center mb-8`}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              tw`w-2 h-2 rounded-full mx-1`,
              currentIndex === index
                ? tw`bg-primary-500 w-4`
                : tw`bg-neutral-300`,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
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
            { useNativeDriver: false }
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
            <Text style={tw`text-neutral-500 font-medium`}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (currentIndex === slides.length - 1) {
                handleComplete();
              } else {
                setCurrentIndex(currentIndex + 1);
                scrollX.setValue((currentIndex + 1) * width);
              }
            }}
            style={tw`bg-primary-500 py-3 px-6 rounded-full shadow-sm`}
          >
            <Text style={tw`text-white font-medium`}>
              {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen; 