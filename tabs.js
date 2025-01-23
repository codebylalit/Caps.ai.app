import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import tw from "twrnc";

const TabNavigation = () => {
  const [activeTab, setActiveTab] = React.useState("history");

  const HistoryTab = () => (
    <ScrollView style={tw`flex-1 px-4`}>
      {[1, 2, 3].map((item) => (
        <View key={item} style={tw`bg-white p-4 rounded-2xl mb-4 shadow-sm`}>
          <Text style={tw`text-sm text-slate-500 mb-2`}>
            {new Date(
              Date.now() - item * 24 * 60 * 60 * 1000
            ).toLocaleDateString()}
          </Text>
          <Text style={tw`text-base text-slate-800 mb-3`}>
            Enjoying every moment of this beautiful journey! ✨ Making memories
            that will last a lifetime.
          </Text>
          <View style={tw`flex-row flex-wrap gap-2`}>
            <Text style={tw`text-orange-600 text-sm`}>#journey</Text>
            <Text style={tw`text-orange-600 text-sm`}>#memories</Text>
            <Text style={tw`text-orange-600 text-sm`}>#lifestyle</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const ProfileTab = () => (
    <ScrollView style={tw`flex-1 px-4`}>
      <View style={tw`items-center mt-6 mb-8`}>
        <View style={tw`bg-orange-100 rounded-full p-1 mb-4`}>
          <Image
            source={{ uri: "/api/placeholder/100/100" }}
            style={tw`w-24 h-24 rounded-full`}
          />
        </View>
        <Text style={tw`text-xl font-semibold text-slate-800 mb-1`}>
          John Doe
        </Text>
        <Text style={tw`text-base text-slate-500`}>@johndoe</Text>
      </View>

      <View style={tw`bg-white rounded-2xl p-5 shadow-sm mb-4`}>
        <View style={tw`flex-row items-center mb-6`}>
          <FontAwesome name="gear" size={20} color="#FB923C" style={tw`mr-3`} />
          <Text style={tw`text-lg font-medium text-slate-800`}>Settings</Text>
        </View>

        {[
          { icon: "user", label: "Edit Profile" },
          { icon: "bell", label: "Notifications" },
          { icon: "lock", label: "Privacy" },
          { icon: "question-circle", label: "Help & Support" },
          { icon: "sign-out", label: "Logout" },
        ].map((item, index) => (
          <TouchableOpacity
            key={index}
            style={tw`flex-row items-center py-4 border-t border-slate-100`}
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

  return (
    <View style={tw`flex-1`}>
      <View style={tw`flex-row border-b border-slate-200 mb-4`}>
        {["history", "profile"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={tw`flex-1 py-4 px-6`}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={tw`text-center text-base font-medium 
                ${activeTab === tab ? "text-orange-500" : "text-slate-400"}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && (
              <View
                style={tw`absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500`}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "history" ? <HistoryTab /> : <ProfileTab />}
    </View>
  );
};

export default TabNavigation;
