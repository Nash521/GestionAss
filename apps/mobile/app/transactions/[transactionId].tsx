import { LoadingState } from "../../src/components/loading-state";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MemberNavigation } from "../../src/components/member-navigation";
import { getMyMemberTransaction, type MemberTransactionDetail } from "../../src/features/member-account/api";
import { exportTransactionPdf, formatDate, formatMoney, formatMonth, shareTransaction, transactionMethod, transactionTitle } from "../../src/features/member-account/transaction-actions";
import { getSessionDestination } from "../../src/lib/supabase";

const background = require("../../assets/Fond_ecranMobile.png");
const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function TransactionDetail() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const [transaction, setTransaction] = useState<MemberTransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(""); setNotice("");
    try {
      const session = await getSessionDestination();
      if (session.destination !== "active") { router.replace("/login"); return; }
      if (session.role === "admin") { router.replace("/(admin)/dashboard"); return; }
      if (!transactionId || !validId.test(transactionId)) { setTransaction(null); return; }
      setTransaction(await getMyMemberTransaction(transactionId));
    } catch { setError("Impossible de charger cette transaction."); }
    finally { setLoading(false); }
  }, [transactionId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const share = async () => {
    if (!transaction || busy) return;
    setBusy(true); setNotice("");
    try { const result = await shareTransaction(transaction); if (result === "copied") setNotice("Récapitulatif copié. Vous pouvez le coller pour le partager."); }
    catch { setNotice("Le partage n’a pas pu être effectué."); }
    finally { setBusy(false); }
  };
  const exportPdf = async () => {
    if (!transaction || busy) return;
    setBusy(true); setNotice("");
    try { await exportTransactionPdf(transaction); }
    catch { setNotice("Impossible d’ouvrir l’export PDF."); }
    finally { setBusy(false); }
  };

  const theme = transaction?.kind === "monthly" ? styles.monthly : transaction?.kind === "exceptional" ? styles.exceptional : styles.membership;
  const color = transaction?.kind === "monthly" ? "#3659B5" : transaction?.kind === "exceptional" ? "#813E9F" : "#007D74";
  const icon = transaction?.kind === "monthly" ? "calendar" : transaction?.kind === "exceptional" ? "gift" : "user-check";
  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}><View style={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour aux transactions" onPress={() => router.replace("/transactions")} style={styles.back}><Feather name="arrow-left" size={18} color="#007D74" /><Text style={styles.backText}>Transactions</Text></Pressable>
        <Text style={styles.overline}>ESPACE MEMBRE</Text>
        <Text style={styles.title}>Détail de transaction</Text>
        {loading ? <View style={styles.state}><LoadingState label="Chargement du paiement…" /></View> : error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.link}>Réessayer</Text></Pressable></View> : !transaction ? <View style={styles.state}><Feather name="file-text" size={28} color="#8BA6A3" /><Text style={styles.muted}>Transaction introuvable ou inaccessible.</Text></View> : <>
          <View style={styles.hero}><View style={[styles.icon, theme]}><Feather name={icon} size={25} color={color} /></View><Text style={styles.heroType}>{transactionTitle(transaction)}</Text><Text style={styles.amount}>+{formatMoney(transaction.amount)}</Text><View style={styles.badge}><Feather name="check-circle" size={14} color="#007D74" /><Text style={styles.badgeText}>Paiement enregistré</Text></View></View>
          <View style={styles.details}><Text style={styles.sectionTitle}>Informations du paiement</Text><Detail label="Date" value={formatDate(transaction.paidOn)} /><Detail label="Mode de paiement" value={transactionMethod(transaction)} />{transaction.month ? <Detail label="Période" value={formatMonth(transaction.month)} /> : null}{transaction.reference ? <Detail label="Référence" value={transaction.reference} /> : null}<Detail label="Identifiant" value={transaction.id} /></View>
          <View style={styles.details}><Text style={styles.sectionTitle}>Membre et association</Text><Detail label="Membre" value={transaction.memberName} /><Detail label="Numéro" value={transaction.memberNumber} /><Detail label="Association" value={transaction.organizationName} /></View>
          <View style={styles.actions}><Pressable accessibilityRole="button" disabled={busy} onPress={() => void share()} style={styles.share}><Feather name="share-2" size={18} color="#007D74" /><Text style={styles.shareText}>Partager</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => void exportPdf()} style={styles.export}><Feather name="download" size={18} color="#FFF" /><Text style={styles.exportText}>Exporter en PDF</Text></Pressable></View>
          {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
        </>}
      </View></ImageBackground>
    </ScrollView>
    <MemberNavigation active="transactions" />
  </View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text selectable style={styles.rowValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, scroll: { flexGrow: 1 }, background: { flexGrow: 1, minHeight: "100%" }, backgroundImage: { height: "100%", resizeMode: "cover", width: "100%" }, content: { alignSelf: "center", gap: 15, maxWidth: 760, padding: 20, paddingBottom: 115, paddingTop: 26, width: "100%" },
  back: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 9 }, backText: { color: "#007D74", fontSize: 14, fontWeight: "700" }, overline: { color: "#007D74", fontSize: 11, fontWeight: "800", letterSpacing: 1.3 }, title: { color: "#102B3D", fontSize: 27, fontWeight: "800", marginTop: -8 },
  state: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 16, gap: 12, padding: 30 }, muted: { color: "#65758A", textAlign: "center" }, error: { color: "#B64337", textAlign: "center" }, link: { color: "#007D74", fontWeight: "800" },
  hero: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#E1EBE9", borderRadius: 20, borderWidth: 1, gap: 12, padding: 25 }, icon: { alignItems: "center", borderRadius: 15, height: 54, justifyContent: "center", width: 54 }, membership: { backgroundColor: "#EAF7F4" }, monthly: { backgroundColor: "#EAF0FF" }, exceptional: { backgroundColor: "#F5EAF9" }, heroType: { color: "#102B3D", fontSize: 15, fontWeight: "800", textAlign: "center" }, amount: { color: "#007D74", fontSize: 31, fontWeight: "800" }, badge: { alignItems: "center", backgroundColor: "#EAF7F4", borderRadius: 20, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 7 }, badgeText: { color: "#007D74", fontSize: 12, fontWeight: "700" },
  details: { backgroundColor: "#FFF", borderColor: "#E1EBE9", borderRadius: 17, borderWidth: 1, padding: 17 }, sectionTitle: { color: "#102B3D", fontSize: 15, fontWeight: "800", marginBottom: 8 }, row: { borderBottomColor: "#EEF2F2", borderBottomWidth: 1, flexDirection: "row", gap: 14, justifyContent: "space-between", paddingVertical: 12 }, rowLabel: { color: "#65758A", flex: 1, fontSize: 12 }, rowValue: { color: "#102B3D", flex: 1.5, fontSize: 12, fontWeight: "700", textAlign: "right" },
  actions: { flexDirection: "row", gap: 10 }, share: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#BBDDD7", borderRadius: 13, borderWidth: 1, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", padding: 14 }, shareText: { color: "#007D74", fontSize: 13, fontWeight: "800" }, export: { alignItems: "center", backgroundColor: "#007D74", borderRadius: 13, flex: 1.2, flexDirection: "row", gap: 8, justifyContent: "center", padding: 14 }, exportText: { color: "#FFF", fontSize: 13, fontWeight: "800" }, notice: { color: "#007D74", fontSize: 12, textAlign: "center" },
});
