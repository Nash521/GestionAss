import { LoadingState } from "../../../src/components/loading-state";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AdminHeader } from "../../../src/components/admin-chrome";
import { useAdminHeaderScroll } from "../../../src/components/use-admin-header-scroll";
import { getExceptionalContributionDetail, type ExceptionalContributionDetail, type ExceptionalMemberDue, type ExceptionalStatusFilter } from "../../../src/features/finance/exceptional-detail";
import { formatFinanceDate } from "../../../src/lib/date-format";

const money = (amount: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
const labels = { all: "Tous", paid: "Payé", partial: "Partiel", unpaid: "Non payé" };
const filters: ExceptionalStatusFilter[] = ["all", "paid", "partial", "unpaid"];

export default function ExceptionalDetail() {
  const { headerTranslateY, handleHeaderScroll } = useAdminHeaderScroll();
  const { contributionId } = useLocalSearchParams<{ contributionId: string }>();
  const [filter, setFilter] = useState<ExceptionalStatusFilter>("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const [data, setData] = useState<ExceptionalContributionDetail | null>(null);
  const [items, setItems] = useState<ExceptionalMemberDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [moreError, setMoreError] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const sequence = useRef(0);
  const key = JSON.stringify([contributionId, filter, search]);

  const load = useCallback(async (offset = 0, refresh = false) => {
    const requestId = ++sequence.current;
    if (offset > 0) { setLoadingMore(true); setMoreError(""); }
    else { setError(""); setMoreError(""); if (refresh) setRefreshing(true); else { setLoading(true); setItems([]); } }
    try {
      const result = await getExceptionalContributionDetail(contributionId, filter, offset, search);
      if (requestId !== sequence.current) return;
      setData(result); setLoadedKey(JSON.stringify([contributionId, filter, search]));
      setItems((current) => result ? offset ? [...current, ...result.items] : result.items : []);
    } catch {
      if (requestId === sequence.current) {
        if (offset) setMoreError("Impossible de charger la suite.");
        else setError("Impossible de charger cette cotisation.");
      }
    } finally {
      if (requestId === sequence.current) { setLoading(false); setRefreshing(false); setLoadingMore(false); }
    }
  }, [contributionId, filter, search]);
  useFocusEffect(useCallback(() => { void load(); return () => { sequence.current++; }; }, [load]));

  const summary = data?.summary;
  const busy = loading || (!error && loadedKey !== key) || query.trim() !== search;
  const collectedPercent = summary && summary.totalExpected > 0 ? Math.min(100, Math.round(summary.totalCollected / summary.totalExpected * 100)) : 0;
  const counts = summary ? { all: summary.memberCount, paid: summary.paidCount, partial: summary.partialCount, unpaid: summary.unpaidCount } : null;

  return <View style={styles.page}><ScrollView onScroll={handleHeaderScroll} scrollEventThrottle={16} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(0, true)} tintColor="#087C70" />}>
    <Pressable accessibilityRole="button" onPress={() => router.replace("/(admin)/finances")} style={styles.back}><Feather name="arrow-left" size={18} color="#087C70" /><Text style={styles.backText}>Finances</Text></Pressable>
    <Text style={styles.kicker}>COTISATION EXCEPTIONNELLE</Text>
    {loading && (!data || data.contribution.id !== contributionId) ? <LoadingState label="Chargement de la cotisation…" /> : error && !data ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.backText}>Réessayer</Text></Pressable></View> : !data || !summary || !counts || data.contribution.id !== contributionId ? <View style={styles.state}><Text style={styles.message}>Cette cotisation est introuvable.</Text></View> : <>
      <View style={styles.heading}><Text style={styles.title}>{data.contribution.label}</Text><Text style={styles.subtitle}>{money(data.contribution.amount)} par membre · Échéance : {formatFinanceDate(data.contribution.dueDate)}</Text><Text style={styles.subtitle}>{summary.memberCount} membres concernés</Text></View>
      <View style={styles.hero}><Text style={styles.heroLabel}>MONTANT ENCAISSÉ</Text><Text style={styles.heroValue}>{money(summary.totalCollected)}</Text><Text style={styles.heroCaption}>sur {money(summary.totalExpected)} attendus</Text>
        <View accessibilityRole="progressbar" accessibilityLabel="Montant encaissé" accessibilityValue={{ min: 0, max: 100, now: collectedPercent }} style={styles.track}><View style={[styles.progress, { width: `${collectedPercent}%` }]} /></View>
        <Text style={styles.heroCaption}>{collectedPercent} % du montant attendu encaissé</Text><View style={styles.remaining}><Text style={styles.heroCaption}>Reste à encaisser</Text><Text style={styles.remainingValue}>{money(summary.totalRemaining)}</Text></View>
      </View>
      <View style={styles.stats}>
        <Stat label="Payé en totalité" value={summary.paidCount} color="#087C70" background="#E4F5EF" />
        <Stat label="Paiement partiel" value={summary.partialCount} color="#A46300" background="#FFF0D6" />
        <Stat label="Aucun paiement" value={summary.unpaidCount} color="#B64337" background="#FDE7E4" />
      </View>
      <Text style={styles.sectionTitle}>Suivi des membres</Text>
      <View style={styles.search}><Feather name="search" size={18} color="#65758A" /><TextInput accessibilityLabel="Rechercher un membre" placeholder="Nom, prénom ou numéro de membre" placeholderTextColor="#8A98A8" value={query} onChangeText={setQuery} autoCorrect={false} style={styles.searchInput} />{query ? <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" onPress={() => setQuery("")} style={styles.clear}><Feather name="x" size={18} color="#65758A" /></Pressable> : null}</View>
      <View style={styles.filters}>{filters.map((status) => <Pressable key={status} accessibilityRole="button" accessibilityState={{ selected: filter === status }} onPress={() => setFilter(status)} style={[styles.filter, filter === status && styles.filterActive]}><Text style={[styles.filterText, filter === status && styles.filterTextActive]}>{labels[status]} ({counts[status]})</Text></Pressable>)}</View>
      {busy ? <LoadingState label="Chargement des membres…" /> : error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.backText}>Réessayer</Text></Pressable></View> : items.length === 0 ? <View style={styles.state}><Text style={styles.message}>{search ? "Aucun membre ne correspond à cette recherche dans la catégorie sélectionnée." : summary.memberCount === 0 ? "Aucun membre n’est affecté à cette cotisation." : "Aucun membre dans cette catégorie."}</Text></View> : <View style={styles.list}>{items.map((item) => <View key={item.id} style={styles.card}>
        <View style={styles.cardHeading}><View style={styles.identity}><Text style={styles.memberName}>{item.firstName} {item.lastName}</Text><Text style={styles.subtitle}>{item.memberNumber}</Text></View><Text style={[styles.badge, item.status === "paid" ? styles.paid : item.status === "partial" ? styles.partial : styles.unpaid]}>{labels[item.status]}</Text></View>
        <View style={styles.amounts}><View style={styles.amountColumn}><Text style={styles.amountLabel}>Montant dû</Text><Text style={styles.amount}>{money(item.amountDue)}</Text></View><View style={styles.amountColumn}><Text style={styles.amountLabel}>Réglé</Text><Text style={[styles.amount, styles.collected]}>{money(item.amountPaid)}</Text></View><View style={styles.amountColumn}><Text style={styles.amountLabel}>Reste</Text><Text style={styles.amount}>{money(item.amountRemaining)}</Text></View></View>
      </View>)}</View>}
      {moreError ? <Text accessibilityRole="alert" style={styles.error}>{moreError}</Text> : null}
      {!busy && !error && items.length < data.metadata.total ? <Pressable accessibilityRole="button" disabled={loadingMore || refreshing} onPress={() => void load(items.length)} style={styles.more}><Text style={styles.backText}>{loadingMore ? "Chargement…" : moreError ? "Réessayer" : `Afficher plus (${items.length}/${data.metadata.total})`}</Text></Pressable> : null}
    </>}
  </ScrollView><AdminHeader translateY={headerTranslateY} /></View>;
}

function Stat({ label, value, color, background }: { label: string; value: number; color: string; background: string }) {
  return <View style={[styles.stat, { backgroundColor: background }]}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={[styles.statLabel, { color }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F6F9F8" }, content: { alignSelf: "center", width: "100%", maxWidth: 800, paddingHorizontal: 20, paddingTop: 112, paddingBottom: 115, gap: 17 },
  back: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", minHeight: 40 }, backText: { color: "#087C70", fontWeight: "800", fontSize: 13 }, kicker: { color: "#087C70", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }, heading: { gap: 7 }, title: { color: "#102B3D", fontSize: 27, fontWeight: "800" }, subtitle: { color: "#6D818A", fontSize: 12, lineHeight: 19 },
  hero: { backgroundColor: "#075E58", borderRadius: 23, padding: 22, gap: 8 }, heroLabel: { color: "#BFE8DF", fontSize: 10, fontWeight: "800", letterSpacing: 1 }, heroValue: { color: "#FFF", fontSize: 30, fontWeight: "800" }, heroCaption: { color: "#C4E8E1", fontSize: 12 }, track: { backgroundColor: "rgba(255,255,255,.2)", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 10 }, progress: { backgroundColor: "#52DFC2", height: "100%", borderRadius: 4 }, remaining: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.2)", marginTop: 9, paddingTop: 14, gap: 5 }, remainingValue: { color: "#FFF", fontSize: 21, fontWeight: "800" },
  stats: { flexDirection: "row", gap: 8 }, stat: { flex: 1, borderRadius: 14, padding: 12, gap: 5 }, statValue: { fontSize: 25, fontWeight: "800" }, statLabel: { fontSize: 11, lineHeight: 16, fontWeight: "700" }, sectionTitle: { color: "#102B3D", fontSize: 18, fontWeight: "800" }, filters: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, filter: { backgroundColor: "#E9F0ED", borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11 }, filterActive: { backgroundColor: "#075E58" }, filterText: { color: "#65758A", fontSize: 12, fontWeight: "700" }, filterTextActive: { color: "#FFF" },
  search: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF", borderColor: "#E8EFED", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 50 }, searchInput: { flex: 1, minWidth: 0, color: "#173343", fontSize: 13, paddingVertical: 12 }, clear: { padding: 7 },
  list: { gap: 10 }, card: { backgroundColor: "#FFF", borderColor: "#E8EFED", borderWidth: 1, borderRadius: 17, padding: 15, gap: 14 }, cardHeading: { flexDirection: "row", alignItems: "flex-start", gap: 8 }, identity: { flex: 1, gap: 3 }, memberName: { color: "#173343", fontSize: 14, fontWeight: "800" }, badge: { fontSize: 10, fontWeight: "800", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, overflow: "hidden" }, paid: { backgroundColor: "#E4F5EF", color: "#087C70" }, partial: { backgroundColor: "#FFF0D6", color: "#A46300" }, unpaid: { backgroundColor: "#FDE7E4", color: "#B64337" }, amounts: { borderTopWidth: 1, borderTopColor: "#E8EFED", paddingTop: 12, flexDirection: "row", gap: 8 }, amountColumn: { flex: 1, gap: 4 }, amountLabel: { fontSize: 10, color: "#738690" }, amount: { fontSize: 12, fontWeight: "800", color: "#173343" }, collected: { color: "#087C70" },
  state: { backgroundColor: "#FFF", borderRadius: 17, padding: 25, alignItems: "center", gap: 15 }, message: { color: "#738690", textAlign: "center", paddingVertical: 12 }, error: { color: "#B64337", fontSize: 13 }, more: { borderColor: "#CAE4DA", borderWidth: 1, borderRadius: 13, padding: 15, alignItems: "center" },
});
