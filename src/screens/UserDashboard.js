import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, ActivityIndicator } from "react-native";
import tw from "twrnc";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { useAuth } from "../hooks/useAuth";
import PaymentScreen from "./PaymentScreen";
import { colors, commonStyles } from "../theme/colors";

const UserDashboard = ({
  activeTab,
  user,
  history,
  setShowAuth,
  setActiveMode,
  deleteHistoryItem,
  supabase,
  setActiveTab,
}) => {
  const { userProfile, fetchUserProfile } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const fetchTransactions = async () => {
    if (!user || !supabase) return;
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error.message);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user, supabase]);

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.main }}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background.main} />
        <View style={tw`flex-1 justify-center items-center p-4`}>
          <Text style={[tw`text-lg mb-4 text-center`, { color: colors.text.secondary }]}>
            Please sign in to view your dashboard
          </Text>
          <TouchableOpacity
            style={[
              tw`px-6 py-3 rounded-lg`,
              { backgroundColor: colors.accent.sage },
              commonStyles.shadow.light,
            ]}
            onPress={() => setShowAuth(true)}
          >
            <Text style={[tw`font-semibold`, { color: colors.text.light }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.main }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.main}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: commonStyles.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "history" && (
          <View>
            <View
              style={[
                tw`flex-row items-center justify-between mb-6`,
                { backgroundColor: colors.background.main },
              ]}
            >
              <View style={tw`flex-1`}>
                <Text
                  style={[
                    tw`text-xl font-semibold`,
                    { color: colors.text.primary },
                  ]}
                >
                  Generation History
                </Text>
                <Text
                  style={[tw`text-sm mt-1`, { color: colors.text.secondary }]}
                >
                  Your past generations and captions
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveTab("generator")}
                style={[
                  tw`p-2 rounded-full ml-3`,
                  { backgroundColor: colors.background.card },
                ]}
              >
                <FontAwesome
                  name="chevron-left"
                  size={16}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            </View>
            {history.length === 0 ? (
              <View
                style={[
                  tw`p-6 rounded-lg items-center justify-center`,
                  { backgroundColor: colors.background.card },
                  commonStyles.shadow.light,
                ]}
              >
                <FontAwesome
                  name="history"
                  size={32}
                  color={colors.text.muted}
                  style={tw`mb-3`}
                />
                <Text style={[tw`text-center`, { color: colors.text.muted }]}>
                  No generation history found
                </Text>
              </View>
            ) : (
              history.map((item) => (
                <View
                  key={item.id}
                  style={[
                    tw`p-4 rounded-lg mb-4`,
                    { backgroundColor: colors.background.card },
                    commonStyles.shadow.light,
                  ]}
                >
                  <View style={tw`flex-row justify-between items-start mb-2`}>
                    <View style={tw`flex-1 mr-4`}>
                      <Text
                        style={[tw`text-base`, { color: colors.text.primary }]}
                      >
                        {item.caption}
                      </Text>
                      <Text
                        style={[
                          tw`text-sm mt-2`,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {new Date(item.created_at).toLocaleString()}
                      </Text>
                      {item.hashtags && (
                        <Text
                          style={[
                            tw`text-sm mt-1`,
                            { color: colors.text.muted },
                          ]}
                        >
                          {item.hashtags.map((tag) => `#${tag}`).join(" ")}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[
                        tw`w-8 h-8 items-center justify-center rounded-full`,
                        { backgroundColor: colors.status.error },
                        commonStyles.shadow.light,
                      ]}
                      onPress={() => deleteHistoryItem(item.id)}
                    >
                      <FontAwesome
                        name="trash"
                        size={14}
                        color={colors.text.light}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "credits" && (
          <View>
            <View
              style={[
                tw`flex-row items-center justify-between py-3 mb-2`,
                { backgroundColor: colors.background.main },
              ]}
            >
              <View style={tw`flex-1`}>
                <Text
                  style={[
                    tw`text-2xl font-bold flex-1`,
                    { color: colors.text.primary },
                  ]}
                >
                  Available Credits
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveTab("generator")}
                style={[
                  tw`p-2 rounded-full ml-3`,
                  { backgroundColor: colors.background.card },
                ]}
              >
                <FontAwesome
                  name="chevron-left"
                  size={16}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            </View>
            <PaymentScreen
              user={user}
              supabase={supabase}
              credits={userProfile?.credits || 0}
              fetchUserCredits={() => fetchUserProfile(user.id)}
              setActiveMode={setActiveMode}
              setActiveTab={setActiveTab}
            />
          </View>
        )}

        {activeTab === "transactions" && (
          <View>
            <View
              style={[
                tw`flex-row items-center justify-between mb-4`,
                { backgroundColor: colors.background.main },
              ]}
            >
              <View style={tw`flex-1`}>
                <Text
                  style={[
                    tw`text-xl font-semibold`,
                    { color: colors.text.primary },
                  ]}
                >
                  Transaction History
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveTab("generator")}
                style={[
                  tw`p-2 rounded-full ml-3`,
                  { backgroundColor: colors.background.card },
                ]}
              >
                <FontAwesome
                  name="chevron-left"
                  size={16}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            </View>

            {loadingTransactions ? (
              <View style={tw`flex-1 justify-center items-center`}>
                <ActivityIndicator size="large" color={colors.accent.sage} />
                <Text style={[tw`mt-4`, { color: colors.text.secondary }]}>
                  Loading Transactions...
                </Text>
              </View>
            ) : transactions.length === 0 ? (
              <View
                style={[
                  tw`p-4 rounded-lg`,
                  { backgroundColor: colors.background.card },
                  commonStyles.shadow.light,
                ]}
              >
                <Text
                  style={[tw`text-center`, { color: colors.text.secondary }]}
                >
                  No transaction history found
                </Text>
              </View>
            ) : (
              transactions.map((transaction, index) => (
                <View
                  key={index}
                  style={[
                    tw`p-4 rounded-lg mb-3`,
                    { backgroundColor: colors.background.card },
                    commonStyles.shadow.light,
                  ]}
                >
                  <View style={tw`flex-row justify-between items-center`}>
                    <View>
                      <Text
                        style={[
                          tw`text-base font-medium`,
                          { color: colors.text.primary },
                        ]}
                      >
                        {transaction.credits} Credits
                      </Text>
                      <Text
                        style={[tw`text-sm`, { color: colors.text.secondary }]}
                      >
                        ₹{transaction.amount}
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={[
                          tw`text-sm font-medium`,
                          {
                            color:
                              transaction.status === "success"
                                ? colors.status.success
                                : transaction.status === "pending"
                                ? colors.status.warning
                                : colors.status.error,
                          },
                        ]}
                      >
                        {transaction.status.charAt(0).toUpperCase() +
                          transaction.status.slice(1)}
                      </Text>
                      <Text style={[tw`text-xs`, { color: colors.text.muted }]}>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default UserDashboard; 