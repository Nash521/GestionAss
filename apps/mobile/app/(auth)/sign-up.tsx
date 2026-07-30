import { useState } from "react";
import { router } from "expo-router";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { registrationFlow } from "../../src/features/auth/registration-flow";
import { invokeRegistrationFunction } from "../../src/lib/supabase";

const topWave = require("../../assets/effet_haut_page.png");
const bottomWave = require("../../assets/effet_bas_page.png");
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

      if (!invitation?.registrationToken) {
        throw new Error("Missing invitation token");
      }

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
      <Image source={topWave} style={styles.topWave} accessible={false} />
      <Image source={bottomWave} style={styles.bottomWave} accessible={false} />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez-nous et faites la différence.</Text>

          <TextInput
            style={styles.input}
            placeholder="Code d’invitation"
            placeholderTextColor="#788798"
            value={invitationCode}
            onChangeText={setInvitationCode}
            autoCapitalize="characters"
          />
          <TextInput
            style={styles.input}
            placeholder="Nom"
            placeholderTextColor="#788798"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Prénom"
            placeholderTextColor="#788798"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Téléphone (+225... )"
            placeholderTextColor="#788798"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#788798"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmer le mot de passe"
            placeholderTextColor="#788798"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.requirements}>Au moins 8 caractères</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={submit}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.submitButtonLabel}>{loading ? "Envoi…" : "Créer un compte"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topWave: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 190,
    resizeMode: "stretch",
  },
  bottomWave: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 240,
    resizeMode: "stretch",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 56,
  },
  logo: {
    alignSelf: "center",
    width: 118,
    height: 118,
    marginBottom: 18,
    resizeMode: "contain",
  },
  title: {
    color: "#102B3D",
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    color: "#748397",
    fontSize: 16,
    textAlign: "center",
  },
  input: {
    minHeight: 56,
    marginBottom: 14,
    borderRadius: 18,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    color: "#102B3D",
    fontSize: 16,
    shadowColor: "#6D8792",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  requirements: {
    marginTop: 2,
    marginBottom: 14,
    color: "#506275",
    fontSize: 13,
  },
  error: {
    marginBottom: 14,
    color: "#B3261E",
    fontSize: 14,
  },
  submitButton: {
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 17,
    backgroundColor: "#00A99D",
    shadowColor: "#007F76",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonLabel: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
