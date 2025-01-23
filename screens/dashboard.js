import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Clipboard,
  TextInput,
  AppState,
  Platform,
} from "react-native";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PaymentManager from "./payment";
const UserDashboard = ({
  activeTab,
  user,
  history,
  setShowAuth,
  setActiveMode,
  deleteHistoryItem,
  supabase,
  getThemeColors,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [localUser, setLocalUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (user?.id) {
      fetchUserProfile();
      fetchUserCredits();
      fetchTransactions();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id);

      if (checkError) throw checkError;

      if (!existingProfile || existingProfile.length === 0) {
        const { error: insertError } = await supabase.from("profiles").insert([
          {
            id: user.id,
            name: user?.name || "User",
          },
        ]);

        if (insertError) throw insertError;

        setLocalUser({
          ...user,
          name: user?.name || "User",
        });
        setDisplayName(user?.name || "User");
      } else {
        setLocalUser({
          ...user,
          ...existingProfile[0],
        });
        setDisplayName(existingProfile[0].name || user?.name || "User");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setLocalUser(user);
      setDisplayName(user?.name || "User");
    }
  };

 const fetchUserCredits = async () => {
   try {
     const { data, error } = await supabase
       .from("profiles")
       .select("credits")
       .eq("id", user.id)
       .single();

     if (error) throw error;

     if (!data) {
       const { error: insertError } = await supabase
         .from("profiles")
         .update({ credits: 0 })
         .eq("id", user.id);

       if (insertError) throw insertError;
       setCredits(0);
     } else {
       setCredits(data.credits || 0);
     }
   } catch (error) {
     console.error("Error fetching credits:", error);
     setCredits(0);
   }
 };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .eq("credits_added", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: displayName.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setLocalUser((prev) => ({
        ...prev,
        name: displayName.trim(),
      }));

      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Profile update error:", error);
      Alert.alert("Error", "Failed to update profile. Please try again later.");
    }
  };

  const getInitial = (name) => {
    return (name || "User").charAt(0).toUpperCase();
  };

  const renderHistoryContent = () => {
    if (!user) {
      return (
        <View style={tw`flex-1 justify-center items-center p-6`}>
          <Text
            style={tw`text-xl text-slate-800 font-semibold mb-4 text-center`}
          >
            Sign in to view your history
          </Text>
          <TouchableOpacity
            style={tw`p-4 bg-orange-500 rounded-lg w-full`}
            onPress={() => setShowAuth(true)}
          >
            <Text style={tw`text-white text-center font-bold text-lg`}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={tw`flex-1 px-4 py-3`}>
        <TouchableOpacity
          style={tw`mb-6 flex-row items-center`}
          onPress={() => setActiveMode(null)}
        >
          <FontAwesome
            name="arrow-left"
            size={16}
            color="#1F2937"
            style={tw`mr-2`}
          />
          <Text style={tw`text-base text-slate-800 font-medium`}>Back</Text>
        </TouchableOpacity>

        {history.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center p-6`}>
            <Text style={tw`text-lg text-slate-600 text-center`}>
              No caption history yet. Generate some captions to see them here!
            </Text>
          </View>
        ) : (
          history.map((item) => (
            <View
              key={item.id}
              style={tw`bg-white p-4 rounded-2xl mb-4 shadow-sm`}
            >
              <View style={tw`flex-row justify-between items-center mb-2`}>
                <Text style={tw`text-sm text-slate-500`}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
                <View style={tw`flex-row items-center`}>
                  <Text
                    style={tw`text-sm ${
                      getThemeColors().text
                    } font-medium mr-3`}
                  >
                    {item.mode} • {item.category}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        "Delete History",
                        "Are you sure you want to delete this caption?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => deleteHistoryItem(item.id),
                          },
                        ]
                      );
                    }}
                  >
                    <FontAwesome name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={tw`text-base text-slate-800 mb-3`}>
                {item.caption}
              </Text>

              <View style={tw`flex-row flex-wrap gap-2`}>
                {item.hashtags.map((tag, index) => (
                  <Text
                    key={index}
                    style={tw`${getThemeColors().text} text-sm font-medium`}
                  >
                    #{tag}
                  </Text>
                ))}
              </View>

              <TouchableOpacity
                style={tw`mt-3 p-3 rounded-xl ${
                  getThemeColors().bg
                } items-center`}
                onPress={() => {
                  const text = `${item.caption}\n\n${item.hashtags
                    .map((tag) => `#${tag}`)
                    .join(" ")}`;
                  Clipboard.setString(text);
                  Alert.alert(
                    "Copied!",
                    "Caption and hashtags copied to clipboard"
                  );
                }}
              >
                <Text style={tw`${getThemeColors().text} font-semibold`}>
                  Copy to Clipboard
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const renderProfileContent = () => {
    if (!localUser) {
      return (
        <View style={tw`flex-1 justify-center items-center p-6`}>
          <Text
            style={tw`text-xl text-slate-800 font-semibold mb-4 text-center`}
          >
            Sign in to view your profile
          </Text>
          <TouchableOpacity
            style={tw`p-4 bg-orange-500 rounded-lg w-full`}
            onPress={() => setShowAuth(true)}
          >
            <Text style={tw`text-white text-center font-bold text-lg`}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={tw`flex-1 px-4 py-3`}>
        <TouchableOpacity
          style={tw`mb-6 flex-row items-center`}
          onPress={() => setActiveMode(null)}
        >
          <FontAwesome
            name="arrow-left"
            size={16}
            color="#1F2937"
            style={tw`mr-2`}
          />
          <Text style={tw`text-base text-slate-800 font-medium`}>Back</Text>
        </TouchableOpacity>

        <View style={tw`items-center mt-2 mb-8`}>
          <View style={tw`bg-orange-100 rounded-full p-1 mb-4`}>
            {localUser?.avatar_url ? (
              <Image
                source={{ uri: localUser.avatar_url }}
                style={tw`w-24 h-24 rounded-full`}
              />
            ) : (
              <View
                style={tw`w-24 h-24 rounded-full bg-orange-500 justify-center items-center`}
              >
                <Text style={tw`text-4xl font-bold text-white`}>
                  {getInitial(localUser?.name || displayName)}
                </Text>
              </View>
            )}
          </View>

          {isEditing ? (
            <View style={tw`w-full px-4`}>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                style={tw`text-xl font-semibold text-slate-800 mb-1 border-b border-orange-500 p-2 text-center`}
                placeholder="Enter your name"
                maxLength={50}
              />
              <View style={tw`flex-row justify-center mt-2`}>
                <TouchableOpacity
                  style={tw`bg-orange-500 px-4 py-2 rounded-lg mr-2`}
                  onPress={handleUpdateProfile}
                >
                  <Text style={tw`text-white font-bold`}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`bg-slate-400 px-4 py-2 rounded-lg`}
                  onPress={() => {
                    setDisplayName(localUser?.name || "");
                    setIsEditing(false);
                  }}
                >
                  <Text style={tw`text-white font-bold`}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={tw`text-xl font-semibold text-slate-800 mb-1`}>
              {localUser?.name || "User"}
            </Text>
          )}
          <Text style={tw`text-base text-slate-500`}>
            {localUser?.email || localUser?.phone || "@user"}
          </Text>
        </View>

        <View style={tw`bg-white rounded-2xl p-5 shadow-sm mb-4`}>
          {[
            {
              icon: "user",
              label: "Edit Profile",
              onPress: () => setIsEditing(true),
            },
            {
              icon: "sign-out",
              label: "Logout",
              onPress: async () => {
                await supabase.auth.signOut();
                setLocalUser(null);
              },
            },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={tw`flex-row items-center py-4 ${
                index > 0 ? "border-t border-slate-100" : ""
              }`}
              onPress={item.onPress}
            >
              <FontAwesome
                name={item.icon}
                size={16}
                color="#64748B"
                style={tw`mr-3`}
              />
              <Text style={tw`text-base text-slate-600`}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderCreditsContent = () => {
    if (!user) {
      return (
        <View style={tw`flex-1 justify-center items-center p-6`}>
          <Text
            style={tw`text-xl text-slate-800 font-semibold mb-4 text-center`}
          >
            Sign in to manage credits
          </Text>
          <TouchableOpacity
            style={tw`p-4 bg-orange-500 rounded-lg w-full`}
            onPress={() => setShowAuth(true)}
          >
            <Text style={tw`text-white text-center font-bold text-lg`}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={tw`flex-1`}>
        <PaymentManager
          user={user}
          supabase={supabase}
          credits={credits}
          setCredits={setCredits}
          fetchUserCredits={fetchUserCredits}
          transactions={transactions}
          setTransactions={setTransactions}
        />
      </View>
    );
  };

  return (
    <View style={tw`flex-1`}>
      {activeTab === "history" && renderHistoryContent()}
      {activeTab === "profile" && renderProfileContent()}
      {activeTab === "credits" && renderCreditsContent()}
    </View>
  );
};

export default UserDashboard;
