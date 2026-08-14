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

test('the splash screen renders the bundled logo and schedules a three-second login decision', async () => {
  const source = await readFile(new URL('../app/index.tsx', import.meta.url), 'utf8');

  assert.match(source, /require\("\.\.\/assets\/logo-removebg-preview\.png"\)/);
  assert.match(source, /setTimeout\(\(\) => \{/);
  assert.match(source, /\}, 3000\)/);
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

test('the login screen signs in then resolves its member destination', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');

  assert.match(source, /signInWithPhone\(normalizedPhone, password\)/);
  assert.match(source, /getSessionDestination\(\)/);
  assert.match(source, /router\.replace\("\/request-pending"\)/);
  assert.match(source, /router\.replace\("\/home"\)/);
});

test('the login screen exposes password recovery and account creation', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');

  assert.match(source, /Numéro de téléphone/);
  assert.match(source, /Mot de passe oublié/);
  assert.match(source, /href="\/password-reset"/);
  assert.match(source, /href="\/sign-up"/);
});

test('the login screen uses the compact sign-up dimensions', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');

  assert.match(source, /height: 86/);
  assert.match(source, /fontSize: 24/);
  assert.match(source, /fontSize: 13/);
  assert.match(source, /minHeight: 42/);
  assert.match(source, /minHeight: 44/);
});

test('the login screen keeps focused fields above the keyboard', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');

  assert.match(source, /KeyboardSafeScreen/);
  assert.match(source, /<KeyboardSafeScreen>/);
});

test('the biometric helper protects a stored session with device authentication', async () => {
  const source = await readFile(new URL('../src/lib/biometric-session.ts', import.meta.url), 'utf8');

  assert.match(source, /expo-local-authentication/);
  assert.match(source, /expo-secure-store/);
  assert.match(source, /requireAuthentication: true/);
  assert.match(source, /setSession/);
});

test('the login screen offers an enabled biometric unlock', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');

  assert.match(source, /Se connecter avec empreinte/);
  assert.match(source, /enableBiometricLogin/);
  assert.match(source, /unlockWithBiometrics/);
});

test('the splash screen attempts biometric unlock before showing login', async () => {
  const source = await readFile(new URL('../app/index.tsx', import.meta.url), 'utf8');

  assert.match(source, /unlockWithBiometrics/);
  assert.match(source, /getSessionDestination/);
});

test('the admin request page exposes approval and rejection actions', async () => {
  const source = await readFile(new URL('../app/(admin)/membership-requests.tsx', import.meta.url), 'utf8');

  assert.match(source, /Demandes d’adhésion/);
  assert.match(source, /Approuver/);
  assert.match(source, /Refuser/);
  assert.match(source, /decide-membership-request/);
  assert.match(source, /import \{ AdminHeader \} from "\.\.\/\.\.\/src\/components\/admin-chrome"/);
  assert.match(source, /<AdminHeader \/>/);
  assert.doesNotMatch(source, /<AdminNavigation/);
  assert.match(source, /paddingBottom: 104/);
});

test('the home screen exposes the admin request route only after checking the account role', async () => {
  const source = await readFile(new URL('../app/home.tsx', import.meta.url), 'utf8');
  assert.match(source, /getSessionDestination/);
  assert.match(source, /membership-requests/);
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

test('the pending-request screen uses the waiting illustration and returns to login', async () => {
  const source = await readFile(new URL('../app/(auth)/request-pending.tsx', import.meta.url), 'utf8');

  assert.match(source, /image_attente\.png/);
  assert.match(source, /fond_effetvague\.png/);
  assert.match(source, /Demande d’inscription reçue/);
  assert.match(source, /En attente de validation/);
  assert.match(source, /clock/);
  assert.match(source, /send/);
  assert.match(source, /href="\/login"/);
});

test('the OTP screen follows the approved maquette hierarchy', async () => {
  const source = await readFile(new URL('../app/(auth)/verify-phone.tsx', import.meta.url), 'utf8');

  assert.match(source, /fond_effetvague\.png/);
  assert.match(source, /logo-removebg-preview\.png/);
  assert.match(source, /phoneCard/);
  assert.match(source, /codeCells/);
  assert.match(source, /justifyContent: "space-evenly"/);
  assert.match(source, /minHeight: 52/);
  assert.match(source, /Vérification par SMS/);
});

test('the password reset screen sends an OTP and returns to login after reset', async () => {
  const source = await readFile(new URL('../app/(auth)/password-reset.tsx', import.meta.url), 'utf8');

  assert.match(source, /send-password-reset-otp/);
  assert.match(source, /reset-password-with-otp/);
  assert.match(source, /clearBiometricLogin/);
  assert.match(source, /router\.replace\("\/login"\)/);
});

test('the admin dashboard uses protected statistics and its supplied background', async () => {
  const source = await readFile(new URL('../app/(admin)/dashboard.tsx', import.meta.url), 'utf8');
  const chrome = await readFile(new URL('../src/components/admin-chrome.tsx', import.meta.url), 'utf8');
  assert.match(source, /getAdminDashboard/);
  assert.match(source, /Fond_ecranMobile\.png/);
  assert.match(source, /image_fleur\.png/);
  assert.match(source, /welcomeIllustration/);
  assert.match(source, /height:330,width:330,opacity:\.1/);
  assert.match(source, /tintColor:"#00A99D"/);
  assert.match(source, /styles\.hello,\{marginTop:8\}/);
  assert.match(source, /styles\.title,\{fontSize:28\}/);
  assert.match(source, /styles\.subtitle,\{marginTop:10,fontSize:14\}/);
  assert.match(source, /right:-90,top:-120,bottom:null,resizeMode:"cover",zIndex:0/);
  assert.match(source, /styles\.grid,\{zIndex:1\}/);
  assert.match(source, /styles\.content,\{paddingTop:104\}/);
  assert.match(chrome, /logo-removebg-preview\.png/);
  assert.match(source, /Graphique évolution des cotisations/);
  assert.match(source, /Dernières transactions/);
  assert.match(source, /membership-requests/);
  assert.match(source, /6 mois/);
  assert.match(source, /name="chevron-down"/);
  assert.match(source, /numberOfLines=\{1\}/);
  assert.match(source, /styles\.panelHead,\{minHeight:58,position:"relative"\}/);
  assert.match(source, /styles\.panelTitle,\{flex:1,marginRight:76\}/);
  assert.match(source, /styles\.period,\{[^}]*position:"absolute",right:0,top:0\}/);
  assert.match(source, /Animated\.Value\(0\)/);
  assert.match(source, /onScroll=\{handleScroll\}/);
  assert.match(source, /duration:\s*200/);
  assert.match(source, /toValue:\s*visible \? 0 : -120/);
});

test('the dashboard background scrolls with its content', async () => {
  const source = await readFile(new URL('../app/(admin)/dashboard.tsx', import.meta.url), 'utf8');
  assert.match(source, /Fond_ecranMobile\.png/);
  assert.match(source, /<ScrollView[^>]*><ImageBackground/);
  assert.match(source, /card:\s*\{[^}]*width:\s*"48%"/);
  assert.match(source, /"user-plus","Total droit d’adhésion"/);
  assert.match(source, /"shield","Total couverture ou dépense"/);
});

test('the admin dashboard composes shared animated chrome with literal section routes', async () => {
  const dashboard = await readFile(new URL('../app/(admin)/dashboard.tsx', import.meta.url), 'utf8');
  const chrome = await readFile(new URL('../src/components/admin-chrome.tsx', import.meta.url), 'utf8');

  assert.match(dashboard, /import \{ AdminHeader \} from "\.\.\/\.\.\/src\/components\/admin-chrome"/);
  assert.match(dashboard, /<AdminHeader translateY=\{headerTranslateY\} \/>/);
  assert.doesNotMatch(dashboard, /<AdminNavigation/);
  assert.match(chrome, /export type AdminSection = "dashboard" \| "members" \| "finances"/);
  assert.match(chrome, /translateY \? Animated\.View : View/);
  assert.match(chrome, /Alert\.alert\("Bientôt disponible", "Cette fonctionnalité arrive prochainement\."\)/);
  assert.match(chrome, /active === section \? "#00A99D" : "#65758A"/);
  assert.match(chrome, /router\.replace\("\/\(admin\)\/dashboard"\)/);
  assert.match(chrome, /router\.push\("\/\(admin\)\/members"\)/);
});

test('the admin layout owns persistent navigation and defers member creation to its child route', async () => {
  const source = await readFile(new URL('../app/(admin)/_layout.tsx', import.meta.url), 'utf8');

  assert.match(source, /import \{ Slot, usePathname \} from "expo-router"/);
  assert.match(source, /<Slot \/>/);
  assert.match(source, /<AdminNavigation active=\{activeSection\} \/>/);
  assert.match(source, /pathname\.endsWith\("\/members\/new"\)/);
  assert.match(source, /return <Slot \/>;/);
});

test('the member page provides administration, filters, and an entry point to account creation', async () => {
  const source = await readFile(new URL('../app/(admin)/members.tsx', import.meta.url), 'utf8');
  const newMember = await readFile(new URL('../app/(admin)/members/new.tsx', import.meta.url), 'utf8');
  const supabase = await readFile(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');

  assert.match(source, /import \{ AdminHeader \} from "\.\.\/\.\.\/src\/components\/admin-chrome"/);
  assert.match(source, /<ImageBackground/);
  assert.match(source, /Fond_ecranMobile\.png/);
  assert.match(source, /<ScrollView/);
  assert.match(source, /<AdminHeader \/>/);
  assert.doesNotMatch(source, /<AdminNavigation/);
  assert.match(source, /Rechercher un nom, t\u00e9l\u00e9phone/);
  assert.match(source, /Tous les statuts/);
  assert.match(source, /Toutes les cotisations/);
  assert.match(source, /Tous les r\u00f4les/);
  assert.match(source, /Ajouter un membre/);
  assert.match(source, /router\.push\("\/\(admin\)\/members\/new"\)/);
  assert.doesNotMatch(source, /<Modal visible=\{showForm\}/);
  assert.match(source, /getAdminMembers/);
  assert.match(source, /memberStatus/);
  assert.match(source, /Partiellement r\u00e9gl\u00e9e/);
  assert.match(source, /useRef\(0\)/, 'member requests have a sequence counter');
  assert.match(source, /requestId !== requestSequence\.current/, 'stale member responses are ignored');
  assert.match(source, /useEffect\(\(\) => \{ requestSequence\.current\+\+; setMembers\(\[\]\);/, 'filter changes invalidate in-flight member requests before debounce');
  assert.match(source, /useFocusEffect\(/);
  assert.match(source, /requestSequence\.current\+\+;[\s\S]*void loadMembers\(0\)/, 'focus refresh invalidates stale member requests before loading');
  assert.match(supabase, /offset\??:\s*number/);
  assert.match(supabase, /offset: filters\.offset \?\? 0/);
  assert.match(supabase, /limit: filters\.limit \?\? 50/);
  assert.match(source, /Voir plus/);
  assert.match(source, /label: "En attente"/);
  assert.match(source, /label: "Suspendu"/);
  assert.match(source, /label: "Supprimé"/);
  assert.match(source, /setTimeout\(\(\) => \{[^}]*loadMembers/, 'search is debounced before loading members');
  assert.match(newMember, /Ajouter un membre/);
  assert.match(newMember, /resetForm\(\);\s*router\.back\(\);/, 'successful creation returns to the pushed member list');
  assert.match(newMember, /createAdminMember/);
  assert.match(newMember, /Mot de passe initial/);
  assert.match(newMember, /Confirmation du mot de passe/);
  assert.match(newMember, /KeyboardSafeScreen/);
  assert.doesNotMatch(newMember, /AdminNavigation/);
  assert.doesNotMatch(newMember, /router\.replace\(/);
  assert.match(newMember, /getFunctionErrorMessage/);
  assert.match(newMember, /Ce numéro est déjà associé à un compte\./);
  assert.match(newMember, /accessibilityRole="button"/);
  assert.match(newMember, /accessibilityState=\{\{ selected: role === value \}\}/);
  assert.match(newMember, /accessibilityLiveRegion="polite"/);
  assert.match(supabase, /export type AdminMember/);
  assert.match(supabase, /export type AdminMembersPage/);
  assert.match(supabase, /"get-admin-members"/);
  assert.match(supabase, /"create-admin-member"/);
  assert.match(supabase, /export async function getFunctionErrorMessage/);
  assert.match(supabase, /response\.clone\(\)\.json\(\)/);
});

test('the member filters wrap into visible rows on narrow screens', async () => {
  const source = await readFile(new URL('../app/(admin)/members.tsx', import.meta.url), 'utf8');

  assert.match(source, /<View style=\{styles\.filterRow\}>/);
  assert.match(source, /filterRow:\s*\{[^}]*flexWrap:\s*"wrap"/);
  assert.doesNotMatch(source, /<ScrollView\s+horizontal[^>]*contentContainerStyle=\{styles\.filterRow\}/);
});

test('the login screen prefixes local Ivorian phone numbers before signing in', async () => {
  const source = await readFile(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');
  assert.match(source, /const normalizedPhone = phone\.startsWith\("\+225"\) \? phone : `\+225\$\{phone\}`/);
  assert.match(source, /signInWithPhone\(normalizedPhone, password\)/);
});

test('the member list exposes a typed detail client and opens the selected member', async () => {
  const source = await readFile(new URL('../app/(admin)/members.tsx', import.meta.url), 'utf8');
  const supabase = await readFile(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');

  assert.match(supabase, /export type ContributionDue/);
  assert.match(supabase, /export type AidDisbursement/);
  assert.match(supabase, /export type MemberChartPoint/);
  assert.match(supabase, /export type AdminMemberDetail/);
  assert.match(supabase, /export function getAdminMemberDetail\(memberId: string\)/);
  assert.match(supabase, /invokeRegistrationFunction<AdminMemberDetail>\("get-admin-member-detail", \{ memberId \}\)/);
  assert.match(source, /<Pressable[^>]*accessibilityRole="button"/);
  assert.match(source, /accessibilityLabel=\{`Voir \$\{member\.firstName\} \$\{member\.lastName\}`\}/);
  assert.match(source, /router\.push\(\{ pathname: "\/\(admin\)\/members\/\[memberId\]", params: \{ memberId: member\.id \} \}\)/);
});

test('the member detail route renders contributions, aid, and an accessible native chart', async () => {
  const source = await readFile(new URL('../app/(admin)/members/[memberId].tsx', import.meta.url), 'utf8');

  assert.match(source, /useLocalSearchParams/);
  assert.match(source, /getAdminMemberDetail/);
  assert.match(source, /router\.back\(\)/);
  assert.match(source, /ImageBackground/);
  assert.match(source, /ScrollView/);
  assert.match(source, /<AdminHeader \/>/);
  assert.doesNotMatch(source, /AdminNavigation/);
  assert.match(source, /Droit d’adhésion/);
  assert.match(source, /Calendrier des cotisations/);
  assert.match(source, /Cotisations exceptionnelles/);
  assert.match(source, /Aides reçues/);
  assert.match(source, /Total cotisé/);
  assert.match(source, /Mensualités à payer/);
  assert.match(source, /Exceptionnelles à payer/);
  assert.match(source, /Administrateur/);
  assert.match(source, /Supprimé/);
  assert.match(source, /Graphique payé et non payé : \$\{paid\} payés, \$\{unpaid\} impayés/);
  assert.match(source, /accessible=\{true\}/);
  assert.match(source, /useRef\(0\)/, 'detail requests use a sequence guard');
  assert.match(source, /requestId !== requestSequence\.current/, 'stale detail responses are ignored');
  assert.match(source, /return \(\) => \{ requestSequence\.current\+\+; \}/, 'unmount invalidates in-flight detail requests');
  assert.match(source, /Aucune cotisation enregistrée\./);
  assert.match(source, /Aucune aide reçue\./);
  assert.match(source, /Membre introuvable\./);
  assert.match(source, /paddingBottom: 108/);
});
