const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../apps/mobile/dist');
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
const all = files(root);
const dependencies = all.filter((p) => p.split(path.sep).some((part) => part === 'node_modules' || part === '.pnpm') && !p.endsWith('.map'));
const bundles = all.filter((p) => p.endsWith('.js'));
const destination = path.join(root, 'assets', 'dependencies');
fs.mkdirSync(destination, { recursive: true });
let changed = 0;
for (const file of dependencies) {
  const name = path.basename(file);
  const target = path.join(destination, name);
  if (fs.existsSync(target) && !fs.readFileSync(target).equals(fs.readFileSync(file))) throw new Error('Deux ressources portent le même nom : ' + name);
  fs.copyFileSync(file, target);
  const original = '/' + path.relative(root, file).split(path.sep).join('/');
  const replacement = '/assets/dependencies/' + name;
  for (const bundle of bundles) {
    const content = fs.readFileSync(bundle, 'utf8');
    if (content.includes(original)) { fs.writeFileSync(bundle, content.split(original).join(replacement)); changed++; }
  }
}
console.log(`${dependencies.length} ressources copiées ; ${changed} références corrigées.`);
const crypto = require('node:crypto');
const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
for (const bundle of bundles) {
  const originalUrl = '/' + path.relative(root, bundle).split(path.sep).join('/');
  if (!html.includes(originalUrl)) continue;
  const hash = crypto.createHash('sha256').update(fs.readFileSync(bundle)).digest('hex').slice(0, 12);
  const newName = path.basename(bundle, '.js') + '-netlify-' + hash + '.js';
  const newPath = path.join(path.dirname(bundle), newName);
  fs.copyFileSync(bundle, newPath);
  const newUrl = '/' + path.relative(root, newPath).split(path.sep).join('/');
  html = html.split(originalUrl).join(newUrl);
}
fs.writeFileSync(htmlPath, html);
