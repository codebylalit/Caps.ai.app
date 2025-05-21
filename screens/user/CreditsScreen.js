import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator, StatusBar } from 'react-native';
import { supabase } from '../config/supabase'; // Adjust the path based on your project structure
import PaymentManager from './PaymentScreen';
import { colors, commonStyles } from '../../theme/colors';

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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.main }}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background.main} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent.sage} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.main }}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background.main} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text.primary, marginBottom: 8, textAlign: 'center' }}>
            Sign In Required
          </Text>
          <Text style={{ fontSize: 16, color: colors.text.secondary, textAlign: 'center' }}>
            Please log in to manage your credits and unlock premium features
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.main }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.main} />
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