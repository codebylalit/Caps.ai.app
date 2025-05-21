import React, { useState, useEffect } from "react";
import { SafeAreaView, StatusBar, View } from "react-native";
import tw from "twrnc";
import { AuthProvider } from './src/hooks/useAuth';
import HomeScreen from './src/screens/HomeScreen';
import GeneratorScreen from './src/screens/GeneratorScreen';
import { ActivityIndicator } from "react-native";

const LoadingScreen = () => (
  <View style={tw`flex-1 justify-center items-center bg-slate-50`}>
    <ActivityIndicator size="large" color="#FB923C" />
  </View>
);

const CaptionGenerator = () => {
  const [activeMode, setActiveMode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Global loading handler
  const handleLoading = (loading) => {
    setIsLoading(loading);
  };

  return (
    <AuthProvider>
      <StatusBar hidden={true} />
      <SafeAreaView
        style={tw`flex-1 bg-slate-50`}
        edges={["right", "left", "bottom"]}
      >
        {isLoading ? (
          <LoadingScreen />
        ) : (
          <>
            {activeMode === null ? (
              <HomeScreen
                setActiveMode={setActiveMode}
                onLoadingChange={handleLoading}
              />
            ) : (
              <GeneratorScreen
                activeMode={activeMode}
                setActiveMode={setActiveMode}
                onLoadingChange={handleLoading}
              />
            )}
          </>
        )}
      </SafeAreaView>
    </AuthProvider>
  );
};

export default CaptionGenerator;
