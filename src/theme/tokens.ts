/**
 * dayQuest design tokens
 * Single source of truth for the pixel-art-inspired visual language.
 */

// ---------------------------------------------------------------------------
// Palette — raw colour values
// ---------------------------------------------------------------------------
export const palette = {
  // Backgrounds
  navy950: '#12121e',
  navy900: '#1a1a27',
  navy800: '#222236',
  navy700: '#292935',
  navy600: '#383854',

  // Accents
  green500: '#16a34a',
  green400: '#22c55e',
  green300: '#4ae176',
  green200: '#86efac',
  green100: '#dcfce7',

  // Text
  cream100: '#f8fafc',
  cream200: '#e3e0f2',
  cream300: '#bdc8d1',

  // Warnings / deadlines
  amber400: '#ffc703',
  amber300: '#ffdf94',
  red500: '#ef4444',
  red400: '#f87171',
  red300: '#ffb4ab',

  // Neutrals
  slate600: '#3e484f',
  slate500: '#4b5563',
  slate400: '#87929a',
  slate300: '#94a3b8',
  manaBlue: '#38bdf8',
  manaBlueLight: '#8ed5ff',

  // Pixel decorations
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ---------------------------------------------------------------------------
// Semantic colours
// ---------------------------------------------------------------------------
export const colors = {
  // Backgrounds
  bgPrimary: palette.navy950,
  bgSecondary: '#12121e',
  bgCard: palette.navy800,
  bgElevated: palette.navy700,
  bgHighlight: palette.navy600,

  // Text
  textPrimary: palette.cream100,
  textSecondary: palette.cream200,
  textMuted: palette.cream300,
  textDisabled: palette.slate400,

  // Accent
  accentPrimary: palette.manaBlue,
  accentSecondary: palette.manaBlueLight,
  accentFaint: '#00354a',

  // Status
  danger: palette.red500,
  dangerLight: palette.red400,
  warning: palette.amber400,
  warningLight: palette.amber300,
  success: palette.green500,

  // Borders
  borderDefault: palette.navy600,
  borderAccent: palette.green400,
  borderDanger: palette.red500,
  borderWarning: palette.amber400,

  // Tab bar
  tabBarBackground: '#1a1a27',
  tabBarActive: palette.manaBlue,
  tabBarInactive: palette.slate400,
  tabBarBorder: '#292935',
} as const;

// ---------------------------------------------------------------------------
// Spacing — 4-pt grid
// ---------------------------------------------------------------------------
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// ---------------------------------------------------------------------------
// Border radius — pixel-sharp by default, slight softening allowed
// ---------------------------------------------------------------------------
export const radii = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
} as const;

// ---------------------------------------------------------------------------
// Border widths
// ---------------------------------------------------------------------------
export const borders = {
  thin: 1,
  medium: 2,
  thick: 3,
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
export const typography = {
  // Font families (system fonts; custom pixel font added in future)
  fontMono: 'monospace' as const,
  fontSans: 'System' as const,

  // Font sizes
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 32,
  },

  // Font weights (RN uses string literals)
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
} as const;

// ---------------------------------------------------------------------------
// Icon sizes
// ---------------------------------------------------------------------------
export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ---------------------------------------------------------------------------
// Shadows — pixel-art style (offset instead of blur)
// ---------------------------------------------------------------------------
export const shadows = {
  // React Native shadow props
  sm: {
    shadowColor: palette.black,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 2,
  },
  md: {
    shadowColor: palette.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 4,
  },
  lg: {
    shadowColor: palette.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 6,
  },
} as const;

// ---------------------------------------------------------------------------
// Animation durations
// ---------------------------------------------------------------------------
export const durations = {
  fast: 120,
  normal: 200,
  slow: 350,
} as const;
