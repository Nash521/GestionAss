import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { registrationFlow } from "../../src/features/auth/registration-flow";
import { KeyboardSafeScreen } from "../../src/components/keyboard-safe-screen";
import { invokeRegistrationFunction } from "../../src/lib/supabase";

const background = require("../../assets/fond_effetvague.png");
const logo = require("../../assets/logo-removebg-preview.png");

function Field({ icon, children }: { icon: keyof typeof Feather.glyphMap; children: React.ReactNode }) {
  return <View style={styles.field}><Feather name={icon} size={18} color="#00A99D" style={styles.fieldIcon} />{children}</View>;
}

export default function SignUp() {
  const [invitationCode, setInvitationCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordRequirements = [
    ["8 caractères", password.length >= 8],
    ["Une minuscule", /[a-z]/.test(password)],
    ["Une majuscule", /[A-Z]/.test(password)],
    ["Un chiffre", /\d/.test(password)],
    ["Un caractère spécial", /[^A-Za-z0-9]/.test(password)],
  ] as const;

  const submit = async () => {
    if (!invitationCode.trim() || !firstName.trim() || !lastName.trim() || !/^\+2250[157]\d{8}$/.test(phone) || !passwordRequirements.every(([, valid]) => valid)) {
      setError("Veuillez remplir correctement tous les champs.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const invitation = await invokeRegistrationFunction<{ registrationToken: string }>("validate-registration-invitation", { code: invitationCode.trim(), phone });
      if (!invitation?.registrationToken) throw new Error("Missing invitation token");
      registrationFlow.update({ firstName: firstName.trim(), lastName: lastName.trim(), phone, password, invitationToken: invitation.registrationToken });
      await invokeRegistrationFunction("send-registration-otp", { phone, invitationToken: invitation.registrationToken });
      router.push("/(auth)/verify-phone");
    } catch {
      setError("Impossible d’envoyer le code. Vérifiez votre invitation et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <Image source={background} style={styles.background} accessible={false} />
      <KeyboardSafeScreen>
      <View style={styles.content}>
        <Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Rejoignez-nous et faites la différence.</Text>

        <Field icon="tag"><TextInput style={styles.input} placeholder="Code d’invitation" placeholderTextColor="#788798" value={invitationCode} onChangeText={setInvitationCode} autoCapitalize="characters" /></Field>
        <Field icon="user"><TextInput style={styles.input} placeholder="Nom" placeholderTextColor="#788798" value={lastName} onChangeText={setLastName} autoCapitalize="words" /></Field>
        <Field icon="user"><TextInput style={styles.input} placeholder="Prénom" placeholderTextColor="#788798" value={firstName} onChangeText={setFirstName} autoCapitalize="words" /></Field>
        <Field icon="phone"><TextInput style={styles.input} placeholder="Téléphone (+225...)" placeholderTextColor="#788798" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" /></Field>
        <Field icon="lock"><TextInput style={styles.input} placeholder="Mot de passe" placeholderTextColor="#788798" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" /><Pressable style={styles.eye} onPress={() => setShowPassword((current) => !current)}><Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#788798" /></Pressable></Field>
        <Field icon="lock"><TextInput style={styles.input} placeholder="Confirmer le mot de passe" placeholderTextColor="#788798" value={passwordConfirmation} onChangeText={setPasswordConfirmation} secureTextEntry={!showPasswordConfirmation} autoCapitalize="none" /><Pressable style={styles.eye} onPress={() => setShowPasswordConfirmation((current) => !current)}><Feather name={showPasswordConfirmation ? "eye-off" : "eye"} size={18} color="#788798" /></Pressable></Field>

        <View style={styles.requirements}>
          {passwordRequirements.map(([label, valid], index) => <View style={[styles.requirement, index % 2 === 0 && styles.requirementLeft]} key={label}><Feather name={valid ? "check-circle" : "circle"} size={13} color={valid ? "#00A99D" : "#8493A1"} /><Text style={[styles.requirementLabel, valid && styles.requirementLabelValid]}>{label}</Text></View>)}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={submit} disabled={loading} accessibilityRole="button"><Text style={styles.submitButtonLabel}>{loading ? "Envoi…" : "Créer un compte"}</Text></Pressable>
        <View style={styles.loginLine}><Text style={styles.loginText}>Vous avez déjà un compte ? </Text><Pressable onPress={() => router.replace("/login")} accessibilityRole="link"><Text style={styles.loginLink}>Se connecter</Text></Pressable></View>
      </View>
      </KeyboardSafeScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  background: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", resizeMode: "cover" },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 28, paddingBottom: 18, justifyContent: "center" },
  logo: { alignSelf: "center", width: 86, height: 86, marginBottom: 4, resizeMode: "contain" },
  title: { color: "#102B3D", fontSize: 24, fontWeight: "700", textAlign: "center" },
  subtitle: { marginTop: 2, marginBottom: 9, color: "#748397", fontSize: 13, textAlign: "center" },
  field: { minHeight: 42, marginBottom: 6, borderRadius: 13, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", shadowColor: "#6D8792", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 8, elevation: 2 },
  fieldIcon: { marginLeft: 13, marginRight: 6 },
  input: { flex: 1, minHeight: 42, paddingVertical: 0, paddingRight: 12, color: "#102B3D", fontSize: 14 },
  eye: { padding: 10 },
  requirements: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  requirement: { width: "50%", flexDirection: "row", alignItems: "center", marginTop: 3 },
  requirementLeft: { width: "42%", marginLeft: "8%" },
  requirementLabel: { marginLeft: 4, color: "#8493A1", fontSize: 11 },
  requirementLabelValid: { color: "#007F76" },
  error: { marginBottom: 6, color: "#B3261E", fontSize: 12, textAlign: "center" },
  submitButton: { alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 14, backgroundColor: "#00A99D" },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  loginLine: { flexDirection: "row", justifyContent: "center", marginTop: 9 },
  loginText: { color: "#506275", fontSize: 12 },
  loginLink: { color: "#009C91", fontSize: 12, fontWeight: "700" },
});
