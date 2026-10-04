import { useCallback, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Animated, Image, ImageBackground, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AdminHeader } from "../../src/components/admin-chrome";
import { DashboardSummary, DashboardTransaction, getAdminDashboard } from "../../src/lib/supabase";

const background = require("../../assets/Fond_ecranMobile.png");
const flower = require("../../assets/image_fleur.png");
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);

function ContributionChart({ points }: { points: DashboardSummary["contributionChart"] }) {
  if (!points?.length) return <Text style={styles.emptyText}>Aucune donnée de cotisation disponible.</Text>;
  const maximum = Math.max(1, ...points.flatMap((point) => [point.expected, point.collected]));
  const monthLabel = (month: string) => {
    const [year, number] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(Date.UTC(year, number - 1, 1)));
  };
  return <View style={styles.chartContainer}>
    <View style={styles.chartLegend}>
      <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.expectedBar]} /><Text style={styles.legendText}>Attendu</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.collectedBar]} /><Text style={styles.legendText}>Encaissé</Text></View>
    </View>
    <View style={styles.chart}>
      {points.map((point) => <View key={point.month} style={styles.chartGroup} accessible accessibilityLabel={`${monthLabel(point.month)} ${point.month.slice(0, 4)} : attendu ${money(point.expected)}, encaissé ${money(point.collected)}`}>
        <View style={styles.chartBars}>
          <View style={[styles.chartBar, styles.expectedBar, { height: point.expected ? Math.max(4, point.expected / maximum * 110) : 0 }]} />
          <View style={[styles.chartBar, styles.collectedBar, { height: point.collected ? Math.max(4, point.collected / maximum * 110) : 0 }]} />
        </View>
        <Text style={styles.chartMonth}>{monthLabel(point.month)}</Text>
      </View>)}
    </View>
  </View>;
}

function RecentTransactionRow({ transaction }: { transaction: DashboardTransaction }) {
  const expense = transaction.kind === "expense";
  const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${transaction.occurredOn}T00:00:00`));
  return <View style={styles.transaction}>
    <View style={[styles.transactionIcon, expense ? styles.expenseIcon : styles.incomeIcon]}>
      <Feather name={expense ? "arrow-up-right" : "arrow-down-left"} size={18} color={expense ? "#A46300" : "#007D74"} />
    </View>
    <View style={styles.transactionInfo}>
      <Text style={styles.transactionTitle} numberOfLines={1}>{transaction.label}</Text>
      <Text style={styles.transactionMeta} numberOfLines={1}>{transaction.memberName ? `${transaction.memberName} · ` : ""}{date}</Text>
    </View>
    <Text style={[styles.transactionAmount, expense && styles.expenseAmount]}>{expense ? "−" : "+"}{money(transaction.amount)}</Text>
  </View>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestSequence = useRef(0);
  const previousOffset = useRef(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const chromeVisible = useRef(true);

  const animateChrome = (visible: boolean) => {
    if (chromeVisible.current === visible) return;
    chromeVisible.current = visible;
    Animated.timing(headerTranslateY, { toValue: visible ? 0 : -120, duration: 200, useNativeDriver: true }).start();
  };

  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = Math.max(0, nativeEvent.contentOffset.y);
    const delta = offset - previousOffset.current;
    if (Math.abs(delta) >= 12) animateChrome(delta < 0 || offset < 12);
    previousOffset.current = offset;
  };

  const loadDashboard = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setRefreshing(true);
    setError(false);
    try {
      const next = await getAdminDashboard();
      if (requestId === requestSequence.current) setData(next);
    } catch (cause) {
      const context = typeof cause === "object" && cause !== null && "context" in cause ? cause.context : null;
      const status = typeof context === "object" && context !== null && "status" in context ? context.status : null;
      if (requestId === requestSequence.current) {
        if (status === 401) router.replace("/login");
        else setError(true);
      }
    } finally {
      if (requestId === requestSequence.current) setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadDashboard();
    return () => { requestSequence.current++; };
  }, [loadDashboard]));

  if (!data && !error) return <View style={styles.center}><Text>Chargement du tableau de bord…</Text></View>;
  if (error || !data) return <View style={styles.center}><Text>Impossible de charger le tableau de bord.</Text><Pressable onPress={() => void loadDashboard()}><Text style={styles.refreshText}>Réessayer</Text></Pressable></View>;

  const cards = [
    ["users", "Total membres", String(data.totalMembers), "Voir les membres"],
    ["calendar", "Total à jour", String(data.membersPaid), "Cotisations réglées"],
    ["clock", "Total en retard", String(data.membersLate), "À relancer"],
    ["user-plus", "Total mensualités impayées", money(data.totalMonthlyOutstanding), "Reste à recouvrer"],
    ["file-text", "Total caisse", money(data.totalCash), "Adhésions + mensualités + exceptionnelles − dépenses"],
    ["shield", "Total dépense", money(data.totalExpenses), "Somme des dépenses"],
  ] as const;

  return <View style={styles.page}>
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.scroll} showsVerticalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16}>
      <ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}>
        <View style={[styles.content, { paddingTop: 104 }]}>
          <View style={styles.welcome}>
            <Image source={flower} style={[styles.welcomeIllustration, { height: 330, width: 330, opacity: .1, right: -90, top: -120, bottom: null, resizeMode: "cover", zIndex: 0, tintColor: "#00A99D" }]} />
            <Text style={[styles.hello, { marginTop: 8 }]}>Bonjour, Admin</Text>
            <Text style={[styles.title, { fontSize: 28 }]}>Tableau de bord</Text>
            <Text style={[styles.subtitle, { marginTop: 10, fontSize: 14 }]}>Voici un aperçu de l’activité de {data.organizationName}.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Actualiser le tableau de bord" disabled={refreshing} onPress={() => void loadDashboard()} style={styles.refresh}><Feather name="refresh-cw" size={15} color="#007D74" /><Text style={styles.refreshText}>{refreshing ? "Actualisation…" : "Actualiser"}</Text></Pressable>
          </View>

          <View style={[styles.grid, { zIndex: 1 }]}>
            {cards.map(([icon, title, value, caption], index) => (
              <Pressable key={title} style={styles.card} onPress={index === 0 ? () => router.push("/(admin)/members") : undefined}>
                <View style={styles.icon}><Feather name={icon as never} size={24} color="#00A99D" /></View>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.value}>{value}</Text>
                <Text style={styles.caption}>{caption}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.requests} onPress={() => router.push("/(admin)/membership-requests")}>
            <Text style={styles.requestsText}>Gérer les demandes d’adhésion</Text>
            <Feather name="arrow-right" size={20} color="#FFF" />
          </Pressable>

          <View style={styles.panel}>
            <View style={[styles.panelHead, { minHeight: 58, position: "relative" }]}>
              <Text style={[styles.panelTitle, { flex: 1, marginRight: 76 }]} numberOfLines={2}>Graphique évolution des cotisations</Text>
              <View style={[styles.period, { alignItems: "center", flexDirection: "row", gap: 4, position: "absolute", right: 0, top: 0 }]}>
                <Text style={{ color: "#65758A" }} numberOfLines={1}>6 mois</Text>
              </View>
            </View>
            <ContributionChart points={data.contributionChart} />
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelTitle}>Dernières transactions</Text>
              <Pressable onPress={() => router.push("/(admin)/finances")}><Text style={styles.link}>Voir tout  →</Text></Pressable>
            </View>
            {data.recentTransactions?.length ? data.recentTransactions.map((transaction) => <RecentTransactionRow key={transaction.id} transaction={transaction} />) : <Text style={styles.emptyText}>Aucune transaction enregistrée.</Text>}
          </View>
        </View>
      </ImageBackground>
    </ScrollView>
    <AdminHeader translateY={headerTranslateY} />
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, scroll: { flex: 1 }, background: { flexGrow: 1, minHeight: "100%" }, backgroundImage: { height: "100%", resizeMode: "cover", width: "100%" }, content: { gap: 14, padding: 20, paddingBottom: 112, paddingTop: 122 }, center: { alignItems: "center", flex: 1, justifyContent: "center" },
  welcome: { justifyContent: "center", minHeight: 122, position: "relative" }, welcomeIllustration: { bottom: -8, height: 148, opacity: .5, position: "absolute", resizeMode: "contain", right: -20, width: 148 }, hello: { color: "#65758A", marginTop: 22, zIndex: 1 }, title: { color: "#102B3D", fontSize: 31, fontWeight: "800", zIndex: 1 }, subtitle: { color: "#65758A", fontSize: 16, maxWidth: "72%", zIndex: 1 }, refresh: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 6, marginTop: 12, paddingVertical: 5, zIndex: 1 }, refreshText: { color: "#007D74", fontSize: 12, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, card: { backgroundColor: "rgba(255,255,255,.96)", borderRadius: 18, elevation: 2, minHeight: 160, padding: 14, width: "48%" }, icon: { alignItems: "center", backgroundColor: "#E1F7F1", borderRadius: 30, height: 52, justifyContent: "center", width: 52 }, cardTitle: { color: "#102B3D", fontSize: 13, fontWeight: "700", marginTop: 12 }, value: { color: "#00A99D", fontSize: 17, fontWeight: "800", marginTop: 7 }, caption: { color: "#65758A", fontSize: 11, marginTop: 5 },
  requests: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 14, flexDirection: "row", justifyContent: "space-between", padding: 17 }, requestsText: { color: "#FFF", fontWeight: "800" }, panel: { backgroundColor: "rgba(255,255,255,.96)", borderRadius: 18, padding: 17 }, panelHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, panelTitle: { color: "#102B3D", fontSize: 18, fontWeight: "800" }, period: { backgroundColor: "#EFF4F4", borderRadius: 10, color: "#65758A", padding: 8 }, chartContainer: { gap: 12, paddingTop: 10 }, chartLegend: { flexDirection: "row", gap: 16 }, legendItem: { alignItems: "center", flexDirection: "row", gap: 5 }, legendSwatch: { borderRadius: 3, height: 10, width: 10 }, legendText: { color: "#65758A", fontSize: 11 }, chart: { flexDirection: "row", height: 145 }, chartGroup: { alignItems: "center", flex: 1 }, chartBars: { alignItems: "flex-end", flex: 1, flexDirection: "row", gap: 3, justifyContent: "center", width: "100%" }, chartBar: { borderTopLeftRadius: 4, borderTopRightRadius: 4, width: "32%" }, expectedBar: { backgroundColor: "#C9E9E4" }, collectedBar: { backgroundColor: "#00A99D" }, chartMonth: { color: "#65758A", fontSize: 10, marginTop: 6 }, emptyTitle: { color: "#102B3D", fontWeight: "700" }, emptyText: { color: "#65758A", fontSize: 12, textAlign: "center" }, transaction: { alignItems: "center", borderTopColor: "#E8EEEE", borderTopWidth: 1, flexDirection: "row", gap: 10, minHeight: 68, paddingVertical: 9 }, transactionIcon: { alignItems: "center", borderRadius: 12, height: 36, justifyContent: "center", width: 36 }, incomeIcon: { backgroundColor: "#E1F7F1" }, expenseIcon: { backgroundColor: "#FFF2D9" }, transactionInfo: { flex: 1, minWidth: 0 }, transactionTitle: { color: "#102B3D", fontSize: 12, fontWeight: "700" }, transactionMeta: { color: "#65758A", fontSize: 10, marginTop: 3 }, transactionAmount: { color: "#007D74", fontSize: 12, fontWeight: "800" }, expenseAmount: { color: "#A46300" }, link: { color: "#00A99D", fontWeight: "700" },
});
