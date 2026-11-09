const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const project = resolve(__dirname, '../apps/mobile');
const raw = process.env.EXPO_PUBLIC_SUPABASE_URL;
let url;
try { url = new URL(raw); } catch { throw new Error('EXPO_PUBLIC_SUPABASE_URL doit désigner le projet Supabase de démonstration en ligne.'); }
if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Configurez une URL HTTPS Supabase hébergée et la clé publique EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}
const result = spawnSync(process.execPath, [resolve(project, 'node_modules/expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', 'dist'], { cwd: project, stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
require('./fix-netlify-assets.cjs');
