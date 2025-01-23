// ... (previous imports remain the same)

const GeneratorScreen = ({ activeMode, setActiveMode }) => {
  // ... (previous state declarations remain the same)

  // Add deleteHistoryItem function
  const deleteHistoryItem = async (id) => {
    try {
      const { error } = await supabase
        .from("caption_history")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Refresh history after deletion
      fetchHistory();
      Alert.alert("Success", "History item deleted successfully");
    } catch (error) {
      console.error("Error deleting history item:", error);
      Alert.alert("Error", "Failed to delete history item");
    }
  };

  // Update the renderHistoryContent function to include delete functionality
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
                          {
                            text: "Cancel",
                            style: "cancel",
                          },
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

  // ... (rest of the component remains the same)
};

export default GeneratorScreen;
