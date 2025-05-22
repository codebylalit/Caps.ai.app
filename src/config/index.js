import { Platform } from 'react-native';

export const API_CONFIG = {
  BASE_URL: process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  KEY: process.env.GEMINI_API_KEY,
};

export const SUPABASE_CONFIG = {
  URL: process.env.SUPABASE_URL,
  KEY: process.env.SUPABASE_KEY,
};

export const APP_THEME = {
  modes: {
    mood: {
      bg: "bg-orange-200",
      text: "text-orange-600",
      iconColor: "#FB923C",
      label: "Smart Captions",
      description: "Create engaging captions with AI"
    },
    niche: {
      bg: "bg-violet-200",
      text: "text-violet-600",
      iconColor: "#8B5CF6",
      label: "Hashtag Pro",
      description: "Trending hashtags for your niche"
    },
    image: {
      bg: "bg-green-200",
      text: "text-green-600",
      iconColor: "#34D399",
      label: "Image Analysis",
      description: "Get captions from your images"
    }
  },
  navigation: {
    tabs: [
      { id: "generator", icon: "magic", label: "Generator" },
      { id: "history", icon: "history", label: "History" },
      { id: "credits", icon: "money", label: "Credits" },
    ]
  }
};

export const CONSTANTS = {
  MAX_ANONYMOUS_GENERATIONS: 3,
  INITIAL_CREDITS: 5,
  STORAGE_KEYS: {
    ANONYMOUS_USAGE: '@anonymous_usage_count',
    USER_PREFERENCES: '@user_preferences',
  }
}; 