import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Clipboard,
} from "react-native";
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
  activeMode,
  setActiveTab,
}) => {
  const { userProfile, fetchUserProfile } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

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

  const getThemeColor = () => {
    if (!activeMode) return colors.accent.sage;
    
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
        return colors.accent.orange;
    }
  };

  const themeColor = getThemeColor();

  const handleCopy = async (item) => {
    const textToCopy = `${item.caption}\n\n${
      item.hashtags ? item.hashtags.map((tag) => `#${tag}`).join(" ") : ""
    }`;
    await Clipboard.setString(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
  };

  useEffect(() => {
    fetchTransactions();
  }, [user, supabase]);

  if (!user) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background.main }}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background.main}
        />
        <View style={tw`flex-1 justify-center items-center p-4`}>
          <Text
            style={[
              tw`text-xl mb-4 text-center`,
              { color: colors.text.secondary },
            ]}
          >
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
            <Text style={[tw`font-semibold`, { color: colors.text.light }]}>
              Sign In
            </Text>
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
                tw`flex-row items-center justify-between mb-4`,
                { backgroundColor: colors.background.main },
              ]}
            >
              <View style={tw`flex-1`}>
                <Text
                  style={[
                    tw`text-2xl font-semibold`,
                    { color: colors.text.primary },
                  ]}
                >
                  Generation History
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveTab("generator")}
                style={[
                  tw`p-2 rounded-xl ml-3`,
                  { backgroundColor: themeColor },
                  commonStyles.shadow.light,
                ]}
              >
                <FontAwesome name="arrow-left" size={16} color="white" />
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
                <Text
                  style={[
                    tw`text-lg font-semibold mb-1`,
                    { color: colors.text.primary },
                  ]}
                >
                  No History Yet
                </Text>
                <Text
                  style={[
                    tw`text-sm text-center`,
                    { color: colors.text.secondary },
                  ]}
                >
                  Your generated captions and hashtags will appear here
                </Text>
              </View>
            ) : (
              history.map((item) => (
                <View
                  key={item.id}
                  style={[
                    tw`p-3 rounded-lg mb-3`,
                    { backgroundColor: colors.background.card },
                    commonStyles.shadow.light,
                  ]}
                >
                  <View style={tw`flex-row justify-between items-start`}>
                    <View style={tw`flex-1 mr-2`}>
                      {/* <View style={tw`flex-row items-center mb-1`}>
                        <FontAwesome
                          name={item.mode === "mood" ? "magic" : item.mode === "niche" ? "hashtag" : "image"}
                          size={14}
                          color={colors.accent.sage}
                          style={tw`mr-1`}
                        />
                        <Text
                          style={[
                            tw`text-xs font-medium`,
                            { color: colors.accent.sage },
                          ]}
                        >
                          {item.mode.charAt(0).toUpperCase() + item.mode.slice(1)} Mode
                        </Text>
                      </View> */}
                      <Text
                        style={[
                          tw`text-base font-medium mb-1`,
                          { color: colors.text.primary },
                        ]}
                      >
                        {item.caption}
                      </Text>
                      {item.hashtags && (
                        <View style={tw`flex-row flex-wrap`}>
                          {item.hashtags.map((tag, index) => (
                            <View
                              key={index}
                              style={[
                                tw`px-1.5 py-0.5 rounded-full mr-1 mb-1`,
                                { backgroundColor: colors.accent.sage + "20" },
                              ]}
                            >
                              <Text
                                style={[
                                  tw`text-xs`,
                                  { color: colors.accent.sage },
                                ]}
                              >
                                #{tag}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      <View
                        style={tw`flex-row items-center justify-between mt-1`}
                      >
                        <Text
                          style={[
                            tw`text-xs flex-1`,
                            { color: colors.text.muted },
                          ]}
                        >
                          {new Date(item.created_at).toLocaleString()}
                        </Text>
                        <View style={tw`flex-row ml-2`}>
                          <TouchableOpacity
                            style={[
                              tw`w-6 h-6 items-center justify-center rounded-full mr-1`,
                              { backgroundColor: colors.accent.sage + "20" },
                            ]}
                            onPress={() => handleCopy(item)}
                          >
                            <FontAwesome
                              name={copiedId === item.id ? "check" : "copy"}
                              size={11}
                              color={colors.accent.sage}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              tw`w-6 h-6 items-center justify-center rounded-full`,
                              { backgroundColor: colors.status.error + "20" },
                            ]}
                            onPress={() => deleteHistoryItem(item.id)}
                          >
                            <FontAwesome
                              name="trash"
                              size={11}
                              color={colors.status.error}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
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
                tw`flex-row items-center justify-between mb-2`,
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
                  tw`p-2 rounded-xl ml-3`,
                  { backgroundColor: themeColor },
                  commonStyles.shadow.light,
                ]}
              >
                <FontAwesome name="arrow-left" size={16} color="white" />
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
                    tw`text-2xl font-semibold`,
                    { color: colors.text.primary },
                  ]}
                >
                  Transaction History
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveTab("generator")}
                style={[
                  tw`p-2 rounded-xl ml-3`,
                  { backgroundColor: themeColor },
                  commonStyles.shadow.light,
                ]}
              >
                <FontAwesome name="arrow-left" size={16} color="white" />
              </TouchableOpacity>
            </View>

            {loadingTransactions ? (
              <View style={tw`flex-1 justify-center items-center`}>
                <ActivityIndicator size="large" color={colors.accent.sage} />
                <Text
                  style={[tw`text-base mt-4`, { color: colors.text.secondary }]}
                >
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
                  style={[
                    tw`text-base text-center`,
                    { color: colors.text.secondary },
                  ]}
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
                        style={[
                          tw`text-base`,
                          { color: colors.text.secondary },
                        ]}
                      >
                        ₹{transaction.amount}
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={[
                          tw`text-base font-medium`,
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
                      <Text style={[tw`text-sm`, { color: colors.text.muted }]}>
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
