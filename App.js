import React, { useState } from "react";
import { SafeAreaView } from "react-native";
import tw from "twrnc";
import { AuthProvider } from "./authcontext";
import HomeScreen from "./screens/home";
import GeneratorScreen from "./screens/genrate";

const CaptionGenerator = () => {
  const [activeMode, setActiveMode] = useState(null);

  return (
    <AuthProvider>
      <SafeAreaView style={tw`flex-1 bg-slate-50`}>
        {activeMode === null ? (
          <HomeScreen setActiveMode={setActiveMode} />
        ) : (
          <GeneratorScreen
            activeMode={activeMode}
            setActiveMode={setActiveMode}
          />
        )}
      </SafeAreaView>
    </AuthProvider>
  );
};

export default CaptionGenerator;
