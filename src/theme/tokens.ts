/**
 * dayQuest design tokens
 * Single source of truth for the pixel-art-inspired visual language.
 */

// ---------------------------------------------------------------------------
// Palette — raw colour values
// ---------------------------------------------------------------------------
export const palette = {
  // Backgrounds
  navy950: '#0a0e1a',
  navy900: '#0d1224',
  navy800: '#111827',
  navy700: '#1a2235',
  navy600: '#1e2d45',

  // Accents
  green500: '#3d9970',
  green400: '#4caf80',
  green300: '#6fcf97',
  green200: '#a8d8b8',
  green100: '#d4edde',

  // Text
  cream100: '#f5f0e8',
  cream200: '#e8e0d0',
  cream300: '#c8c0b0',

  // Warnings / deadlines
  amber400: '#e6a817',
  amber300: '#f0c040',
  red500: '#c0392b',
  red400: '#e74c3c',
  red300: '#f08070',

  // Neutrals
  slate600: '#2d3748',
  slate500: '#4a5568',
  slate400: '#718096',
  slate300: '#a0aec0',

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
  bgSecondary: palette.navy900,
  bgCard: palette.navy800,
  bgElevated: palette.navy700,
  bgHighlight: palette.navy600,

  // Text
  textPrimary: palette.cream100,
  textSecondary: palette.cream200,
  textMuted: palette.cream300,
  textDisabled: palette.slate400,

  // Accent
  accentPrimary: palette.green400,
  accentSecondary: palette.green300,
  accentFaint: palette.green100,

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
  tabBarBackground: palette.navy900,
  tabBarActive: palette.green400,
  tabBarInactive: palette.slate400,
  tabBarBorder: palette.navy700,
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
