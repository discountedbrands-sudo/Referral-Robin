const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Wraps expo/metro-config's getDefaultConfig with Sentry's debug-ID
// injection, so stack traces can be de-minified later if source maps are
// ever uploaded (not yet wired — no Sentry auth token configured).
module.exports = getSentryExpoConfig(__dirname);
