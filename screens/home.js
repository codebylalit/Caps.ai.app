import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import AuthScreen from "./auth";
import { useAuth } from "../authcontext";
import { useUsageTracking } from "./freecredits";

const HomeScreen = ({ setActiveMode }) => {
  const { user, supabase } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const {
    anonymousUsageCount,
    MAX_ANONYMOUS_GENERATIONS,
  } = useUsageTracking(); // Add usage tracking hook


  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("profiles") // Adjust table name if different
            .select("name")
            .eq("id", user.id)
            .single();

          if (error) {
            console.error("Error fetching profile:", error.message);
          } else {
            setDisplayName(data.name || "User");
          }
        } catch (err) {
          console.error("Error fetching profile:", err.message);
        }
      }
    };

    fetchUserProfile();
  }, [user, supabase]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };

  const handleLogin = () => {
    setShowAuth(true);
  };

  if (showAuth) {
    return <AuthScreen onClose={() => setShowAuth(false)} />;
  }

  const getGreeting = () => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) return "Good morning";
    else if (currentHour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <View style={tw`flex-1 p-6 bg-orange-50`}>
      {/* Top hashtag decorations */}
      <View style={tw`absolute top-0 right-0 -mr-10 -mt-10`}>
        <FontAwesome
          name="hashtag"
          size={72}
          color="#FB923C"
          style={{ opacity: 0.3 }}
        />
      </View>
      <View style={tw`absolute top-20 left-0 -ml-12`}>
        <FontAwesome
          name="tags"
          size={60}
          color="#3B82F6"
          style={{ opacity: 0.3 }}
        />
      </View>
      <View style={tw`mt-16 relative`}>
        {/* Header Section */}
        <View style={tw`mb-8`}>
          <View style={tw`flex-row justify-between items-start`}>
            <Text style={tw`text-3xl font-bold text-slate-800`}>
              {getGreeting()},
            </Text>
          </View>
          <Text style={tw`text-lg text-slate-600 leading-relaxed`}>
            Create perfect captions for your content with AI-powered suggestions
          </Text>
        </View>

        {/* Cards */}
        <View style={tw`gap-4`}>
          <TouchableOpacity
            style={tw`p-6 rounded-3xl bg-orange-200 shadow-sm`}
            onPress={() => setActiveMode("mood")}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center mb-2`}>
                  <Text style={tw`text-xl font-bold text-slate-800 mr-2`}>
                    Smart Captions
                  </Text>
                  <FontAwesome name="magic" size={16} color="#FB923C" />
                </View>
                <Text style={tw`text-base text-slate-600`}>
                  Create engaging captions with AI
                </Text>
              </View>
              <View
                style={tw`w-12 h-12 rounded-full bg-orange-100 items-center justify-center`}
              >
                <FontAwesome name="comment" size={28} color="#FB923C" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`p-6 rounded-3xl bg-violet-200 shadow-sm`}
            onPress={() => setActiveMode("niche")}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center mb-2`}>
                  <Text style={tw`text-xl font-bold text-slate-800 mr-2`}>
                    Hashtag Pro
                  </Text>
                  <FontAwesome name="fire" size={16} color="#8B5CF6" />
                </View>
                <Text style={tw`text-base text-slate-600`}>
                  Trending hashtags for your niche
                </Text>
              </View>
              <View
                style={tw`w-12 h-12 rounded-full bg-violet-100 items-center justify-center`}
              >
                <FontAwesome name="hashtag" size={28} color="#8B5CF6" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`p-6 rounded-3xl bg-green-200 shadow-sm`}
            onPress={() => setActiveMode("image")}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center mb-2`}>
                  <Text style={tw`text-xl font-bold text-slate-800 mr-2`}>
                    Image Analysis
                  </Text>
                  <FontAwesome name="camera" size={16} color="#34D399" />
                </View>
                <Text style={tw`text-base text-slate-600`}>
                  Get captions from your images
                </Text>
              </View>
              <View
                style={tw`w-12 h-12 rounded-full bg-green-100 items-center justify-center`}
              >
                <FontAwesome name="picture-o" size={28} color="#34D399" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom hashtag decoration */}
        <View style={tw`absolute bottom-0 right-0 -mr-20 -mb-20`}>
          <FontAwesome
            name="hashtag"
            size={120}
            color="#FB923C"
            style={{ opacity: 0.1 }}
          />
        </View>
      </View>
      {!user ? (
        <View style={tw`mt-12`}>
          <Text style={tw`text-base text-slate-600 mb-4`}>
            Please log in to access personalized features:
          </Text>
          <TouchableOpacity
            style={tw`p-3 bg-orange-500 rounded-lg`}
            onPress={handleLogin}
          >
            <Text style={tw`text-white text-center font-bold`}>Log In</Text>
          </TouchableOpacity>
          <Text style={tw`text-xs text-slate-500 mt-2 text-center`}>
            Credits Left: {MAX_ANONYMOUS_GENERATIONS - anonymousUsageCount}
          </Text>
        </View>
      ) : (
        <View style={tw`mt-14`}>
          <Text style={tw`text-md top-14 text-center font-bold text-slate-800`}>
            Welcome, {user.email.split("@")[0]}
          </Text>
          <TouchableOpacity
            onPress={handleLogout}
            style={tw`flex-row items-center mt-18 flex-row p-2 justify-center items-center bg-orange-500 rounded-lg`}
          >   
              {/* Icon Container */}
              <View style={tw`w-10 h-10 items-center justify-center`}>
                <FontAwesome name="sign-out" size={20} color="white" />
              </View>
              {/* Text */}
              <Text style={tw`text-white text-center font-bold`}>
                Log Out
              </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default HomeScreen;
