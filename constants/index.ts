import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Brand / Palette
// ---------------------------------------------------------------------------
export const Palette = {
  primary: '#0a7ea4',
  primaryDark: '#085f7a',
  white: '#fff',
  black: '#11181C',
  // Greys
  grey100: '#F9FAFB',
  grey200: '#F3F4F6',
  grey300: '#E5E7EB',
  grey400: '#D1D5DB',
  grey500: '#9BA1A6',
  grey600: '#687076',
  grey700: '#808080',
  // Semantic
  danger: '#EF4444',
  warning: '#FEF3C7',
  warningBorder: '#FDE68A',
  warningText: '#92400E',
  // Group avatar
  purple: '#7C3AED',
  // Call screen background
  callBackground: '#1a1a2e',
} as const;

// ---------------------------------------------------------------------------
// Theme colors (light / dark mode)
// ---------------------------------------------------------------------------
export const Colors = {
  light: {
    text: Palette.black,
    background: Palette.white,
    tint: Palette.primary,
    icon: Palette.grey600,
    tabIconDefault: Palette.grey600,
    tabIconSelected: Palette.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: Palette.white,
    icon: Palette.grey500,
    tabIconDefault: Palette.grey500,
    tabIconSelected: Palette.white,
  },
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 16,
  xl: 18,
  xxl: 22,
  title: 28,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// ---------------------------------------------------------------------------
// Spacing / Layout
// ---------------------------------------------------------------------------
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  round: 24,
  pill: 9999,
} as const;

// ---------------------------------------------------------------------------
// Chat / FlatList performance
// ---------------------------------------------------------------------------
export const Chat = {
  messageItemHeight: 64,
  conversationItemHeight: 72,
  keyboardVerticalOffset: 90,
  maxToRenderPerBatch: 20,
  windowSize: 10,
  initialNumToRender: 15,
} as const;

// ---------------------------------------------------------------------------
// Database / Query
// ---------------------------------------------------------------------------
export const Query = {
  messageLimit: 100,
  userSearchLimit: 20,
} as const;
