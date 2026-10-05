import { LoadingState } from "../../src/components/loading-state";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getMyMemberDashboard, getMyMemberWavePaymentLink } from "../../src/features/member-dashboard/api";
import { abidjanToday, activeExceptionalDues, type MemberExceptionalDue } from "../../src/features/member-dashboard/model";
import { normalizeWavePaymentLink } from "../../src/features/admin-configuration/wave";

const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);

export default function ExceptionalContribution() {
  const { dueId } = useLocalSearchParams<{ dueId: string }>();
  const [due, setDue] = useState<MemberExceptionalDue | null>(null);
  const [waveUrl, setWaveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [dashboard, link] = await Promise.all([getMyMemberDashboard(new Date().getFullYear()), getMyMemberWavePaymentLink()]);
      setDue(activeExceptionalDues(dashboard.exceptionalDues, abidjanToday()).find((item) => item.id === dueId) ?? null);
      setWaveUrl(link ? normalizeWavePaymentLink(link) : null);
    } catch { setError("Impossible de charger cette cotisation."); }
    finally { setLoading(false); }
  }, [dueId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openWave = async () => {
    if (!due || !waveUrl || opening) return;
    setOpening(true); setError("");
    try {
      const current = await getMyMemberDashboard(new Date().getFullYear());
      const fresh = activeExceptionalDues(current.exceptionalDues, abidjanToday()).find((item) => item.id === dueId);
      if (!fresh) { setDue(null); return; }
      setDue(fresh);
      if (Platform.OS === "web") {
        const opened = globalThis.open(waveUrl, "_blank");
        if (!opened) throw new Error("Fenêtre bloquée");
        opened.opener = null;
      } else await Linking.openURL(waveUrl);
    } catch { setError("Impossible d’ouvrir Wave. Réessayez ou vérifiez les fenêtres bloquées."); }
    finally { setOpening(false); }
  };

  return <ScrollView contentContainerStyle={styles.page}>
    <Pressable accessibilityRole="button" accessibilityLabel="Retour au tableau de bord" onPress={() => router.replace("/home")} style={styles.back}><Feather name="arrow-left" size={20} color="#007D74" /><Text style={styles.backText}>Tableau de bord</Text></Pressable>
    <Text style={styles.title}>Cotisation exceptionnelle</Text>
    {loading ? <LoadingState label="Chargement…" /> : !due ? <View style={styles.card}><Text style={styles.hint}>{error || "Cette cotisation n’est plus ouverte ou son échéance est passée."}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.link}>Actualiser</Text></Pressable></View> : <>
      <View style={styles.card}><View style={styles.icon}><Feather name="gift" size={25} color="#8055A8" /></View><Text style={styles.label}>{due.label}</Text><Text style={styles.amount}>{money(due.amountDue - due.amountPaid)}</Text><Text style={styles.hint}>Reste à payer sur {money(due.amountDue)}</Text><Text style={styles.hint}>Échéance : {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(`${due.dueDate}T00:00:00`))}</Text></View>
      <Text style={styles.subtitle}>Comment souhaitez-vous payer ?</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !waveUrl || opening }} disabled={!waveUrl || opening} onPress={() => void openWave()} style={[styles.choice, !waveUrl && styles.disabled]}><Image source={require("../../assets/wave-logo.png")} style={styles.logo} /><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Wave</Text><Text style={styles.hint}>{waveUrl ? "Ouvrir le compte Business de l’association" : "Lien Wave non configuré"}</Text></View><Feather name="external-link" size={17} color="#007D74" /></Pressable>
      <View style={styles.choice}><View style={styles.cashIcon}><Feather name="dollar-sign" size={22} color="#007D74" /></View><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Espèces</Text><Text style={styles.hint}>Remettez votre paiement à l’administrateur, qui l’enregistrera après réception.</Text></View></View>
      <Text style={styles.notice}>Le paiement Wave sera enregistré après vérification par l’administrateur. Vérifiez le montant et la cotisation auprès de lui avant de payer.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { alignSelf: "center", backgroundColor: "#F5F9F8", flexGrow: 1, gap: 16, maxWidth: 760, padding: 20, paddingBottom: 70, paddingTop: 34, width: "100%" },
  back: { alignItems: "center", flexDirection: "row", gap: 8 }, backText: { color: "#007D74", fontWeight: "800" }, title: { color: "#102B3D", fontSize: 25, fontWeight: "800", marginTop: 12 },
  card: { backgroundColor: "#FFF", borderRadius: 17, gap: 8, padding: 20 }, icon: { alignItems: "center", backgroundColor: "#F1E9FA", borderRadius: 12, height: 48, justifyContent: "center", width: 48 }, label: { color: "#102B3D", fontSize: 18, fontWeight: "800" }, amount: { color: "#8055A8", fontSize: 27, fontWeight: "800", marginTop: 6 }, hint: { color: "#65758A", fontSize: 12, lineHeight: 18 }, subtitle: { color: "#102B3D", fontSize: 15, fontWeight: "800" },
  choice: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#E2E9E9", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 14, minHeight: 78, padding: 13 }, disabled: { opacity: 0.5 }, logo: { borderRadius: 10, height: 48, width: 48 }, cashIcon: { alignItems: "center", backgroundColor: "#E2F6E8", borderRadius: 10, height: 48, justifyContent: "center", width: 48 }, choiceCopy: { flex: 1, gap: 3 }, choiceTitle: { color: "#102B3D", fontSize: 15, fontWeight: "800" }, notice: { color: "#65758A", fontSize: 12, lineHeight: 19 }, error: { color: "#B64337", fontSize: 12 }, link: { color: "#007D74", fontWeight: "800" },
});
