// Main color palette
export const colors = {
  // Primary colors
  primary: {
    main: '#2C3E50',    // Dark blue-gray for main text and icons
    light: '#34495E',   // Lighter blue-gray for secondary text
    dark: '#1A252F',    // Darker blue-gray for emphasis
  },
  
  // Background colors
  background: {
    main: '#FCFBF1',    // Off-white main background
    card: '#FFFFFF',    // White for cards
    modal: '#1E293B',   // Dark for modals
  },
  
  // Accent colors
  accent: {
    sage: '#788D7C',    // Sage green
    beige: '#C7A59D',   // Beige
    orange: '#BC705B',  // Orange
    olive: '#88A07A',   // Olive green
    deepGreen: '#3B5C3A', // Deep green
  },
  
  // Text colors
  text: {
    primary: '#2C3E50',   // Main text color
    secondary: '#34495E', // Secondary text color
    light: '#FFFFFF',     // Light text (on dark backgrounds)
    muted: '#94A3B8',     // Muted text
  },
  
  // Status colors
  status: {
    success: '#34D399',   // Green
    warning: '#FBBF24',   // Yellow
    error: '#EF4444',     // Red
    info: '#60A5FA',      // Blue
  },
  
  // Border colors
  border: {
    light: '#E2E8F0',    // Light border
    dark: '#CBD5E1',     // Dark border
  },
  
  // Shadow colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.2)',
  }
};

// Theme configuration for different modes
export const themeModes = {
  mood: {
    bg: colors.accent.orange,
    text: colors.text.light,
    iconColor: colors.accent.orange,
  },
  niche: {
    bg: colors.accent.sage,
    text: colors.text.light,
    iconColor: colors.accent.sage,
  },
  image: {
    bg: colors.accent.olive,
    text: colors.text.light,
    iconColor: colors.accent.olive,
  },
};

// Common styles
export const commonStyles = {
  shadow: {
    light: {
      shadowColor: colors.shadow.light,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: colors.shadow.dark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
  borderRadius: {
    small: 8,
    medium: 16,
    large: 24,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
}; 