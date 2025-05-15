import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { CONSTANTS } from '../config';

export const useCredits = (supabase, user) => {
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user]);

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (!data || data.credits === null) {
        await initializeCredits();
      } else {
        setCredits(data.credits);
      }
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', 'Failed to fetch credits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initializeCredits = async () => {
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: CONSTANTS.INITIAL_CREDITS })
        .eq("id", user.id);

      if (updateError) throw updateError;
      setCredits(CONSTANTS.INITIAL_CREDITS);
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', 'Failed to initialize credits.');
    }
  };

  const deductCredit = async () => {
    try {
      if (credits <= 0) {
        throw new Error('Insufficient credits');
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ credits: credits - 1 })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      setCredits(data.credits);
      return true;
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', err.message);
      return false;
    }
  };

  const addCredits = async (amount) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ credits: credits + amount })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      setCredits(data.credits);
      return true;
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', 'Failed to add credits.');
      return false;
    }
  };

  return {
    credits,
    loading,
    error,
    deductCredit,
    addCredits,
    refreshCredits: fetchCredits
  };
}; 