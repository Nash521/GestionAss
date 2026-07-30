import { useState } from "react";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { registrationFlow } from "../../src/features/auth/registration-flow";
import { invokeRegistrationFunction } from "../../src/lib/supabase";

const background = require("../../assets/fond_effetvague.png");
const logo = require("../../assets/logo-removebg-preview.png");

export default function SignUp() {
  const [invitationCode, setInvitationCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (
      !invitationCode.trim() ||
      !firstName.trim() ||
      !lastName.trim() ||
      !/^\+2250[157]\d{8}$/.test(phone) ||
      password.length < 8
    ) {
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
      const invitation = await invokeRegistrationFunction<{ registrationToken: string }>(
        "validate-registration-invitation",
        { code: invitationCode.trim(), phone },
      );

      if (!invitation?.registrationToken) throw new Error("Missing invitation token");

      registrationFlow.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone,
        password,
        invitationToken: invitation.registrationToken,
      });

      await invokeRegistrationFunction("send-registration-otp", {
        phone,
        invitationToken: invitation.registrationToken,
      });
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
      <View style={styles.content}>
        <Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Rejoignez-nous et faites la différence.</Text>

        <TextInput style={styles.input} placeholder="Code d’invitation" placeholderTextColor="#788798" value={invitationCode} onChangeText={setInvitationCode} autoCapitalize="characters" />
        <TextInput style={styles.input} placeholder="Nom" placeholderTextColor="#788798" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <TextInput style={styles.input} placeholder="Prénom" placeholderTextColor="#788798" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <TextInput style={styles.input} placeholder="Téléphone (+225...)" placeholderTextColor="#788798" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Mot de passe" placeholderTextColor="#788798" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Confirmer le mot de passe" placeholderTextColor="#788798" value={passwordConfirmation} onChangeText={setPasswordConfirmation} secureTextEntry autoCapitalize="none" />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={submit} disabled={loading} accessibilityRole="button">
          <Text style={styles.submitButtonLabel}>{loading ? "Envoi…" : "Créer un compte"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  background: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", resizeMode: "cover" },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 34, paddingBottom: 24, justifyContent: "center" },
  logo: { alignSelf: "center", width: 70, height: 70, marginBottom: 8, resizeMode: "contain" },
  title: { color: "#102B3D", fontSize: 24, fontWeight: "700", textAlign: "center" },
  subtitle: { marginTop: 3, marginBottom: 14, color: "#748397", fontSize: 13, textAlign: "center" },
  input: {
    minHeight: 42,
    marginBottom: 8,
    borderRadius: 13,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    color: "#102B3D",
    fontSize: 14,
    shadowColor: "#6D8792",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 2,
  },
  error: { marginBottom: 8, color: "#B3261E", fontSize: 12, textAlign: "center" },
  submitButton: { alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 14, backgroundColor: "#00A99D" },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
