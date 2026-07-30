import { useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardSafeScreen } from "../../src/components/keyboard-safe-screen";
import { registrationFlow } from "../../src/features/auth/registration-flow";
import { invokeRegistrationFunction } from "../../src/lib/supabase";

const background = require("../../assets/fond_effetvague.png");
const logo = require("../../assets/logo-removebg-preview.png");
const RESEND_DELAY_SECONDS = 45;

export default function VerifyPhone() {
  const [code, setCode] = useState("");
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(RESEND_DELAY_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const draft = registrationFlow.snapshot();

  useEffect(() => {
    if (remainingSeconds === 0) return;

    const timer = setTimeout(() => {
      setRemainingSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [remainingSeconds]);

  const updateCode = (value: string) => {
    setCode(value.replace(/\D/g, "").slice(0, 6));
  };

  const returnToSignUp = () => {
    router.replace("/(auth)/sign-up");
  };

  const submit = async () => {
    if (!draft.invitationToken || !/^\d{6}$/.test(code)) {
      setError("Saisissez le code à six chiffres reçu par SMS.");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const verified = await invokeRegistrationFunction<{ otpToken: string }>("verify-registration-otp", {
        phone: draft.phone,
        code,
        invitationToken: draft.invitationToken,
      });
      if (!verified?.otpToken) throw new Error("Missing OTP token");

      registrationFlow.update({ otpToken: verified.otpToken });
      await invokeRegistrationFunction("create-membership-request", {
        firstName: draft.firstName,
        lastName: draft.lastName,
        phone: draft.phone,
        password: draft.password,
        otpToken: verified.otpToken,
      });
      registrationFlow.clear();
      router.replace("/(auth)/request-pending");
    } catch {
      setError("Le code est invalide ou la demande n’a pas pu être envoyée.");
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (remainingSeconds > 0 || resending || !draft.invitationToken) return;

    setResending(true);
    setError(null);

    try {
      await invokeRegistrationFunction("send-registration-otp", {
        phone: draft.phone,
        invitationToken: draft.invitationToken,
      });
      setRemainingSeconds(RESEND_DELAY_SECONDS);
      setCode("");
      inputRef.current?.focus();
    } catch {
      setError("Impossible de renvoyer le code. Réessayez plus tard.");
    } finally {
      setResending(false);
    }
  };

  const countdown = `00:${String(remainingSeconds).padStart(2, "0")}`;
  const canResend = remainingSeconds === 0 && !resending;

  return (
    <View style={styles.page}>
      <Image source={background} style={styles.background} accessible={false} />
      <KeyboardSafeScreen>
        <View style={styles.content}>
          <Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
          <Text style={styles.title}>Vérification par SMS</Text>
          <Text style={styles.subtitle}>Saisissez le code envoyé au numéro suivant.</Text>

          <View style={styles.phoneCard}>
            <Feather name="phone" size={18} color="#00A99D" />
            <Text style={styles.phone}>{draft.phone}</Text>
            <Pressable onPress={returnToSignUp} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.change}>Modifier</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.codeCells}
            onPress={() => inputRef.current?.focus()}
            accessibilityRole="button"
            accessibilityLabel="Saisir le code de vérification"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <View key={index} style={[styles.codeCell, isCodeFocused && styles.codeCellFocused, code[index] && styles.codeCellFilled]}>
                <Text style={styles.codeDigit}>{code[index] ?? ""}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={updateCode}
            onFocus={() => setIsCodeFocused(true)}
            onBlur={() => setIsCodeFocused(false)}
            keyboardType="number-pad"
            maxLength={6}
            accessibilityLabel="Code de vérification à six chiffres"
          />

          <Text style={styles.validity}>Le code est valide pendant 5 minutes.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.verifyButton, verifying && styles.buttonDisabled]}
            onPress={submit}
            disabled={verifying}
            accessibilityRole="button"
          >
            <Text style={styles.verifyLabel}>{verifying ? "Vérification…" : "Vérifier le code"}</Text>
          </Pressable>

          <Text style={styles.resendHint}>
            Vous n’avez pas reçu le code ? {remainingSeconds > 0 ? `Renvoyer dans ${countdown}` : ""}
          </Text>
          <Pressable
            style={[styles.resendButton, !canResend && styles.resendButtonDisabled]}
            onPress={resend}
            disabled={!canResend}
            accessibilityRole="button"
          >
            <Text style={[styles.resendLabel, !canResend && styles.resendLabelDisabled]}>
              {resending ? "Envoi…" : "Renvoyer le code maintenant"}
            </Text>
          </Pressable>

          <Pressable style={styles.backButton} onPress={returnToSignUp} accessibilityRole="button">
            <Feather name="arrow-left" size={16} color="#506275" />
            <Text style={styles.backLabel}>Retour</Text>
          </Pressable>
        </View>
      </KeyboardSafeScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  background: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", resizeMode: "cover" },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 26, paddingVertical: 24 },
  logo: { alignSelf: "center", width: 102, height: 102, marginBottom: 10, resizeMode: "contain" },
  title: { color: "#102B3D", fontSize: 25, fontWeight: "700", textAlign: "center" },
  subtitle: { marginTop: 5, color: "#748397", fontSize: 14, lineHeight: 20, textAlign: "center" },
  phoneCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, flexDirection: "row", marginTop: 24, paddingHorizontal: 15, paddingVertical: 13, shadowColor: "#6D8792", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  phone: { color: "#102B3D", flex: 1, fontSize: 15, fontWeight: "600", marginLeft: 9 },
  change: { color: "#009C91", fontSize: 13, fontWeight: "700" },
  codeCells: { flexDirection: "row", justifyContent: "space-between", marginTop: 26 },
  codeCell: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D9E2E8", borderRadius: 11, borderWidth: 1, height: 46, justifyContent: "center", width: 42 },
  codeCellFocused: { borderColor: "#00A99D", borderWidth: 2 },
  codeCellFilled: { backgroundColor: "#F4FFFD" },
  codeDigit: { color: "#102B3D", fontSize: 21, fontWeight: "700" },
  hiddenInput: { height: 1, opacity: 0, position: "absolute", width: 1 },
  validity: { color: "#748397", fontSize: 12, marginTop: 11, textAlign: "center" },
  error: { color: "#B3261E", fontSize: 12, lineHeight: 17, marginTop: 11, textAlign: "center" },
  verifyButton: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 14, justifyContent: "center", marginTop: 22, minHeight: 46 },
  buttonDisabled: { opacity: 0.6 },
  verifyLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  resendHint: { color: "#506275", fontSize: 12, marginTop: 20, textAlign: "center" },
  resendButton: { alignItems: "center", marginTop: 7, paddingVertical: 5 },
  resendButtonDisabled: { opacity: 0.5 },
  resendLabel: { color: "#009C91", fontSize: 13, fontWeight: "700" },
  resendLabelDisabled: { color: "#748397" },
  backButton: { alignItems: "center", alignSelf: "center", flexDirection: "row", marginTop: 17, padding: 6 },
  backLabel: { color: "#506275", fontSize: 13, marginLeft: 5 },
});
