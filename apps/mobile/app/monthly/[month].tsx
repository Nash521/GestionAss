import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MemberNavigation } from "../../src/components/member-navigation";
import { getMyMemberDashboard } from "../../src/features/member-dashboard/api";
import type { MemberMonthlyDue } from "../../src/features/member-dashboard/model";
import { getSessionDestination } from "../../src/lib/supabase";

const background = require("../../assets/Fond_ecranMobile.png");
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
const monthLabel = (value: string) => new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${value}-01T00:00:00`));
const validMonth = /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/;

export default function MemberMonthlyPayment() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const [due, setDue] = useState<MemberMonthlyDue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++sequence.current;
    setLoading(true); setError("");
    try {
      const session = await getSessionDestination();
      if (requestId !== sequence.current) return;
      if (session.destination !== "active") { router.replace("/login"); return; }
      if (session.role === "admin") { router.replace("/(admin)/dashboard"); return; }
      if (!month || !validMonth.test(month)) { setError("Mois invalide."); return; }
      const dashboard = await getMyMemberDashboard(new Date().getFullYear());
      if (requestId !== sequence.current) return;
      setDue(dashboard.monthlyDues.find((item) => item.month.startsWith(month)) ?? null);
    } catch { if (requestId === sequence.current) setError("Impossible de charger cette mensualité."); }
    finally { if (requestId === sequence.current) setLoading(false); }
  }, [month]);

  useFocusEffect(useCallback(() => { void load(); return () => { sequence.current++; }; }, [load]));

  const settled = !!due && due.amountRemaining <= 0;
  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}><View style={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour au calendrier" onPress={() => router.replace("/home")} style={styles.back}><Feather name="arrow-left" size={18} color="#007D74" /><Text style={styles.backText}>Calendrier</Text></Pressable>
        <Text style={styles.overline}>ESPACE MEMBRE</Text><Text style={styles.title}>Mensualité</Text>
        <Text style={styles.subtitle}>{month && validMonth.test(month) ? monthLabel(month) : "Détail du paiement"}</Text>
        {loading ? <View style={styles.card}><Text style={styles.muted}>Chargement de la mensualité…</Text></View> : error ? <View style={styles.card}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.link}>Réessayer</Text></Pressable></View> : !due ? <View style={styles.card}><View style={styles.emptyIcon}><Feather name="calendar" size={24} color="#65758A" /></View><Text style={styles.cardTitle}>Aucune mensualité émise</Text><Text style={styles.muted}>Aucun paiement ne peut être effectué pour ce mois pour le moment.</Text></View> : <>
          <View style={styles.hero}><View style={styles.heroIcon}><Feather name={settled ? "check-circle" : "calendar"} size={24} color="#007D74" /></View><Text style={styles.heroLabel}>{settled ? "Mensualité réglée" : "Reste à régler"}</Text><Text style={styles.heroAmount}>{money(due.amountRemaining)}</Text><Text style={styles.heroMonth}>{monthLabel(month)}</Text></View>
          <View style={styles.card}><Text style={styles.cardTitle}>Détail de la mensualité</Text><View style={styles.row}><Text style={styles.rowLabel}>Montant dû</Text><Text style={styles.rowValue}>{money(due.amountDue)}</Text></View><View style={styles.row}><Text style={styles.rowLabel}>Déjà réglé</Text><Text style={styles.rowValue}>{money(due.amountPaid)}</Text></View><View style={styles.row}><Text style={styles.rowLabel}>Solde restant</Text><Text style={styles.rowValue}>{money(due.amountRemaining)}</Text></View></View>
          {settled ? <View style={styles.card}><Text style={styles.muted}>Cette mensualité est entièrement réglée.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/transactions")}><Text style={styles.link}>Voir mes transactions</Text></Pressable></View> : <View style={styles.card}><Text style={styles.cardTitle}>Effectuer un paiement</Text><Text style={styles.muted}>Choisissez un montant, puis un mode de paiement, comme dans le parcours administrateur.</Text><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/monthly/[month]/pay", params: { month } })} style={styles.payButton}><Text style={styles.payButtonText}>Choisir un montant</Text><Feather name="arrow-right" size={17} color="#FFF" /></Pressable></View>}
        </>}
      </View></ImageBackground>
    </ScrollView>
    <MemberNavigation active="home" />
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, scroll: { flexGrow: 1 }, background: { flexGrow: 1, minHeight: "100%" }, backgroundImage: { height: "100%", resizeMode: "cover", width: "100%" }, content: { alignSelf: "center", gap: 15, maxWidth: 760, padding: 20, paddingBottom: 115, paddingTop: 26, width: "100%" },
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 8, marginBottom: 9 }, backText: { color: "#007D74", fontSize: 14, fontWeight: "700" }, overline: { color: "#007D74", fontSize: 11, fontWeight: "800", letterSpacing: 1.3 }, title: { color: "#102B3D", fontSize: 28, fontWeight: "800", marginTop: -9 }, subtitle: { color: "#65758A", fontSize: 14, marginTop: -8, textTransform: "capitalize" },
  card: { backgroundColor: "#FFF", borderColor: "#E1EBE9", borderRadius: 17, borderWidth: 1, gap: 12, padding: 19 }, cardTitle: { color: "#102B3D", fontSize: 16, fontWeight: "800" }, muted: { color: "#65758A", fontSize: 13, lineHeight: 20 }, emptyIcon: { alignItems: "center", backgroundColor: "#F0F3F5", borderRadius: 13, height: 48, justifyContent: "center", width: 48 }, error: { color: "#B64337", fontSize: 13 }, link: { color: "#007D74", fontSize: 13, fontWeight: "800" },
  hero: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#D4E9E5", borderRadius: 20, borderWidth: 1, gap: 10, padding: 26 }, heroIcon: { alignItems: "center", backgroundColor: "#EAF7F4", borderRadius: 14, height: 52, justifyContent: "center", width: 52 }, heroLabel: { color: "#65758A", fontSize: 13 }, heroAmount: { color: "#007D74", fontSize: 30, fontWeight: "800" }, heroMonth: { color: "#102B3D", fontSize: 15, fontWeight: "800", textTransform: "capitalize" },
  row: { borderBottomColor: "#EEF2F2", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingVertical: 9 }, rowLabel: { color: "#65758A", fontSize: 13 }, rowValue: { color: "#102B3D", fontSize: 13, fontWeight: "800" }, payButton: { alignItems: "center", backgroundColor: "#007D74", borderRadius: 13, flexDirection: "row", gap: 10, justifyContent: "center", minHeight: 54, paddingHorizontal: 13 }, payButtonText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
