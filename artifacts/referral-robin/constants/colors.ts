/**
 * Semantic design tokens for Referral Robin.
 * The app is DARK mode by default, so both light and dark point to the same dark palette.
 */
const darkPalette = {
  background: '#0F1117',
  foreground: '#F2F2F5',
  card: '#1A1D26',
  cardForeground: '#F2F2F5',
  primary: '#E8472E',
  primaryForeground: '#FFFFFF',
  secondary: '#1E2130',
  secondaryForeground: '#C4C6D0',
  muted: '#262932',
  mutedForeground: '#7A7D8A',
  accent: '#FF6B50',
  accentForeground: '#FFFFFF',
  destructive: '#FF4040',
  destructiveForeground: '#FFFFFF',
  border: '#262932',
  input: '#1E2130',
  tint: '#E8472E',
  text: '#F2F2F5',
};

const colors = {
  light: darkPalette,
  dark: darkPalette,
  radius: 12,
};

export default colors;
