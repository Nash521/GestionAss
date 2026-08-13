import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardSafeScreen } from "../../../src/components/keyboard-safe-screen";
import { createAdminMember, getFunctionErrorMessage } from "../../../src/lib/supabase";

const background = require("../../../assets/Fond_ecranMobile.png");
const logo = require("../../../assets/logo-removebg-preview.png");

function Field({ icon, children }: { icon: keyof typeof Feather.glyphMap; children: React.ReactNode }) {
  return <View style={styles.field}><Feather name={icon} size={18} color="#00A99D" style={styles.fieldIcon} />{children}</View>;
}

export default function NewAdminMember() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFirstName(""); setLastName(""); setPhone(""); setPassword(""); setPasswordConfirmation(""); setRole("member"); setError("");
  };

  const submit = async () => {
    if (password !== passwordConfirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const normalizedPhone = phone.startsWith("+225") ? phone : `+225${phone}`;
      await createAdminMember({ firstName, lastName, phone: normalizedPhone, password, passwordConfirmation, role });
      resetForm();
      router.replace("/(admin)/members");
    } catch (submissionError) {
      setError(await getFunctionErrorMessage(submissionError) === "Ce numéro est déjà associé à un compte." ? "Ce numéro est déjà associé à un compte." : "Impossible d’ajouter ce membre.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <Image source={background} style={styles.background} accessible={false} />
      <KeyboardSafeScreen>
        <View style={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Retour">
            <Feather name="arrow-left" size={22} color="#102B3D" />
          </Pressable>
          <Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
          <Text style={styles.title}>Ajouter un membre</Text>
          <Text style={styles.subtitle}>Créez directement un compte pour un nouvel adhérent.</Text>

          <View style={styles.form}>
            <Field icon="user"><TextInput value={firstName} onChangeText={setFirstName} placeholder="Prénom" placeholderTextColor="#788798" style={styles.input} editable={!submitting} autoCapitalize="words" /></Field>
            <Field icon="user"><TextInput value={lastName} onChangeText={setLastName} placeholder="Nom" placeholderTextColor="#788798" style={styles.input} editable={!submitting} autoCapitalize="words" /></Field>
            <Field icon="phone"><TextInput value={phone} onChangeText={setPhone} placeholder="Téléphone" placeholderTextColor="#788798" style={styles.input} editable={!submitting} keyboardType="phone-pad" /></Field>
            <Field icon="lock"><TextInput value={password} onChangeText={setPassword} placeholder="Mot de passe initial" placeholderTextColor="#788798" style={styles.input} editable={!submitting} secureTextEntry autoCapitalize="none" /></Field>
            <Field icon="lock"><TextInput value={passwordConfirmation} onChangeText={setPasswordConfirmation} placeholder="Confirmation du mot de passe" placeholderTextColor="#788798" style={styles.input} editable={!submitting} secureTextEntry autoCapitalize="none" /></Field>
            <View style={styles.roleRow}>{(["member", "admin"] as const).map((value) => <Pressable key={value} disabled={submitting} onPress={() => setRole(value)} style={[styles.roleChoice, role === value && styles.roleChoiceActive]}><Text style={role === value ? styles.roleChoiceTextActive : styles.roleChoiceText}>{value === "member" ? "Membre" : "Administrateur"}</Text></Pressable>)}</View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable disabled={submitting} style={[styles.submit, submitting && styles.disabled]} onPress={() => void submit()} accessibilityRole="button"><Text style={styles.submitText}>{submitting ? "Ajout…" : "Ajouter le membre"}</Text></Pressable>
          </View>
        </View>
      </KeyboardSafeScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  background: { ...StyleSheet.absoluteFillObject, height: "100%", resizeMode: "cover", width: "100%" },
  content: { flexGrow: 1, paddingBottom: 32, paddingHorizontal: 22, paddingTop: 26 },
  backButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,.92)", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  logo: { alignSelf: "center", height: 82, marginTop: -20, resizeMode: "contain", width: 82 },
  title: { color: "#102B3D", fontSize: 25, fontWeight: "800", marginTop: 3, textAlign: "center" },
  subtitle: { color: "#65758A", fontSize: 13, lineHeight: 19, marginTop: 4, textAlign: "center" },
  form: { gap: 9, marginTop: 22 },
  field: { alignItems: "center", backgroundColor: "rgba(255,255,255,.97)", borderRadius: 13, elevation: 2, flexDirection: "row", minHeight: 48, shadowColor: "#6D8792", shadowOffset: { width: 0, height: 4 }, shadowOpacity: .09, shadowRadius: 8 },
  fieldIcon: { marginLeft: 14, marginRight: 7 },
  input: { color: "#102B3D", flex: 1, fontSize: 14, minHeight: 48, paddingRight: 13 },
  roleRow: { flexDirection: "row", gap: 9 },
  roleChoice: { alignItems: "center", backgroundColor: "rgba(255,255,255,.9)", borderColor: "#DDE6E8", borderRadius: 12, borderWidth: 1, flex: 1, minHeight: 46, justifyContent: "center" },
  roleChoiceActive: { backgroundColor: "#E1F7F1", borderColor: "#00A99D" },
  roleChoiceText: { color: "#65758A", fontWeight: "600" },
  roleChoiceTextActive: { color: "#007D74", fontWeight: "800" },
  error: { color: "#C75042", fontSize: 12, textAlign: "center" },
  submit: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 14, justifyContent: "center", marginTop: 4, minHeight: 50 },
  disabled: { opacity: .55 },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
