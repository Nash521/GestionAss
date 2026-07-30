import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const React = {
  createElement(type, props, ...children) {
    return { type, props: props ?? {}, children };
  },
};

const Stack = Symbol('Stack');
const Redirect = Symbol('Redirect');
const View = Symbol('View');
const Text = Symbol('Text');

async function loadRoute(path, componentName) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const executable = source
    .replace("import { Stack } from 'expo-router';", "const { Stack } = dependencies['expo-router'];")
    .replace("import { Redirect } from 'expo-router';", "const { Redirect } = dependencies['expo-router'];")
    .replace("import { Text, View } from 'react-native';", "const { Text, View } = dependencies['react-native'];")
    .replace(`export default function ${componentName}`, `function ${componentName}`)
    .replace('<Redirect href="/login" />', 'React.createElement(Redirect, { href: "/login" })')
    .replace('<Stack screenOptions={{ headerShown: false }} />', 'React.createElement(Stack, { screenOptions: { headerShown: false } })')
    .replace(
      /<View>\s*<Text>Login<\/Text>\s*<\/View>/,
      "React.createElement(View, null, React.createElement(Text, null, 'Login'))",
    )
    .concat(`\nmodule.exports.default = ${componentName};`);
  const module = { exports: {} };

  vm.runInNewContext(executable, {
    React,
    dependencies: {
      'expo-router': { Redirect, Stack },
      'react-native': { Text, View },
    },
    module,
  });

  return module.exports.default;
}

test('the splash screen renders the bundled logo and schedules a three-second login replacement', async () => {
  const source = await readFile(new URL('../app/index.tsx', import.meta.url), 'utf8');

  assert.match(source, /require\("\.\.\/assets\/logo-removebg-preview\.png"\)/);
  assert.match(source, /setTimeout\(\(\) => \{\s*router\.replace\("\/login"\);\s*\}, 3000\)/s);
  assert.match(source, /clearTimeout\(timeout\)/);
});

test('the root layout component renders a headerless stack', async () => {
  const RootLayout = await loadRoute('../app/_layout.tsx', 'RootLayout');
  const element = RootLayout();

  assert.equal(element.type, Stack);
  assert.equal(element.props.screenOptions.headerShown, false);
  assert.equal(element.children.length, 0);
});

test('the login screen identifies the GestionAss application', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');

  assert.match(source, /GestionAss/);
});

test('the login screen exposes an entry point to account registration', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');

  assert.match(source, /href="\/sign-up"/);
  assert.match(source, /Cr\u00e9er un compte/);
});

test('the sign-up screen uses local wave artwork and requires matching passwords', async () => {
  const source = await readFile(new URL('../app/(auth)/sign-up.tsx', import.meta.url), 'utf8');

  assert.match(source, /effet_haut_page\.png/);
  assert.match(source, /effet_bas_page\.png/);
  assert.match(source, /Confirmer le mot de passe/);
  assert.match(source, /password !== passwordConfirmation/);
  assert.match(source, /router\.push\("\/\(auth\)\/verify-phone"\)/);
});
