import { config } from '@tamagui/config/v3'
import { createTamagui } from 'tamagui'
import { colors } from './src/theme'

// Register central brand tokens (Blue & Green)
const customTokens = {
  ...config.tokens,
  color: {
    ...config.tokens.color,
    brandBlue: colors.brandBlueLight,
    brandBlueDark: colors.brandBlue,
    brandBlueMuted: colors.brandBlueMuted,
    brandGreen: colors.brandGreen,
    brandGreenDark: colors.brandGreenDark,
    brandGreenMuted: colors.brandGreenMuted,
    surfaceCard: colors.surfaceLight,
  },
}

const customThemes = {
  ...config.themes,
  light: {
    ...config.themes.light,
    background: colors.bgLight,
    color: colors.textPrimaryLight,
    borderColor: colors.borderLight,
    placeholderColor: colors.textMutedLight,
  },
  dark: {
    ...config.themes.dark,
    background: colors.bgDark,
    color: colors.textPrimaryDark,
    borderColor: colors.borderDark,
    placeholderColor: colors.textMutedDark,
  }
}

const myConfig = {
  ...config,
  tokens: customTokens,
  themes: customThemes,
}

export const tamaguiConfig = createTamagui(myConfig as any)

export type AppConfig = typeof myConfig

export default tamaguiConfig
