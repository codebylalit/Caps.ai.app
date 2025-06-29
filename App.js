import React, { useState, useEffect } from "react";
import { SafeAreaView, StatusBar, View, Platform } from "react-native";
import tw from "twrnc";
import { AuthProvider } from './src/hooks/useAuth';
import HomeScreen from './src/screens/HomeScreen';
import GeneratorScreen from './src/screens/GeneratorScreen';
import MemeGenerator from './src/screens/MemeGenerator';
import { ActivityIndicator } from "react-native";
import Constants from 'expo-constants';
import DotsLoader from './src/components/DotsLoader';
import { useFonts } from 'expo-font';
import AppLoading from 'expo-app-loading';


const isExpoGo = Constants.executionEnvironment === 'storeClient';

const LoadingScreen = () => (
  <View style={tw`flex-1 justify-center items-center bg-white`}>
    <DotsLoader color="#7BC47F" size={16} />
  </View>
);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [activeMode, setActiveMode] = useState(null);

  const [fontsLoaded] = useFonts({
    'CalSans-Regular': require('./assets/fonts/CalSans-Regular.ttf'),
    // 'Poppins-Regular': require('./assets/fonts/Poppins/Poppins-Regular.ttf'),
    // 'Poppins-Bold': require('./assets/fonts/Poppins/Poppins-Bold.ttf'),
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleNavigation = (screen, mode = null) => {
    setCurrentScreen(screen);
    if (mode) {
      setActiveMode(mode);
    }
  };

  if (isLoading || !fontsLoaded) {
    return <AppLoading />;
  }

  return (
    <AuthProvider>
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <StatusBar barStyle="dark-content" />
        {currentScreen === 'home' ? (
          <HomeScreen 
            onNavigate={handleNavigation}
            setActiveMode={setActiveMode}
          />
        ) : currentScreen === 'meme' ? (
          <MemeGenerator onNavigate={handleNavigation} />
        ) : (
          <GeneratorScreen 
            onNavigate={handleNavigation}
            activeMode={activeMode}
            setActiveMode={setActiveMode}
          />
        )}
      </SafeAreaView>
    </AuthProvider>
  );
}
