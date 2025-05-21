import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  TextInput,
} from "react-native";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { useAuth } from "../hooks/useAuth";
import { colors, commonStyles } from "../theme/colors";

const Profile = ({ setActiveMode, setShowAuth }) => {
  const { user, supabase } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [localUser, setLocalUser] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchUserProfile();
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
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background.main,
        paddingHorizontal: 16,
        paddingTop: 16,
      }}
    >
      <TouchableOpacity
        style={{ marginBottom: 24, flexDirection: "row", alignItems: "center" }}
        onPress={() => setActiveMode(null)}
      >
        <FontAwesome
          name="arrow-left"
          size={20}
          color={colors.text.primary}
          style={{ marginRight: 8 }}
        />
        <Text
          style={{
            fontSize: 16,
            color: colors.text.primary,
            fontWeight: "500",
          }}
        >
          Back
        </Text>
      </TouchableOpacity>

      <View style={{ alignItems: "center", marginTop: 8, marginBottom: 32 }}>
        <View
          style={{
            backgroundColor: colors.accent.beige,
            borderRadius: 9999,
            padding: 4,
            marginBottom: 16,
          }}
        >
          {localUser?.avatar_url ? (
            <Image
              source={{ uri: localUser.avatar_url }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
            />
          ) : (
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: colors.accent.orange,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 40,
                  fontWeight: "700",
                  color: colors.text.light,
                }}
              >
                {getInitial(localUser?.name || displayName)}
              </Text>
            </View>
          )}
        </View>

        {isEditing ? (
          <View style={{ width: "100%", paddingHorizontal: 16 }}>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: colors.text.primary,
                marginBottom: 8,
                borderBottomWidth: 2,
                borderBottomColor: colors.accent.orange,
                padding: 8,
                textAlign: "center",
              }}
              placeholder="Enter your name"
              maxLength={50}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginTop: 8,
              }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: colors.accent.orange,
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  borderRadius: commonStyles.borderRadius.medium,
                  marginRight: 8,
                }}
                onPress={handleUpdateProfile}
              >
                <Text style={{ color: colors.text.light, fontWeight: "700" }}>
                  Save
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.text.muted,
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  borderRadius: commonStyles.borderRadius.medium,
                }}
                onPress={() => {
                  setDisplayName(localUser?.name || "");
                  setIsEditing(false);
                }}
              >
                <Text style={{ color: colors.text.light, fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              color: colors.text.primary,
              marginBottom: 4,
            }}
          >
            {localUser?.name || "User"}
          </Text>
        )}
        <Text style={{ fontSize: 16, color: colors.text.secondary }}>
          {localUser?.email || localUser?.phone || "@user"}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.background.card,
          borderRadius: commonStyles.borderRadius.large,
          padding: 24,
          ...commonStyles.shadow.light,
          marginBottom: 24,
        }}
      >
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
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 16,
              borderTopWidth: index > 0 ? 1 : 0,
              borderTopColor: colors.border.light,
            }}
            onPress={item.onPress}
          >
            <FontAwesome
              name={item.icon}
              size={20}
              color={colors.text.muted}
              style={{ marginRight: 12 }}
            />
            <Text style={{ fontSize: 16, color: colors.text.secondary }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

export default Profile;
