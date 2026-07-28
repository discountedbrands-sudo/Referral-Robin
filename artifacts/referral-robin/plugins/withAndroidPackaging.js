const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Excludes duplicate META-INF files that clash between
 * okhttp3 logging-interceptor and jspecify at merge time.
 */
module.exports = function withAndroidPackaging(config) {
  return withAppBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents;
    if (contents.includes('META-INF/versions/9/OSGI-INF/MANIFEST.MF')) {
      return mod; // already patched
    }
    mod.modResults.contents = contents.replace(
      /^android\s*\{/m,
      `android {
    packaging {
        resources {
            excludes += ['META-INF/versions/9/OSGI-INF/MANIFEST.MF']
        }
    }`
    );
    return mod;
  });
};
