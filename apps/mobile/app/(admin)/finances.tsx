import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminHeader, AdminNavigation } from "../../src/components/admin-chrome";
import { AdminFinance, Disbursement, ExceptionalContribution, FinanceTab, MonthlyDue, getAdminFinance } from "../../src/lib/supabase";

const background = require("../../assets/Fond_ecranMobile.png");
const PAGE_SIZE = 20;
const tabs: Array<{ key: FinanceTab; label: string }> = [
  { key: "monthly", label: "Mensualités" },
  { key: "exceptional", label: "Cotisations exceptionnelles" },
  { key: "disbursements", label: "Décaissements" },
];
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));

export default function AdminFinances() {
  const [tab, setTab] = useState<FinanceTab>("monthly");
  const [data, setData] = useState<AdminFinance | null>(null);
  const [items, setItems] = useState<Array<MonthlyDue | ExceptionalContribution | Disbursement>>([]);
  const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState(false);
  const requestSequence = useRef(0);
  const load = useCallback(async (offset = 0) => {
    const requestId = ++requestSequence.current;
    if (offset === 0) { setLoading(true); setError(false); setItems([]); } else setLoadingMore(true);
    try {
      const result = await getAdminFinance(tab, offset, PAGE_SIZE);
      if (requestId !== requestSequence.current) return;
      setData(result); setItems((current) => offset === 0 ? [...result.items] : [...current, ...result.items]);
    } catch { if (requestId === requestSequence.current) setError(true); }
    finally { if (requestId === requestSequence.current) { setLoading(false); setLoadingMore(false); } }
  }, [tab]);
  useEffect(() => { void load(); return () => { requestSequence.current++; }; }, [load]);
  const primaryLabel = tab === "monthly" ? "Générer les mensualités" : tab === "exceptional" ? "Créer une cotisation" : "Enregistrer un décaissement";
  const primary = () => router.push("/(admin)/finances/new");
  return <View style={styles.page}><ScrollView showsVerticalScrollIndicator={false}><ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}><View style={styles.content}>
    <Text style={styles.kicker}>Gestion de l’association</Text><Text style={styles.title}>Finances</Text><Text style={styles.subtitle}>Suivez les cotisations et les sorties de trésorerie.</Text>
    <View style={styles.tabs}>{tabs.map((entry) => <Pressable key={entry.key} onPress={() => setTab(entry.key)} style={[styles.tab, tab === entry.key && styles.activeTab]}><Text style={[styles.tabText, tab === entry.key && styles.activeTabText]}>{entry.label}</Text></Pressable>)}</View>
    <Pressable style={styles.primary} onPress={primary}><Feather name="plus" size={19} color="#FFF" /><Text style={styles.primaryText}>{primaryLabel}</Text></Pressable>
    {loading ? <Text style={styles.message}>Chargement des finances…</Text> : error ? <View style={styles.state}><Text style={styles.message}>Impossible de charger les finances.</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>Réessayer</Text></Pressable></View> : <>
      <Summary tab={tab} summary={data?.summary ?? {}} />
      {items.length === 0 ? <Text style={styles.message}>Aucune opération pour le moment.</Text> : <View style={styles.list}>{items.map((item, index) => <FinanceCard key={(item as { id?: string }).id ?? index} tab={tab} item={item} />)}{data && items.length < data.metadata.total ? <Pressable style={styles.more} disabled={loadingMore} onPress={() => void load(items.length)}><Text style={styles.moreText}>{loadingMore ? "Chargement…" : "Voir plus"}</Text></Pressable> : null}</View>}
    </>}
  </View></ImageBackground></ScrollView><AdminHeader /><AdminNavigation active="finances" /></View>;
}

function Summary({ tab, summary }: { tab: FinanceTab; summary: Record<string, number> }) { const values = tab === "monthly" ? [["totalExpected", "Total attendu"], ["totalPaid", "Total encaissé"], ["totalRemaining", "Reste à encaisser"]] : tab === "exceptional" ? [["totalCollected", "Total encaissé"], ["totalRemaining", "Reste à encaisser"], ["targetCount", "Cibles"]] : [["totalDisbursed", "Total décaissé"]]; return <View style={styles.stats}>{values.map(([key, label]) => <View key={key} style={styles.stat}><Text style={styles.statValue}>{key === "targetCount" ? String(summary[key] ?? 0) : money(summary[key] ?? 0)}</Text><Text style={styles.statLabel}>{label}</Text></View>)}</View>; }
// Monthly RPC items include memberId, firstName, lastName and phone for identity-aware reminders.
function FinanceCard({ tab, item }: { tab: FinanceTab; item: AdminFinance["items"][number] }) {
  if (tab === "monthly") { const due = item as MonthlyDue; return <View style={styles.card}><View style={styles.cardTop}><Text style={styles.cardTitle}>{due.month}</Text><Status status={due.status} /></View><Text style={styles.cardMeta}>Échéance {date(due.dueDate)}</Text><View style={styles.amounts}><Text style={styles.amount}>{money(due.amountPaid)} / {money(due.amountDue)}</Text><Text style={styles.remaining}>{due.amountRemaining > 0 ? `Reste ${money(due.amountRemaining)}` : "Réglée"}</Text></View><Reminder item={due} /></View>; }
  if (tab === "exceptional") { const contribution = item as ExceptionalContribution; return <View style={styles.card}><View style={styles.cardTop}><Text style={styles.cardTitle}>{contribution.label}</Text><Text style={styles.amount}>{money(contribution.amount)}</Text></View><Text style={styles.cardMeta}>Échéance {date(contribution.dueDate)}</Text></View>; }
  const disbursement = item as Disbursement; return <View style={styles.card}><View style={styles.cardTop}><Text style={styles.cardTitle}>{disbursement.label}</Text><Text style={styles.amount}>− {money(disbursement.amount)}</Text></View><Text style={styles.cardMeta}>{date(disbursement.disbursedOn)} · {disbursement.type.replaceAll("_", " ")}</Text></View>;
}
function Status({ status }: { status: string }) { const label = status === "paid" ? "Réglée" : status === "partial" ? "Partielle" : "En retard"; return <Text style={[styles.chip, status === "paid" ? styles.paid : status === "partial" ? styles.partial : styles.unpaid]}>{label}</Text>; }
function Reminder({ item }: { item: MonthlyDue & { phone?: string; firstName?: string } }) { const phone = item.phone?.replace(/[^\d+]/g, ""); if (!phone || !/^\+?[1-9]\d{7,14}$/.test(phone)) return null; const message = `Bonjour${item.firstName ? ` ${item.firstName}` : ""}, rappel de votre cotisation mensuelle (${item.month}).`; return <Pressable style={styles.reminder} onPress={() => void Linking.openURL(`https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`)}><Feather name="message-circle" size={15} color="#007D74" /><Text style={styles.reminderText}>Relancer sur WhatsApp</Text></Pressable>; }

const styles = StyleSheet.create({ page: { flex: 1 }, background: { minHeight: "100%" }, backgroundImage: { resizeMode: "cover" }, content: { gap: 13, padding: 20, paddingBottom: 112, paddingTop: 116 }, kicker: { color: "#65758A", fontSize: 13 }, title: { color: "#102B3D", fontSize: 30, fontWeight: "800" }, subtitle: { color: "#65758A", fontSize: 14, lineHeight: 20 }, tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, tab: { backgroundColor: "rgba(255,255,255,.9)", borderColor: "#DDE6E8", borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 }, activeTab: { backgroundColor: "#E1F7F1", borderColor: "#00A99D" }, tabText: { color: "#65758A", fontSize: 12, fontWeight: "700" }, activeTabText: { color: "#007D74" }, primary: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50 }, primaryText: { color: "#FFF", fontWeight: "800" }, stats: { flexDirection: "row", gap: 9 }, stat: { backgroundColor: "rgba(255,255,255,.96)", borderRadius: 15, flex: 1, padding: 14 }, statValue: { color: "#102B3D", fontSize: 17, fontWeight: "800" }, statLabel: { color: "#65758A", fontSize: 11, marginTop: 5 }, list: { gap: 10 }, card: { backgroundColor: "rgba(255,255,255,.97)", borderRadius: 16, padding: 14 }, cardTop: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" }, cardTitle: { color: "#102B3D", flex: 1, fontWeight: "800" }, cardMeta: { color: "#65758A", fontSize: 12, marginTop: 6 }, amounts: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 10 }, amount: { color: "#102B3D", fontWeight: "800" }, remaining: { color: "#65758A", fontSize: 12 }, chip: { borderRadius: 9, fontSize: 10, fontWeight: "800", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 }, paid: { backgroundColor: "#E1F7F1", color: "#007D74" }, partial: { backgroundColor: "#FFF2D9", color: "#A46300" }, unpaid: { backgroundColor: "#FDE7E4", color: "#C75042" }, reminder: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#E1F7F1", borderRadius: 10, flexDirection: "row", gap: 6, marginTop: 11, paddingHorizontal: 9, paddingVertical: 7 }, reminderText: { color: "#007D74", fontSize: 11, fontWeight: "700" }, state: { alignItems: "center", gap: 8 }, message: { color: "#65758A", padding: 24, textAlign: "center" }, retry: { color: "#00A99D", fontWeight: "800" }, more: { alignItems: "center", borderColor: "#00A99D", borderRadius: 12, borderWidth: 1, padding: 13 }, moreText: { color: "#007D74", fontWeight: "800" } });
