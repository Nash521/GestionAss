import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { MemberNavigation } from "../src/components/member-navigation";
import { getMyMemberTransactions, type MemberTransaction } from "../src/features/member-account/api";
import { getSessionDestination } from "../src/lib/supabase";

const background = require("../assets/Fond_ecranMobile.png");
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
const dateLabel = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
const monthLabel = (value: string) => new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${value.slice(0, 7)}-01T00:00:00`));

export default function Transactions() {
  const [items, setItems] = useState<MemberTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const reload = useCallback(async (refresh = false) => {
    const requestId = ++requestSequence.current;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const session = await getSessionDestination();
      if (requestId !== requestSequence.current) return;
      if (session.destination !== "active") { router.replace("/login"); return; }
      if (session.role === "admin") { router.replace("/(admin)/dashboard"); return; }
      const page = await getMyMemberTransactions();
      if (requestId === requestSequence.current) { setItems(page.items); setTotal(page.total); }
    } catch {
      if (requestId === requestSequence.current) setError("Impossible de charger vos transactions.");
    } finally {
      if (requestId === requestSequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useFocusEffect(useCallback(() => { void reload(); return () => { requestSequence.current++; }; }, [reload]));

  const loadMore = async () => {
    if (loadingMore || items.length >= total) return;
    const requestId = ++requestSequence.current;
    setLoadingMore(true); setError("");
    try {
      const page = await getMyMemberTransactions(items.length);
      if (requestId === requestSequence.current) { setItems((current) => [...current, ...page.items]); setTotal(page.total); }
    } catch {
      if (requestId === requestSequence.current) setError("Impossible de charger la suite des transactions.");
    } finally {
      if (requestId === requestSequence.current) setLoadingMore(false);
    }
  };

  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void reload(true)} tintColor="#00A99D" />}>
      <ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}><View style={styles.content}>
        <Text style={styles.overline}>ESPACE MEMBRE</Text>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>Tous les paiements enregistrés pour votre compte.</Text>
        <View style={styles.summary}><View style={styles.summaryIcon}><Feather name="credit-card" size={22} color="#007D74" /></View><View><Text style={styles.summaryValue}>{total}</Text><Text style={styles.summaryLabel}>paiement{total > 1 ? "s" : ""} enregistré{total > 1 ? "s" : ""}</Text></View></View>
        {error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void reload()}><Text style={styles.retry}>Réessayer</Text></Pressable></View> : null}
        {loading ? <View style={styles.state}><Text style={styles.stateText}>Chargement de vos transactions…</Text></View> : items.length === 0 && !error ? <View style={styles.state}><Feather name="inbox" size={30} color="#8BA6A3" /><Text style={styles.stateText}>Aucun paiement enregistré pour le moment.</Text></View> : null}
        {!loading ? <View style={styles.list}>{items.map((item) => <TransactionCard key={item.id} item={item} />)}</View> : null}
        {!loading && items.length < total ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void loadMore()} style={styles.more}><Text style={styles.moreText}>{loadingMore ? "Chargement…" : "Voir plus de transactions"}</Text></Pressable> : null}
      </View></ImageBackground>
    </ScrollView>
    <MemberNavigation active="transactions" />
  </View>;
}

function TransactionCard({ item }: { item: MemberTransaction }) {
  const icon = item.kind === "membership" ? "user-check" : item.kind === "monthly" ? "calendar" : "gift";
  const iconStyle = item.kind === "monthly" ? styles.monthlyIcon : item.kind === "exceptional" ? styles.exceptionalIcon : styles.membershipIcon;
  const iconColor = item.kind === "monthly" ? "#3659B5" : item.kind === "exceptional" ? "#813E9F" : "#007D74";
  const title = item.kind === "exceptional" ? `Cotisation exceptionnelle · ${item.label}` : item.kind === "monthly" && item.month ? `Mensualité · ${monthLabel(item.month)}` : item.label;
  const method = item.paymentSource === "wave" ? "Wave" : "Espèces";
  return <Pressable style={styles.card} accessibilityRole="button" accessibilityLabel={`Voir le détail : ${title}, ${money(item.amount)}, ${dateLabel(item.paidOn)}, ${method}`} onPress={() => router.push({ pathname: "/transactions/[transactionId]", params: { transactionId: item.id } })}>
    <View style={[styles.icon, iconStyle]}><Feather name={icon} size={21} color={iconColor} /></View>
    <View style={styles.cardBody}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardMeta}>{dateLabel(item.paidOn)} · {method}</Text>{item.reference ? <Text style={styles.reference}>Réf. {item.reference}</Text> : null}</View>
    <Text style={styles.amount}>+{money(item.amount)}</Text>
    <Feather name="chevron-right" size={16} color="#84939D" />
  </Pressable>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, scroll: { flexGrow: 1 }, background: { flexGrow: 1, minHeight: "100%" }, backgroundImage: { height: "100%", resizeMode: "cover", width: "100%" }, content: { alignSelf: "center", gap: 15, maxWidth: 760, padding: 20, paddingBottom: 115, paddingTop: 34, width: "100%" },
  overline: { color: "#007D74", fontSize: 11, fontWeight: "800", letterSpacing: 1.3 }, title: { color: "#102B3D", fontSize: 29, fontWeight: "800", marginTop: -9 }, subtitle: { color: "#65758A", fontSize: 13, lineHeight: 19, marginTop: -9 },
  summary: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#E1EBE9", borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 14, padding: 17 }, summaryIcon: { alignItems: "center", backgroundColor: "#E1F7F1", borderRadius: 12, height: 45, justifyContent: "center", width: 45 }, summaryValue: { color: "#102B3D", fontSize: 21, fontWeight: "800" }, summaryLabel: { color: "#65758A", fontSize: 12 },
  list: { gap: 10 }, card: { alignItems: "center", backgroundColor: "rgba(255,255,255,.97)", borderColor: "#E1EBE9", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, padding: 14 }, icon: { alignItems: "center", borderRadius: 11, height: 40, justifyContent: "center", width: 40 }, membershipIcon: { backgroundColor: "#EAF7F4" }, monthlyIcon: { backgroundColor: "#EAF0FF" }, exceptionalIcon: { backgroundColor: "#F5EAF9" }, cardBody: { flex: 1, gap: 4, minWidth: 0 }, cardTitle: { color: "#102B3D", fontSize: 13, fontWeight: "800" }, cardMeta: { color: "#65758A", fontSize: 11 }, reference: { color: "#84939D", fontSize: 10 }, amount: { color: "#007D74", fontSize: 12, fontWeight: "800", textAlign: "right" },
  state: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 16, gap: 10, padding: 30 }, stateText: { color: "#65758A", textAlign: "center" }, errorBox: { backgroundColor: "#FFF4F2", borderRadius: 12, gap: 8, padding: 14 }, error: { color: "#B64337", fontSize: 13 }, retry: { color: "#007D74", fontWeight: "800" }, more: { alignItems: "center", backgroundColor: "#EAF7F4", borderRadius: 12, padding: 14 }, moreText: { color: "#007D74", fontWeight: "800" },
});
