import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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

  const submit = async () => {
    if (!phonePattern.test(phone) || !password) {
      setError("Veuillez renseigner votre numéro et votre mot de passe.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithPhone(phone, password);
      const { destination } = await getSessionDestination();
      if (destination === "pending") return router.replace("/request-pending");
      if (destination === "active") return router.replace("/home");
      setError("Votre compte n’est pas disponible.");
    } catch {
      setError("Numéro ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <Image source={background} style={styles.background} accessible={false} />
      <View style={styles.content}>
        <Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
        <Text style={styles.title}>Bienvenue</Text>
        <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>

        <View style={styles.field}>
          <Feather name="phone" size={24} color="#00A99D" />
          <Text style={styles.prefix}>+225</Text>
          <TextInput style={styles.input} placeholder="Numéro de téléphone" placeholderTextColor="#788798" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
        </View>
        <View style={styles.field}>
          <Feather name="lock" size={24} color="#00A99D" />
          <TextInput style={styles.input} placeholder="Mot de passe" placeholderTextColor="#788798" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
          <Pressable onPress={() => setShowPassword((visible) => !visible)} accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
            <Feather name={showPassword ? "eye-off" : "eye"} size={24} color="#788798" />
          </Pressable>
        </View>
        <Link href="/password-reset" style={styles.resetLink}>Mot de passe oublié ?</Link>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={[styles.submitButton, loading && styles.disabled]} onPress={submit} disabled={loading} accessibilityRole="button">
          <Text style={styles.submitLabel}>{loading ? "Connexion…" : "Se connecter"}</Text>
        </Pressable>
        <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>ou</Text><View style={styles.line} /></View>
        <Link href="/sign-up" asChild>
          <Pressable style={styles.createButton} accessibilityRole="button"><Feather name="user-plus" size={22} color="#00A99D" /><Text style={styles.createLabel}>Créer un compte</Text></Pressable>
        </Link>
        <View style={styles.security}><Feather name="shield" size={20} color="#00A99D" /><Text style={styles.securityText}>Vos données sont sécurisées et protégées.</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" }, background: { ...StyleSheet.absoluteFillObject, height: "100%", resizeMode: "cover", width: "100%" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 28 }, logo: { alignSelf: "center", height: 150, marginBottom: 14, resizeMode: "contain", width: 150 },
  title: { color: "#102B3D", fontSize: 38, fontWeight: "700", textAlign: "center" }, subtitle: { color: "#748397", fontSize: 17, marginBottom: 58, marginTop: 8, textAlign: "center" },
  field: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 18, elevation: 2, flexDirection: "row", marginBottom: 18, minHeight: 70, paddingHorizontal: 22, shadowColor: "#6D8792", shadowOpacity: 0.09, shadowRadius: 8 },
  prefix: { borderRightColor: "#D5DEE5", borderRightWidth: 1, color: "#102B3D", fontSize: 18, marginHorizontal: 16, paddingRight: 16 }, input: { color: "#102B3D", flex: 1, fontSize: 17, minHeight: 54 },
  resetLink: { alignSelf: "flex-end", color: "#00A99D", fontSize: 16, marginBottom: 42, marginTop: 6 }, error: { color: "#B3261E", fontSize: 13, marginBottom: 10, textAlign: "center" },
  submitButton: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 17, justifyContent: "center", minHeight: 66 }, disabled: { opacity: 0.6 }, submitLabel: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  divider: { alignItems: "center", flexDirection: "row", gap: 20, marginVertical: 38 }, line: { backgroundColor: "#D5DEE5", flex: 1, height: 1 }, or: { color: "#748397", fontSize: 17 },
  createButton: { alignItems: "center", borderColor: "#00A99D", borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 16, justifyContent: "center", minHeight: 66 }, createLabel: { color: "#00A99D", fontSize: 22, fontWeight: "700" },
  security: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "center", marginTop: 72 }, securityText: { color: "#748397", fontSize: 15 },
});
