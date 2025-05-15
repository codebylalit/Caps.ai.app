import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONSTANTS } from '../config';

export const useAnonymousUsage = () => {
  const [anonymousUsageCount, setAnonymousUsageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUsageCount();
  }, []);

  const loadUsageCount = async () => {
    try {
      setLoading(true);
      const count = await AsyncStorage.getItem(CONSTANTS.STORAGE_KEYS.ANONYMOUS_USAGE);
      setAnonymousUsageCount(count ? parseInt(count, 10) : 0);
    } catch (err) {
      setError('Failed to load usage count');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const incrementAnonymousUsage = async () => {
    try {
      const newCount = anonymousUsageCount + 1;
      await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.ANONYMOUS_USAGE, newCount.toString());
      setAnonymousUsageCount(newCount);
      return true;
    } catch (err) {
      setError('Failed to update usage count');
      console.error(err);
      return false;
    }
  };

  const resetUsageCount = async () => {
    try {
      await AsyncStorage.setItem(CONSTANTS.STORAGE_KEYS.ANONYMOUS_USAGE, '0');
      setAnonymousUsageCount(0);
      return true;
    } catch (err) {
      setError('Failed to reset usage count');
      console.error(err);
      return false;
    }
  };

  const canUseAnonymously = () => {
    return anonymousUsageCount < CONSTANTS.MAX_ANONYMOUS_GENERATIONS;
  };

  return {
    anonymousUsageCount,
    loading,
    error,
    incrementAnonymousUsage,
    resetUsageCount,
    canUseAnonymously,
    remainingGenerations: CONSTANTS.MAX_ANONYMOUS_GENERATIONS - anonymousUsageCount
  };
}; 