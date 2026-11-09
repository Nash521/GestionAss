const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// The presentation APK may contact only its configured private-network demo server over HTTP.
module.exports = function withPresentationNetwork(config) {
  if (process.env.APP_VARIANT !== 'presentation') return config;
  const url = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL || '');
  const parts = url.hostname.split('.').map(Number);
  const isPrivate = parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
    && (parts[0] === 10 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31));
  if (url.protocol !== 'http:' || !isPrivate) throw new Error('Presentation Supabase URL must be a private IPv4 HTTP address.');
  config = withAndroidManifest(config, (mod) => {
    mod.modResults.manifest.application[0].$['android:networkSecurityConfig'] = '@xml/presentation_network_security_config';
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const dir = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    await fs.promises.mkdir(dir, { recursive: true });
    const xml = `<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n  <base-config cleartextTrafficPermitted="false" />\n  <domain-config cleartextTrafficPermitted="true">\n    <domain includeSubdomains="false">${url.hostname}</domain>\n  </domain-config>\n</network-security-config>\n`;
    await fs.promises.writeFile(path.join(dir, 'presentation_network_security_config.xml'), xml);
    return mod;
  }]);
};
