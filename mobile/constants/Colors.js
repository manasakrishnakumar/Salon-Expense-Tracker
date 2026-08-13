// Premium Purple & Pink Theme Color Palette

const commonIds = {
  // Primary - Vibrant Purple
  primary: '#A855F7',
  primaryDark: '#7C3AED',
  primaryLight: '#C084FC',

  // Secondary - Hot Pink
  secondary: '#EC4899',
  secondaryDark: '#DB2777',
  secondaryLight: '#F472B6',

  // Accent - Magenta Glow
  accent: '#FF006E',
  accentLight: '#FF4D94',

  // Tertiary - Electric Blue-Purple
  tertiary: '#6366F1',
  tertiaryLight: '#818CF8',

  // Status colors
  success: '#10B981',
  successLight: '#34D399',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  danger: '#EF4444',
  dangerLight: '#FCA5A5',
  info: '#3B82F6',

  // Category colors - Shared
  categories: {
    products: '#A855F7',
    equipment: '#EC4899',
    utilities: '#10B981',
    rent: '#F59E0B',
    salaries: '#F472B6',
    marketing: '#6366F1',
    other: '#8B5CF6',
  },

  // Service category colors - Shared
  serviceCategories: {
    facials: '#FF006E',
    cleanups: '#A855F7',
    pedicure_manicure: '#EC4899',
    hair_services: '#F472B6',
    other: '#8B5CF6',
  },

  chartColors: [
    '#A855F7', '#EC4899', '#FF006E', '#F472B6', '#8B5CF6',
    '#C084FC', '#DB2777', '#7C3AED', '#6366F1', '#D946EF',
  ],
};

export default {
  // Dark Theme (Default)
  dark: {
    ...commonIds,
    background: '#0D0014',
    cardBackground: '#1A0A24',
    cardBackgroundLight: '#2D1540',

    gradientStart: '#2D0A4E',
    gradientEnd: '#1A0A2E',

    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.4)',

    border: 'rgba(168, 85, 247, 0.2)',
    borderGlow: 'rgba(168, 85, 247, 0.5)',
    overlay: 'rgba(0, 0, 0, 0.8)',

    glass: 'rgba(168, 85, 247, 0.08)',
    glassLight: 'rgba(236, 72, 153, 0.1)',

    // Gradients
    heroGradient: ['#A855F7', '#7C3AED'],
    pinkGradient: ['#EC4899', '#DB2777'],
    purplePinkGradient: ['#8B5CF6', '#EC4899'],
    tabGradient: ['#1A0A24', '#0D0014'],

    analysis: {
      gridLine: 'rgba(168, 85, 247, 0.15)',
      axisLabel: 'rgba(255, 255, 255, 0.5)',
    }
  },

  // Light Theme
  light: {
    ...commonIds,
    background: '#FDF7FF', // Very light pink/purple tint
    cardBackground: '#FFFFFF',
    cardBackgroundLight: '#F8F0FF',

    gradientStart: '#E9D5FF', // Light purple
    gradientEnd: '#FCE7F3', // Light pink

    text: '#2D0A4E', // Dark purple text for readability
    textSecondary: 'rgba(45, 10, 78, 0.7)',
    textMuted: 'rgba(45, 10, 78, 0.5)',

    border: 'rgba(168, 85, 247, 0.2)',
    borderGlow: 'rgba(168, 85, 247, 0.3)',
    overlay: 'rgba(255, 255, 255, 0.9)',

    glass: 'rgba(168, 85, 247, 0.05)',
    glassLight: 'rgba(236, 72, 153, 0.05)',

    // Gradients - slightly lighter/softer or same to keep pop
    heroGradient: ['#C084FC', '#A855F7'],
    pinkGradient: ['#F472B6', '#EC4899'],
    purplePinkGradient: ['#A78BFA', '#F472B6'],
    tabGradient: ['#FFFFFF', '#F3E8FF'],

    analysis: {
      gridLine: 'rgba(168, 85, 247, 0.1)',
      axisLabel: 'rgba(45, 10, 78, 0.5)',
    }
  }
};
