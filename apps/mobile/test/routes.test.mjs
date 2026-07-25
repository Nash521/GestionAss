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
    .replace('<Redirect href="/(auth)/login" />', 'React.createElement(Redirect, { href: "/(auth)/login" })')
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

test('the index component renders a redirect to the login route', async () => {
  const Index = await loadRoute('../app/index.tsx', 'Index');
  const element = Index();

  assert.equal(element.type, Redirect);
  assert.equal(element.props.href, '/(auth)/login');
  assert.equal(element.children.length, 0);
});

test('the root layout component renders a headerless stack', async () => {
  const RootLayout = await loadRoute('../app/_layout.tsx', 'RootLayout');
  const element = RootLayout();

  assert.equal(element.type, Stack);
  assert.equal(element.props.screenOptions.headerShown, false);
  assert.equal(element.children.length, 0);
});

test('the login component renders its placeholder UI', async () => {
  const Login = await loadRoute('../app/(auth)/login.tsx', 'Login');
  const element = Login();
  const [label] = element.children;

  assert.equal(element.type, View);
  assert.equal(label.type, Text);
  assert.equal(label.children[0], 'Login');
});
