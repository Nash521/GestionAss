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

test('the sign-up screen requires matching passwords before the OTP navigation', async () => {
  const source = await readFile(new URL('../app/(auth)/sign-up.tsx', import.meta.url), 'utf8');

  assert.match(source, /Confirmer le mot de passe/);
  assert.match(source, /password !== passwordConfirmation/);
  assert.match(source, /router\.push\("\/\(auth\)\/verify-phone"\)/);
});

test('the sign-up screen uses the unified background without scrolling and compact inputs', async () => {
  const source = await readFile(new URL('../app/(auth)/sign-up.tsx', import.meta.url), 'utf8');

  assert.match(source, /fond_effetvague\.png/);
  assert.doesNotMatch(source, /ScrollView/);
  assert.doesNotMatch(source, /effet_haut_page\.png/);
  assert.doesNotMatch(source, /effet_bas_page\.png/);
  assert.match(source, /minHeight: 42/);
  assert.match(source, /router\.push\("\/\(auth\)\/verify-phone"\)/);
});

test('the sign-up screen exposes Feather icons, password criteria and the temporary login route', async () => {
  const source = await readFile(new URL('../app/(auth)/sign-up.tsx', import.meta.url), 'utf8');

  assert.match(source, /@expo\/vector-icons/);
  assert.match(source, /showPassword/);
  assert.match(source, /showPasswordConfirmation/);
  assert.match(source, /Une majuscule/);
  assert.match(source, /Un chiffre/);
  assert.match(source, /Un caractère spécial/);
  assert.match(source, /router\.replace\("\/login"\)/);
});

test('the left password-indicator column is centered without wrapping the grid', async () => {
  const source = await readFile(new URL('../app/(auth)/sign-up.tsx', import.meta.url), 'utf8');

  assert.match(source, /index % 2 === 0 && styles\.requirementLeft/);
  assert.match(source, /requirementLeft: \{ width: "42%", marginLeft: "8%" \}/);
});

test('the sign-up screen uses the keyboard-safe container and Android resizes for the keyboard', async () => {
  const signUp = await readFile(new URL('../app/(auth)/sign-up.tsx', import.meta.url), 'utf8');
  const container = await readFile(new URL('../src/components/keyboard-safe-screen.tsx', import.meta.url), 'utf8');
  const config = await readFile(new URL('../app.json', import.meta.url), 'utf8');

  assert.match(signUp, /KeyboardSafeScreen/);
  assert.match(container, /KeyboardAvoidingView/);
  assert.match(container, /ScrollView/);
  assert.match(config, /"softwareKeyboardLayoutMode": "resize"/);
});

test('the keyboard-safe container automatically follows focused Android inputs', async () => {
  const container = await readFile(new URL('../src/components/keyboard-safe-screen.tsx', import.meta.url), 'utf8');

  assert.match(container, /react-native-keyboard-aware-scroll-view/);
  assert.match(container, /KeyboardAwareScrollView/);
  assert.match(container, /enableOnAndroid/);
});

test('the OTP screen renders six code cells, keyboard support and a guarded resend flow', async () => {
  const source = await readFile(new URL('../app/(auth)/verify-phone.tsx', import.meta.url), 'utf8');

  assert.match(source, /KeyboardSafeScreen/);
  assert.match(source, /Array\.from\(\{ length: 6 \}\)/);
  assert.match(source, /maxLength=\{6\}/);
  assert.match(source, /send-registration-otp/);
  assert.match(source, /verify-registration-otp/);
  assert.match(source, /create-membership-request/);
  assert.match(source, /RESEND_DELAY_SECONDS = 45/);
  assert.match(source, /router\.replace\("\/\(auth\)\/sign-up"\)/);
});
