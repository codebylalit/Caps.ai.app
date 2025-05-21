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
import FontAwesome from "react-native-vector-icons/FontAwesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PaymentManager from "./user/PaymentScreen";
import { colors, commonStyles } from '../theme/colors';

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
  const [credits, setCredits] = useState(0);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (user?.id) {
      fetchUserCredits();
      fetchTransactions();
    }
  }, [user]);

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

  const renderHistoryContent = () => {
    if (!user) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background.main }}>
          <Text style={{ fontSize: 20, color: colors.text.primary, fontWeight: '600', marginBottom: 24, textAlign: 'center' }}>
            Sign in to view your history
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.accent.orange, borderRadius: commonStyles.borderRadius.medium, padding: 16, width: '100%', alignItems: 'center', ...commonStyles.shadow.medium }}
            onPress={() => setShowAuth(true)}
          >
            <Text style={{ color: colors.text.light, fontWeight: '700', fontSize: 18 }}>Sign In</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.background.main }}>
        <TouchableOpacity
          style={{ marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => setActiveMode(null)}
        >
          <FontAwesome name="arrow-left" size={20} color={colors.text.primary} style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 16, color: colors.text.primary, fontWeight: '500' }}>Back</Text>
        </TouchableOpacity>

        {history.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Text style={{ fontSize: 16, color: colors.text.secondary, textAlign: 'center' }}>
              No caption history yet. Generate some captions to see them here!
            </Text>
          </View>
        ) : (
          history.map((item) => (
            <View key={item.id} style={{ backgroundColor: colors.background.card, padding: 16, borderRadius: commonStyles.borderRadius.large, marginBottom: 16, ...commonStyles.shadow.light }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: colors.text.muted }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: getThemeColors().text, fontWeight: '500', marginRight: 12 }}>
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
                    <FontAwesome name="trash" size={16} color={colors.status.error} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={{ fontSize: 16, color: colors.text.primary, marginBottom: 8 }}>{item.caption}</Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {item.hashtags.map((tag, index) => (
                  <Text key={index} style={{ color: getThemeColors().text, fontSize: 13, fontWeight: '500', marginRight: 8 }}>
                    #{tag}
                  </Text>
                ))}
              </View>

              <TouchableOpacity
                style={{ marginTop: 12, padding: 12, borderRadius: commonStyles.borderRadius.medium, backgroundColor: getThemeColors().bg, alignItems: 'center' }}
                onPress={() => {
                  const text = `${item.caption}\n\n${item.hashtags.map((tag) => `#${tag}`).join(" ")}`;
                  Clipboard.setString(text);
                  Alert.alert("Copied!", "Caption and hashtags copied to clipboard");
                }}
              >
                <Text style={{ color: getThemeColors().text, fontWeight: '700' }}>
                  Copy to Clipboard
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const renderCreditsContent = () => {
    if (!user) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background.main }}>
          <Text style={{ fontSize: 20, color: colors.text.primary, fontWeight: '600', marginBottom: 24, textAlign: 'center' }}>
            Sign in to manage credits
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.accent.orange, borderRadius: commonStyles.borderRadius.medium, padding: 16, width: '100%', alignItems: 'center', ...commonStyles.shadow.medium }}
            onPress={() => setShowAuth(true)}
          >
            <Text style={{ color: colors.text.light, fontWeight: '700', fontSize: 18 }}>Sign In</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: colors.background.main }}>
        <PaymentManager
          user={user}
          supabase={supabase}
          credits={credits}
          setCredits={setCredits}
          fetchUserCredits={fetchUserCredits}
          transactions={transactions}
          setTransactions={setTransactions}
          setActiveMode={setActiveMode}
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.main }}>
      {activeTab === "history" && renderHistoryContent()}
      {activeTab === "credits" && renderCreditsContent()}
    </View>
  );
};

export default UserDashboard;
