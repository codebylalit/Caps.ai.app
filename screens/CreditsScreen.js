import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, ActivityIndicator } from 'react-native';
import { supabase } from '../config/supabase'; // Adjust the path based on your project structure
import PaymentManager from './payment';
import tw from 'twrnc';

const CreditsScreen = () => {
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    fetchUserCredits();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error.message);
    }
  };

  const fetchUserCredits = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setCredits(data.credits || 0);
    } catch (error) {
      console.error('Error fetching credits:', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={tw`flex-1 justify-center items-center p-4`}>
        <Text style={tw`text-lg text-center text-gray-600`}>
          Please log in to manage your credits
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <PaymentManager
        user={user}
        supabase={supabase}
        credits={credits}
        fetchUserCredits={fetchUserCredits}
      />
    </SafeAreaView>
  );
};

export default CreditsScreen; 