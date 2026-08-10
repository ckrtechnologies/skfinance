/**
 * Central Theme & Design System — SK Finance Dealer App
 * 
 * Primary Brand Colors:
 * - Brand Blue: #1E3A8A (Dark Royal Blue) / #2563EB (Vibrant Blue)
 * - Brand Green: #15803D (Deep Emerald Green) / #16A34A (Vibrant Green)
 * 
 * ALL screens in the codebase MUST consume tokens from this file.
 */

export const colors = {
  // Brand Primary (Blue & Green)
  brandBlue: '#1E3A8A',
  brandBlueLight: '#2563EB',
  brandBlueDark: '#0A2540',
  brandBlueMuted: '#EFF6FF',
  
  brandGreen: '#16A34A',
  brandGreenDark: '#15803D',
  brandGreenMuted: '#F0FDF4',

  // Neutrals (Light Mode)
  bgLight: '#F8FAFC',
  surfaceLight: '#FFFFFF',
  borderLight: '#E2E8F0',
  textPrimaryLight: '#0F172A',
  textMutedLight: '#64748B',

  // Neutrals (Dark Mode)
  bgDark: '#0F172A',
  surfaceDark: '#1E293B',
  borderDark: '#334155',
  textPrimaryDark: '#F8FAFC',
  textMutedDark: '#94A3B8',

  // Status States
  success: '#16A34A',
  warning: '#D97706',
  warningMuted: '#FFFBEB',
  error: '#DC2626',
  errorMuted: '#FEF2F2',
};

export const themeTokens = {
  colors: {
    // Shared Brand Tokens
    brandBlue: colors.brandBlueLight,
    brandBlueDark: colors.brandBlue,
    brandBlueMuted: colors.brandBlueMuted,

    brandGreen: colors.brandGreen,
    brandGreenDark: colors.brandGreenDark,
    brandGreenMuted: colors.brandGreenMuted,

    // Component Mappings
    primaryAction: colors.brandGreen,
    primaryActionHover: colors.brandGreenDark,
    
    headerBg: colors.brandBlue,
    headerText: '#FFFFFF',

    badgePending: colors.warning,
    badgeApproved: colors.brandGreen,
    badgeRejected: colors.error,
  },

  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  radius: {
    sm: 6,
    md: 10,
    lg: 16,
    full: 9999,
  },
};

export default {
  colors,
  themeTokens,
};
