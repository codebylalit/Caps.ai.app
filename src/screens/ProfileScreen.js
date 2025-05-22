import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  TextInput,
  BackHandler,
  Animated,
  Easing,
} from "react-native";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { useAuth } from "../hooks/useAuth";
import { colors, commonStyles } from "../theme/colors";

const LoadingAnimation = () => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[tw`flex-1 items-center justify-center`, { backgroundColor: colors.background.main }]}>
      <Animated.View
        style={[
          tw`items-center`,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View
          style={[
            tw`w-16 h-16 rounded-full items-center justify-center mb-6`,
            { backgroundColor: colors.accent.sage + '15' },
          ]}
        >
          <FontAwesome name="user" size={24} color={colors.accent.sage} />
        </View>

        <Text
          style={[
            tw`text-base font-medium`,
            { color: colors.text.primary },
          ]}
        >
          Loading profile...
        </Text>
      </Animated.View>
    </View>
  );
};

const Profile = ({activeMode, setActiveMode, setShowAuth }) => {
  const { user, supabase } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [localUser, setLocalUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [generations, setGenerations] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      Promise.all([fetchUserProfile(), fetchUserStats()])
        .finally(() => {
          setTimeout(() => setIsLoading(false), 1000); // Minimum loading time for better UX
        });
    }
  }, [user]);

  useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, []);

  // Add back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isEditing) {
        setIsEditing(false);
        return true;
      }
      setActiveMode(null);
      return true;
    });

    return () => backHandler.remove();
  }, [isEditing, setActiveMode]);

  const handleBack = () => {
    if (isEditing) {
      setIsEditing(false);
      return;
    }
    // Animate exit before closing
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
    ]).start(() => {
      setActiveMode(null);
    });
  };

  const handleMenuPress = (onPress) => {
    if (isEditing) {
      setIsEditing(false);
    }
    onPress();
  };

  const fetchUserStats = async () => {
    try {
      // Set default values
      setCredits(0);
      setGenerations(0);

      // Fetch credits from profiles table
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", user.id)
          .single();

        if (!profileError && profileData) {
          setCredits(profileData.credits || 0);
        }
      } catch (error) {
        console.log("Error fetching credits:", error);
      }

      // Fetch total generations from caption_history
      try {
        const { count: generationsCount, error: generationsError } = await supabase
          .from("caption_history")
          .select("*", { count: "exact" })
          .eq("user_id", user.id);

        if (!generationsError && generationsCount !== null) {
          setGenerations(generationsCount);
        }
      } catch (error) {
        console.log("Error fetching generations:", error);
      }

    } catch (error) {
      console.log("Error fetching user stats:", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      // First get the user's auth data which contains the email
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

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
          ...authUser,
          name: user?.name || "User",
        });
        setDisplayName(user?.name || "User");
      } else {
        setLocalUser({
          ...user,
          ...authUser,
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

   const getThemeColor = () => {
      switch (activeMode) {
        case "mood":
          return colors.accent.sage;
        case "niche":
          return colors.accent.orange;
        case "image":
          return colors.accent.olive;
        case "textbehind":
          return colors.accent.purple;
        default:
          return colors.accent.sage;
      }
    };
  
    const themeColor = getThemeColor();

  const getInitial = (name) => {
    return (name || "User").charAt(0).toUpperCase();
  };

  if (isLoading) {
    return <LoadingAnimation />;
  }

  if (!localUser) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          backgroundColor: colors.background.main,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            color: colors.text.primary,
            fontWeight: "600",
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          Sign in to view your profile
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: colors.accent.orange,
            borderRadius: commonStyles.borderRadius.medium,
            padding: 16,
            width: "100%",
            alignItems: "center",
            ...commonStyles.shadow.medium,
          }}
          onPress={() => setShowAuth(true)}
        >
          <Text
            style={{
              color: colors.text.light,
              fontWeight: "700",
              fontSize: 18,
            }}
          >
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }}
    >
      <ScrollView
        style={{
          flex: 1,
          backgroundColor: colors.background.main,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[tw`px-5 pt-6 pb-4 bg-white`, commonStyles.shadow.light]}>
          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity
              style={[tw`flex-row items-center`]}
              onPress={handleBack}
            >
              <View
                style={[
                  tw`w-8 h-8 rounded-xl items-center justify-center`,
                  { backgroundColor: themeColor },
                  commonStyles.shadow.light,
                ]}
              >
                <FontAwesome
                  name="arrow-left"
                  size={16}
                  color="white"
                />
              </View>
              <Text
                style={[
                  tw`text-lg font-semibold ml-3 mt-[-4]`,
                  { color: colors.text.primary },
                ]}
              >
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Content */}
        <View style={tw`px-5 pt-5`}>
          {/* Avatar Section */}
          <View style={tw`items-center mb-6`}>
            <View
              style={[
                tw`w-20 h-20 rounded-full items-center justify-center mb-4`,
                { backgroundColor: colors.accent.sage },
                commonStyles.shadow.medium,
              ]}
            >
              {localUser?.avatar_url ? (
                <Image
                  source={{ uri: localUser.avatar_url }}
                  style={tw`w-20 h-20 rounded-full`}
                />
              ) : (
                <Text
                  style={[tw`text-4xl font-bold`, { color: colors.text.light }]}
                >
                  {getInitial(localUser?.name || displayName)}
                </Text>
              )}
            </View>

            {isEditing ? (
              <View style={tw`w-full`}>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={[
                    tw`text-lg font-semibold text-center mb-2 px-3 py-2 rounded-lg`,
                    {
                      color: colors.text.primary,
                      backgroundColor: colors.background.card,
                      borderWidth: 1,
                      borderColor: colors.accent.sage,
                    },
                    commonStyles.shadow.light,
                  ]}
                  placeholder="Enter your name"
                  maxLength={50}
                />
                <View style={tw`flex-row justify-center mt-3`}>
                  <TouchableOpacity
                    style={[
                      tw`px-6 py-2 rounded-lg mr-2`,
                      { backgroundColor: colors.accent.sage },
                      commonStyles.shadow.light,
                    ]}
                    onPress={handleUpdateProfile}
                  >
                    <Text
                      style={[
                        tw`font-semibold text-sm`,
                        { color: colors.text.light },
                      ]}
                    >
                      Save Changes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      tw`px-6 py-2 rounded-lg`,
                      { backgroundColor: colors.background.card },
                      commonStyles.shadow.light,
                    ]}
                    onPress={() => {
                      setDisplayName(localUser?.name || "");
                      setIsEditing(false);
                    }}
                  >
                    <Text
                      style={[
                        tw`font-semibold text-sm`,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text
                  style={[
                    tw`text-2xl font-bold mb-1`,
                    { color: colors.text.primary },
                  ]}
                >
                  {localUser?.name || "User"}
                </Text>
                <Text style={[tw`text-sm`, { color: colors.text.secondary }]}>
                  {localUser?.email || localUser?.phone || "@user"}
                </Text>
              </>
            )}
          </View>

          {/* Stats Section */}
          <View
            style={[
              tw`flex-row justify-between mb-6 px-4 py-4 rounded-xl`,
              { backgroundColor: colors.background.card },
              commonStyles.shadow.medium,
            ]}
          >
            <View style={tw`items-center flex-1`}>
              <Text
                style={[
                  tw`text-2xl font-bold mb-1`,
                  { color: colors.text.primary },
                ]}
              >
                {generations}
              </Text>
              <Text
                style={[
                  tw`text-xs font-medium`,
                  { color: colors.text.secondary },
                ]}
              >
                Generations
              </Text>
            </View>
            <View style={tw`items-center flex-1`}>
              <Text
                style={[
                  tw`text-2xl font-bold mb-1`,
                  { color: colors.text.primary },
                ]}
              >
                {credits}
              </Text>
              <Text
                style={[
                  tw`text-xs font-medium`,
                  { color: colors.text.secondary },
                ]}
              >
                Credits
              </Text>
            </View>
          </View>

          {/* Menu Section */}
          <View
            style={[
              tw`rounded-xl overflow-hidden mb-6`,
              { backgroundColor: colors.background.card },
              commonStyles.shadow.medium,
            ]}
          >
            {[
              {
                icon: "user",
                label: "Edit Profile",
                onPress: () => handleMenuPress(() => setIsEditing(true)),
              },
              {
                icon: "credit-card",
                label: `Credits & Billing`,
                onPress: () =>
                  handleMenuPress(() =>
                    setActiveMode("dashboard:transactions")
                  ),
              },
              {
                icon: "history",
                label: "Generation History",
                onPress: () =>
                  handleMenuPress(() => setActiveMode("dashboard:history")),
              },
              {
                icon: "sign-out",
                label: "Logout",
                onPress: () =>
                  handleMenuPress(async () => {
                    try {
                      // Animate exit before logging out
                      Animated.parallel([
                        Animated.timing(fadeAnim, {
                          toValue: 0,
                          duration: 200,
                          useNativeDriver: true,
                          easing: Easing.in(Easing.cubic),
                        }),
                        Animated.timing(slideAnim, {
                          toValue: 50,
                          duration: 200,
                          useNativeDriver: true,
                          easing: Easing.in(Easing.cubic),
                        }),
                      ]).start(async () => {
                        await supabase.auth.signOut();
                        setLocalUser(null);
                        setActiveMode(null); // This will redirect to home screen
                      });
                    } catch (error) {
                      console.error("Logout error:", error);
                      Alert.alert("Error", "Failed to logout. Please try again.");
                    }
                  }),
              },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  tw`flex-row items-center px-4 py-3`,
                  index > 0 && {
                    borderTopWidth: 1,
                    borderTopColor: colors.border.light,
                  },
                ]}
                onPress={item.onPress}
              >
                <View
                  style={[
                    tw`w-8 h-8 rounded-lg items-center justify-center mr-3`,
                    { backgroundColor: colors.accent.sage + "15" },
                  ]}
                >
                  <FontAwesome
                    name={item.icon}
                    size={16}
                    color={colors.accent.sage}
                  />
                </View>
                <Text
                  style={[
                    tw`text-sm font-semibold`,
                    { color: colors.text.primary },
                  ]}
                >
                  {item.label}
                </Text>
                <FontAwesome
                  name="chevron-right"
                  size={12}
                  color={colors.text.muted}
                  style={tw`ml-auto`}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Version Info */}
          <View style={tw`items-center mb-6`}>
            <Text style={[tw`text-xs`, { color: colors.text.muted }]}>
              Version 1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

export default Profile;
