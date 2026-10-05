import { LoadingLabel } from "../../src/components/loading-state";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { clearBiometricLogin } from "../../src/lib/biometric-session";
import { getSupabaseClient, invokeRegistrationFunction } from "../../src/lib/supabase-client";

const phonePattern = /^\+2250[157]\d{8}$/;
const isStrongPassword = (value: string) => value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);

export default function PasswordReset() {
  const [step, setStep] = useState<"phone" | "code" | "password">("phone");
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const normalized = phone.trim().startsWith("+225") ? phone.trim() : `+225${phone.trim()}`;
    if (!phonePattern.test(normalized)) { setError("Saisissez un numéro ivoirien valide."); return; }
    setLoading(true); setError(null);
    try {
      await invokeRegistrationFunction("send-password-reset-otp", { phone: normalized });
      setVerifiedPhone(normalized); setCode(""); setStep("code");
    } catch { setError("Le service de récupération est indisponible. Réessayez plus tard."); }
    finally { setLoading(false); }
  };

  const continueWithCode = () => {
    if (!/^\d{6}$/.test(code)) { setError("Saisissez le code à six chiffres reçu par SMS."); return; }
    setError(null); setStep("password");
  };

  const reset = async () => {
    if (!isStrongPassword(password)) { setError("Le mot de passe doit contenir au moins 8 caractères, une minuscule, une majuscule, un chiffre et un caractère spécial."); return; }
    if (password !== confirmation) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true); setError(null);
    try {
      await invokeRegistrationFunction("reset-password-with-otp", { phone: verifiedPhone, code, password });
      await clearBiometricLogin();
      await getSupabaseClient().auth.signOut();
      router.replace({ pathname: "/login", params: { passwordReset: "1" } });
    } catch { setError("Code invalide ou expiré, ou service momentanément indisponible. Réessayez ou demandez un nouveau code."); }
    finally { setLoading(false); }
  };

  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Pressable accessibilityRole="button" accessibilityLabel="Retour à la connexion" onPress={() => router.replace("/login")} style={styles.back}><Feather name="arrow-left" size={19} color="#007D74" /><Text style={styles.backText}>Connexion</Text></Pressable>
    <View style={styles.icon}><Feather name="lock" size={27} color="#007D74" /></View>
    <Text style={styles.title}>Mot de passe oublié ?</Text>
    <Text style={styles.message}>Ce parcours fonctionne pour les membres et les administrateurs.</Text>

    {step === "phone" ? <>
      <Text style={styles.label}>Numéro de téléphone du compte</Text>
      <TextInput style={styles.input} accessibilityLabel="Numéro de téléphone" placeholder="07 00 00 00 00 ou +225…" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
      <Text style={styles.hint}>Si ce numéro possède un compte actif, un code de six chiffres lui sera envoyé.</Text>
      <Pressable style={[styles.button, loading && styles.disabled]} accessibilityRole="button" onPress={() => void send()} disabled={loading}><LoadingLabel loading={!!(loading)} style={styles.buttonText}>{loading ? "Envoi…" : "Recevoir le code"}</LoadingLabel></Pressable>
    </> : null}

    {step === "code" ? <>
      <Text style={styles.label}>Code envoyé au {verifiedPhone}</Text>
      <TextInput style={styles.input} accessibilityLabel="Code à six chiffres" placeholder="Code à 6 chiffres" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} />
      <Text style={styles.hint}>Le code expire après 10 minutes. Il sera vérifié lors de l’enregistrement du nouveau mot de passe.</Text>
      <Pressable style={styles.button} accessibilityRole="button" onPress={continueWithCode}><Text style={styles.buttonText}>Continuer</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => { setStep("phone"); setError(null); }}><Text style={styles.secondary}>Changer de numéro ou demander un autre code</Text></Pressable>
    </> : null}

    {step === "password" ? <>
      <Text style={styles.label}>Nouveau mot de passe</Text>
      <View style={styles.passwordRow}><TextInput style={styles.passwordInput} accessibilityLabel="Nouveau mot de passe" placeholder="Nouveau mot de passe" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="new-password" /><Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} onPress={() => setShowPassword((visible) => !visible)}><Feather name={showPassword ? "eye-off" : "eye"} size={19} color="#65758A" /></Pressable></View>
      <TextInput style={styles.input} accessibilityLabel="Confirmer le mot de passe" placeholder="Confirmer le mot de passe" value={confirmation} onChangeText={setConfirmation} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="new-password" />
      <Text style={styles.hint}>8 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.</Text>
      <Pressable style={[styles.button, loading && styles.disabled]} accessibilityRole="button" onPress={() => void reset()} disabled={loading}><LoadingLabel loading={!!(loading)} style={styles.buttonText}>{loading ? "Modification…" : "Enregistrer le nouveau mot de passe"}</LoadingLabel></Pressable>
      <Pressable accessibilityRole="button" onPress={() => { setStep("code"); setError(null); }}><Text style={styles.secondary}>Modifier le code</Text></Pressable>
    </> : null}
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { alignSelf: "center", backgroundColor: "#FFF", flexGrow: 1, gap: 14, justifyContent: "center", maxWidth: 480, padding: 24, width: "100%" },
  back: { alignItems: "center", flexDirection: "row", gap: 7, marginBottom: 10 }, backText: { color: "#007D74", fontWeight: "800" }, icon: { alignItems: "center", alignSelf: "center", backgroundColor: "#EAF7F4", borderRadius: 19, height: 60, justifyContent: "center", width: 60 },
  title: { color: "#102B3D", fontSize: 27, fontWeight: "800", textAlign: "center" }, message: { color: "#506275", fontSize: 13, lineHeight: 19, marginBottom: 8, textAlign: "center" }, label: { color: "#102B3D", fontSize: 13, fontWeight: "800" },
  input: { borderColor: "#CBD5DC", borderRadius: 12, borderWidth: 1, color: "#102B3D", minHeight: 50, padding: 13 }, passwordRow: { alignItems: "center", borderColor: "#CBD5DC", borderRadius: 12, borderWidth: 1, flexDirection: "row", paddingRight: 13 }, passwordInput: { color: "#102B3D", flex: 1, minHeight: 48, paddingHorizontal: 13 }, hint: { color: "#65758A", fontSize: 12, lineHeight: 18 },
  button: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 12, justifyContent: "center", minHeight: 50, padding: 12 }, buttonText: { color: "#FFF", fontSize: 14, fontWeight: "800", textAlign: "center" }, disabled: { opacity: 0.55 }, secondary: { color: "#007D74", fontSize: 13, fontWeight: "700", paddingVertical: 8, textAlign: "center" }, error: { color: "#B3261E", fontSize: 12, lineHeight: 18, textAlign: "center" },
});
