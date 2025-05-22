import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useUsageTracking = () => {
  const [anonymousUsageCount, setAnonymousUsageCount] = useState(0);
  const MAX_ANONYMOUS_GENERATIONS = 5;
  const RESET_INTERVAL_HOURS = 24;

  const loadAnonymousUsage = useCallback(async () => {
    try {
      const savedData = await AsyncStorage.getItem("anonymousUsageData");
      const currentTime = new Date().getTime();

      if (savedData) {
        const { count, timestamp } = JSON.parse(savedData);

        // Reset if beyond 24-hour window
        if (currentTime - timestamp > RESET_INTERVAL_HOURS * 60 * 60 * 1000) {
          await AsyncStorage.setItem(
            "anonymousUsageData",
            JSON.stringify({
              count: 0,
              timestamp: currentTime,
            })
          );
          return 0;
        }
        return count;
      }
      return 0;
    } catch (error) {
      console.error("Error loading anonymous usage:", error);
      return 0;
    }
  }, []);

  useEffect(() => {
    const initializeUsage = async () => {
      const count = await loadAnonymousUsage();
      setAnonymousUsageCount(count);
    };
    initializeUsage();
  }, [loadAnonymousUsage]);

  const incrementAnonymousUsage = useCallback(async () => {
    const currentTime = new Date().getTime();

    try {
      const newCount = anonymousUsageCount + 1;

      await AsyncStorage.setItem(
        "anonymousUsageData",
        JSON.stringify({
          count: newCount,
          timestamp: currentTime,
        })
      );

      setAnonymousUsageCount(newCount);
      return newCount;
    } catch (error) {
      console.error("Error saving anonymous usage:", error);
      return anonymousUsageCount;
    }
  }, [anonymousUsageCount]);

  return {
    anonymousUsageCount,
    incrementAnonymousUsage,
    MAX_ANONYMOUS_GENERATIONS,
  };
};
