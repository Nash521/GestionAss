import { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardSafeScreen } from "../../src/components/keyboard-safe-screen";
import { canEnableBiometricLogin, enableBiometricLogin, isBiometricLoginEnabled, unlockWithBiometrics } from "../../src/lib/biometric-session";
import { getSessionDestination, signInWithPhone } from "../../src/lib/supabase";

const background = require("../../assets/fond_effetvague.png");
const logo = require("../../assets/logo-removebg-preview.png");
const phonePattern = /^\+2250[157]\d{8}$/;

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => { void isBiometricLoginEnabled().then(setBiometricEnabled); }, []);

  const routeDestination = async () => {
    const { destination } = await getSessionDestination();
    if (destination === "pending") return router.replace("/request-pending");
    if (destination === "active") return router.replace("/home");
    setError("Votre compte n’est pas disponible.");
  };

  const submit = async () => {
    const normalizedPhone = phone.startsWith("+225") ? phone : `+225${phone}`;
    if (!phonePattern.test(normalizedPhone) || !password) {
      setError("Veuillez renseigner votre numéro et votre mot de passe.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await signInWithPhone(normalizedPhone, password);
      if (await canEnableBiometricLogin() && !biometricEnabled) Alert.alert("Activer l’empreinte ?", "Utilisez votre empreinte lors de votre prochaine connexion.", [{ text: "Plus tard", style: "cancel" }, { text: "Activer", onPress: () => { void (async () => { try { await enableBiometricLogin(session); setBiometricEnabled(true); } catch { setError("Authentification biométrique indisponible. Connectez-vous avec votre mot de passe."); } })(); } }]);
      await routeDestination();
    } catch {
      setError("Numéro ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const unlock = async () => {
    setLoading(true); setError(null);
    try {
      if (await unlockWithBiometrics()) await routeDestination();
      else setError("Authentification biométrique indisponible ou session expirée. Connectez-vous avec votre mot de passe.");
    } catch {
      setError("Authentification biométrique indisponible. Connectez-vous avec votre mot de passe.");
    }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.page}>
      <Image source={background} style={styles.background} accessible={false} />
      <KeyboardSafeScreen>
      <View style={styles.content}>
        <Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
        <Text style={styles.title}>Bienvenue</Text>
        <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>

        <View style={styles.field}>
          <Feather name="phone" size={18} color="#00A99D" />
          <Text style={styles.prefix}>+225</Text>
          <TextInput style={styles.input} placeholder="Numéro de téléphone" placeholderTextColor="#788798" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
        </View>
        <View style={styles.field}>
          <Feather name="lock" size={18} color="#00A99D" />
          <TextInput style={styles.input} placeholder="Mot de passe" placeholderTextColor="#788798" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
          <Pressable onPress={() => setShowPassword((visible) => !visible)} accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
            <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#788798" />
          </Pressable>
        </View>
        <Link href="/password-reset" style={styles.resetLink}>Mot de passe oublié ?</Link>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={[styles.submitButton, loading && styles.disabled]} onPress={submit} disabled={loading} accessibilityRole="button">
          <Text style={styles.submitLabel}>{loading ? "Connexion…" : "Se connecter"}</Text>
        </Pressable>
        {biometricEnabled ? <Pressable style={styles.biometricButton} onPress={unlock} disabled={loading} accessibilityRole="button"><Feather name="unlock" size={18} color="#00A99D" /><Text style={styles.biometricLabel}>Se connecter avec empreinte</Text></Pressable> : null}
        <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>ou</Text><View style={styles.line} /></View>
        <Link href="/sign-up" asChild>
          <Pressable style={styles.createButton} accessibilityRole="button"><Feather name="user-plus" size={18} color="#00A99D" /><Text style={styles.createLabel}>Créer un compte</Text></Pressable>
        </Link>
        <View style={styles.security}><Feather name="shield" size={16} color="#00A99D" /><Text style={styles.securityText}>Vos données sont sécurisées et protégées.</Text></View>
      </View>
      </KeyboardSafeScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" }, background: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, height: "100%", resizeMode: "cover", width: "100%" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 22, paddingVertical: 18 }, logo: { alignSelf: "center", height: 86, marginBottom: 4, resizeMode: "contain", width: 86 },
  title: { color: "#102B3D", fontSize: 24, fontWeight: "700", textAlign: "center" }, subtitle: { color: "#748397", fontSize: 13, marginBottom: 9, marginTop: 2, textAlign: "center" },
  field: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 13, elevation: 2, flexDirection: "row", marginBottom: 6, minHeight: 42, paddingHorizontal: 13, shadowColor: "#6D8792", shadowOpacity: 0.09, shadowRadius: 8 },
  prefix: { borderRightColor: "#D5DEE5", borderRightWidth: 1, color: "#102B3D", fontSize: 14, marginHorizontal: 8, paddingRight: 8 }, input: { color: "#102B3D", flex: 1, fontSize: 14, minHeight: 42 },
  resetLink: { alignSelf: "flex-end", color: "#00A99D", fontSize: 12, marginBottom: 10, marginTop: 2 }, error: { color: "#B3261E", fontSize: 12, marginBottom: 6, textAlign: "center" },
  submitButton: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 14, justifyContent: "center", minHeight: 44 }, disabled: { opacity: 0.6 }, submitLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  biometricButton: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 8, minHeight: 32 }, biometricLabel: { color: "#00A99D", fontSize: 13, fontWeight: "700" },
  divider: { alignItems: "center", flexDirection: "row", gap: 12, marginVertical: 12 }, line: { backgroundColor: "#D5DEE5", flex: 1, height: 1 }, or: { color: "#748397", fontSize: 13 },
  createButton: { alignItems: "center", borderColor: "#00A99D", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 44 }, createLabel: { color: "#00A99D", fontSize: 16, fontWeight: "700" },
  security: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 18 }, securityText: { color: "#748397", fontSize: 12 },
});
