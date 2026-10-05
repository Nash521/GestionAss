import { LoadingState, LoadingLabel } from "../../src/components/loading-state";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AdminHeader } from "../../src/components/admin-chrome";
import { useAdminHeaderScroll } from "../../src/components/use-admin-header-scroll";
import { formatFinanceDate } from "../../src/lib/date-format";
import { AdminFinance, Disbursement, ExceptionalContribution, FinanceTab, getAdminFinance } from "../../src/lib/supabase";

type Tab = Exclude<FinanceTab, "monthly">;
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);

export default function AdminFinances() {
  const { headerTranslateY, handleHeaderScroll } = useAdminHeaderScroll();
  const [tab, setTab] = useState<Tab>("exceptional");
  const [loadedTab, setLoadedTab] = useState<Tab | null>(null);
  const [data, setData] = useState<AdminFinance | null>(null);
  const [items, setItems] = useState<Array<AdminFinance["items"][number]>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const sequence = useRef(0);
  const load = useCallback(async (offset = 0) => {
    const id = ++sequence.current;
    if (offset === 0) { setLoading(true); setError(false); setItems([]); } else setLoadingMore(true);
    try {
      const result = await getAdminFinance(tab, offset, 20);
      if (id !== sequence.current) return;
      setData(result); setLoadedTab(tab);
      setItems((current) => offset === 0 ? [...result.items] : [...current, ...result.items]);
    } catch { if (id === sequence.current) setError(true); }
    finally { if (id === sequence.current) { setLoading(false); setLoadingMore(false); } }
  }, [tab]);
  useFocusEffect(useCallback(() => { void load(); return () => { sequence.current++; }; }, [load]));

  const expense = tab === "disbursements";
  const summary = data?.summary ?? {};
  const busy = loading || (!error && loadedTab !== tab);
  const openForm = () => router.push({ pathname: "/(admin)/finances/new", params: { kind: expense ? "disbursement" : "exceptional" } });

  return <View style={styles.page}><ScrollView onScroll={handleHeaderScroll} scrollEventThrottle={16} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.heading}><Text style={styles.kicker}>GESTION FINANCIÈRE</Text><Text style={styles.title}>Finances</Text><Text style={styles.subtitle}>Suivez les entrées et les sorties de l’association.</Text></View>
    <View style={styles.tabs}>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: !expense }} onPress={() => setTab("exceptional")} style={[styles.tab, !expense && styles.tabActive]}><Feather name="gift" size={16} color={!expense ? "#FFF" : "#65758A"} /><Text style={[styles.tabText, !expense && styles.tabTextActive]}>Cotisations</Text></Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: expense }} onPress={() => setTab("disbursements")} style={[styles.tab, expense && styles.tabActive]}><Feather name="arrow-up-right" size={16} color={expense ? "#FFF" : "#65758A"} /><Text style={[styles.tabText, expense && styles.tabTextActive]}>Décaissements</Text></Pressable>
    </View>
    <View style={[styles.hero, expense && styles.heroExpense]}>
      <View style={styles.heroHeading}><View style={styles.heroIcon}><Feather name={expense ? "arrow-up-right" : "trending-up"} size={21} color="#FFF" /></View><Text style={styles.heroKicker}>{expense ? "SORTIES ENREGISTRÉES" : "COTISATIONS EXCEPTIONNELLES"}</Text></View>
      <Text style={styles.heroValue}>{money(expense ? summary.totalDisbursed ?? 0 : summary.totalCollected ?? 0)}</Text><Text style={styles.heroCaption}>{expense ? "Total décaissé" : "Total encaissé"}</Text>
      {!expense ? <View style={styles.heroStats}><View><Text style={styles.heroStatLabel}>Reste à encaisser</Text><Text style={styles.heroStatValue}>{money(summary.totalRemaining ?? 0)}</Text></View><View style={styles.heroDivider} /><View><Text style={styles.heroStatLabel}>Cibles</Text><Text style={styles.heroStatValue}>{summary.targetCount ?? 0}</Text></View></View> : null}
    </View>
    <Pressable accessibilityRole="button" onPress={openForm} style={styles.primary}><View style={styles.primaryIcon}><Feather name="plus" size={19} color="#087C70" /></View><Text style={styles.primaryText}>{expense ? "Nouveau décaissement" : "Créer une cotisation"}</Text><Feather name="arrow-right" size={18} color="#FFF" /></Pressable>
    <View style={styles.section}><View><Text style={styles.sectionTitle}>{expense ? "Décaissements récents" : "Cotisations récentes"}</Text><Text style={styles.sectionSubtitle}>{expense ? "Historique des sorties de trésorerie" : "Échéances et montants demandés"}</Text></View>{!busy && !error ? <Text style={styles.count}>{data?.metadata.total ?? 0}</Text> : null}</View>
    {busy ? <LoadingState label="Chargement des finances…" /> : error ? <View style={styles.empty}><Feather name="alert-circle" size={28} color="#A45747" /><Text style={styles.message}>Impossible de charger les finances.</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}><Text style={styles.retryText}>Réessayer</Text></Pressable></View> : items.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><Feather name={expense ? "inbox" : "gift"} size={25} color="#087C70" /></View><Text style={styles.emptyTitle}>Aucune opération</Text><Text style={styles.emptyText}>{expense ? "Les décaissements enregistrés apparaîtront ici." : "Les cotisations créées apparaîtront ici."}</Text></View> : <View style={styles.list}>{items.map((item, index) => <FinanceCard key={(item as { id?: string }).id ?? index} tab={tab} item={item as ExceptionalContribution | Disbursement} />)}{data && items.length < data.metadata.total ? <Pressable accessibilityRole="button" style={styles.more} disabled={loadingMore} onPress={() => void load(items.length)}><LoadingLabel loading={!!(loadingMore)} style={styles.moreText}>{loadingMore ? "Chargement…" : "Afficher plus"}</LoadingLabel><Feather name="chevron-down" size={16} color="#087C70" /></Pressable> : null}</View>}
  </ScrollView><AdminHeader translateY={headerTranslateY} /></View>;
}

function FinanceCard({ tab, item }: { tab: Tab; item: ExceptionalContribution | Disbursement }) {
  const expense = tab === "disbursements";
  const date = expense ? (item as Disbursement).disbursedOn : (item as ExceptionalContribution).dueDate;
  const expenseType = expense ? (item as Disbursement).type : "";
  const category = expense ? expenseType === "member_aid" ? "Aide à un membre" : expenseType === "exceptional_contribution_payment" ? "Cotisation exceptionnelle" : "Dépense générale" : "Cotisation exceptionnelle";
  return <Pressable accessibilityRole={expense ? undefined : "button"} accessibilityLabel={expense ? undefined : `Voir le détail de ${item.label}`} disabled={expense} onPress={() => router.push({ pathname: "/(admin)/finances/[contributionId]", params: { contributionId: item.id } })} style={styles.card}><View style={[styles.cardIcon, expense && styles.cardIconExpense]}><Feather name={expense ? "arrow-up-right" : "gift"} size={20} color={expense ? "#B4613F" : "#087C70"} /></View><View style={styles.cardBody}><Text style={styles.cardTitle} numberOfLines={2}>{item.label}</Text><Text style={styles.cardMeta}>{category}</Text><View style={styles.dateRow}><Feather name="calendar" size={12} color="#82949C" /><Text style={styles.cardDate}>{formatFinanceDate(date)}</Text></View></View><Text style={[styles.cardAmount, expense && styles.cardAmountExpense]}>{expense ? "− " : "+ "}{money(item.amount)}</Text>{!expense ? <Feather name="chevron-right" size={16} color="#087C70" /> : null}</Pressable>;
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#F6F9F8", flex: 1 }, content: { alignSelf: "center", gap: 21, maxWidth: 800, paddingBottom: 110, paddingHorizontal: 20, paddingTop: 112, width: "100%" },
  heading: { gap: 7 }, kicker: { color: "#087C70", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }, title: { color: "#102B3D", fontSize: 34, fontWeight: "800" }, subtitle: { color: "#6D818A", fontSize: 13, lineHeight: 20 },
  tabs: { backgroundColor: "#E9F0ED", borderRadius: 17, flexDirection: "row", gap: 5, padding: 5 }, tab: { alignItems: "center", borderRadius: 13, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 47, paddingHorizontal: 7 }, tabActive: { backgroundColor: "#075E58", elevation: 2 }, tabText: { color: "#65758A", fontSize: 12, fontWeight: "800" }, tabTextActive: { color: "#FFF" },
  hero: { backgroundColor: "#075E58", borderRadius: 23, gap: 5, padding: 22 }, heroExpense: { backgroundColor: "#173E4D" }, heroHeading: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 13 }, heroIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,.17)", borderRadius: 11, height: 38, justifyContent: "center", width: 38 }, heroKicker: { color: "#BFE8DF", fontSize: 10, fontWeight: "800", letterSpacing: 1 }, heroValue: { color: "#FFF", fontSize: 31, fontWeight: "800" }, heroCaption: { color: "#C4E8E1", fontSize: 12 }, heroStats: { borderTopColor: "rgba(255,255,255,.18)", borderTopWidth: 1, flexDirection: "row", gap: 25, marginTop: 17, paddingTop: 15 }, heroStatLabel: { color: "#B8DBD4", fontSize: 11 }, heroStatValue: { color: "#FFF", fontSize: 16, fontWeight: "800", marginTop: 4 }, heroDivider: { backgroundColor: "rgba(255,255,255,.2)", width: 1 },
  primary: { alignItems: "center", backgroundColor: "#00A98F", borderRadius: 16, flexDirection: "row", gap: 12, minHeight: 59, paddingHorizontal: 14 }, primaryIcon: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 10, height: 34, justifyContent: "center", width: 34 }, primaryText: { color: "#FFF", flex: 1, fontSize: 14, fontWeight: "800" },
  section: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, sectionTitle: { color: "#102B3D", fontSize: 18, fontWeight: "800" }, sectionSubtitle: { color: "#7D9099", fontSize: 11, marginTop: 3 }, count: { backgroundColor: "#E4F3EE", borderRadius: 12, color: "#087C70", fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 },
  list: { gap: 10 }, card: { alignItems: "flex-start", backgroundColor: "#FFF", borderColor: "#E8EFED", borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 11, padding: 14 }, cardIcon: { alignItems: "center", backgroundColor: "#E4F5EF", borderRadius: 12, height: 42, justifyContent: "center", width: 42 }, cardIconExpense: { backgroundColor: "#FFF0E8" }, cardBody: { flex: 1, gap: 4 }, cardTitle: { color: "#173343", fontSize: 13, fontWeight: "800" }, cardMeta: { color: "#738690", fontSize: 11, textTransform: "capitalize" }, dateRow: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: 5 }, cardDate: { color: "#82949C", fontSize: 11 }, cardAmount: { color: "#087C70", fontSize: 12, fontWeight: "800", textAlign: "right" }, cardAmountExpense: { color: "#B4613F" },
  empty: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#E8EFED", borderRadius: 18, borderWidth: 1, gap: 7, padding: 30 }, emptyIcon: { alignItems: "center", backgroundColor: "#E9F7F1", borderRadius: 25, height: 50, justifyContent: "center", width: 50 }, emptyTitle: { color: "#173343", fontSize: 15, fontWeight: "800" }, emptyText: { color: "#7D9099", fontSize: 12, textAlign: "center" }, message: { color: "#738690", paddingVertical: 12, textAlign: "center" }, retry: { backgroundColor: "#E9F7F1", borderRadius: 10, paddingHorizontal: 15, paddingVertical: 9 }, retryText: { color: "#087C70", fontWeight: "800" }, more: { alignItems: "center", borderColor: "#CAE4DA", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", padding: 14 }, moreText: { color: "#087C70", fontWeight: "800" },
});
