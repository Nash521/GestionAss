import { useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Animated, Image, ImageBackground, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AdminHeader } from "../../src/components/admin-chrome";
import { DashboardSummary, getAdminDashboard } from "../../src/lib/supabase";

const background = require("../../assets/Fond_ecranMobile.png");
const flower = require("../../assets/image_fleur.png");
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState(false);
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

  useEffect(() => { void getAdminDashboard().then(setData).catch(() => setError(true)); }, []);

  if (!data && !error) return <View style={styles.center}><Text>Chargement du tableau de bord…</Text></View>;
  if (error || !data) return <View style={styles.center}><Text>Impossible de charger le tableau de bord.</Text></View>;

  const cards = [
    ["users", "Total membres", String(data.totalMembers), "Voir les membres"],
    ["calendar", "Total à jour", String(data.membersPaid), "Cotisations réglées"],
    ["clock", "Total en retard", String(data.membersLate), "À relancer"],
    ["user-plus", "Total mensualités impayées", money(data.totalMonthlyOutstanding), "Reste à recouvrer"],
    ["file-text", "Total caisse", money(data.totalCash), "Adhésions + mensualités − dépenses"],
    ["shield", "Total dépense", money(data.totalExpenses), "Somme des dépenses"],
  ] as const;

  return <View style={styles.page}>
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16}>
      <ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}>
        <View style={[styles.content, { paddingTop: 104 }]}>
          <View style={styles.welcome}>
            <Image source={flower} style={[styles.welcomeIllustration, { height: 330, width: 330, opacity: .1, right: -90, top: -120, bottom: null, resizeMode: "cover", zIndex: 0, tintColor: "#00A99D" }]} />
            <Text style={[styles.hello, { marginTop: 8 }]}>Bonjour, Admin</Text>
            <Text style={[styles.title, { fontSize: 28 }]}>Tableau de bord</Text>
            <Text style={[styles.subtitle, { marginTop: 10, fontSize: 14 }]}>Voici un aperçu de l’activité de {data.organizationName}.</Text>
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
                <Feather name="chevron-down" size={14} color="#65758A" />
              </View>
            </View>
            <View style={styles.graph}>
              <Feather name="bar-chart-2" size={42} color="#00A99D" />
              <Text style={styles.emptyTitle}>Graphique détaillé bientôt disponible</Text>
              <Text style={styles.emptyText}>L’évolution mensuelle des cotisations apparaîtra ici.</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelTitle}>Dernières transactions</Text>
              <Pressable onPress={() => router.push("/(admin)/finances")}><Text style={styles.link}>Voir tout  →</Text></Pressable>
            </View>
            <View style={styles.transaction}>
              <Feather name="activity" size={25} color="#00A99D" />
              <View>
                <Text style={styles.emptyTitle}>Aperçu des transactions</Text>
                <Text style={styles.emptyText}>Consultez le détail dans la section Finances.</Text>
              </View>
            </View>
          </View>
        </View>
      </ImageBackground>
    </ScrollView>
    <AdminHeader translateY={headerTranslateY} />
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, scroll: { flex: 1 }, background: { minHeight: "100%" }, backgroundImage: { resizeMode: "cover" }, content: { gap: 14, padding: 20, paddingBottom: 112, paddingTop: 122 }, center: { alignItems: "center", flex: 1, justifyContent: "center" },
  welcome: { justifyContent: "center", minHeight: 122, position: "relative" }, welcomeIllustration: { bottom: -8, height: 148, opacity: .5, position: "absolute", resizeMode: "contain", right: -20, width: 148 }, hello: { color: "#65758A", marginTop: 22, zIndex: 1 }, title: { color: "#102B3D", fontSize: 31, fontWeight: "800", zIndex: 1 }, subtitle: { color: "#65758A", fontSize: 16, maxWidth: "72%", zIndex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, card: { backgroundColor: "rgba(255,255,255,.96)", borderRadius: 18, elevation: 2, minHeight: 160, padding: 14, width: "48%" }, icon: { alignItems: "center", backgroundColor: "#E1F7F1", borderRadius: 30, height: 52, justifyContent: "center", width: 52 }, cardTitle: { color: "#102B3D", fontSize: 13, fontWeight: "700", marginTop: 12 }, value: { color: "#00A99D", fontSize: 17, fontWeight: "800", marginTop: 7 }, caption: { color: "#65758A", fontSize: 11, marginTop: 5 },
  requests: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 14, flexDirection: "row", justifyContent: "space-between", padding: 17 }, requestsText: { color: "#FFF", fontWeight: "800" }, panel: { backgroundColor: "rgba(255,255,255,.96)", borderRadius: 18, padding: 17 }, panelHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, panelTitle: { color: "#102B3D", fontSize: 18, fontWeight: "800" }, period: { backgroundColor: "#EFF4F4", borderRadius: 10, color: "#65758A", padding: 8 }, graph: { alignItems: "center", gap: 8, minHeight: 165, justifyContent: "center" }, emptyTitle: { color: "#102B3D", fontWeight: "700" }, emptyText: { color: "#65758A", fontSize: 12, textAlign: "center" }, transaction: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 90 }, link: { color: "#00A99D", fontWeight: "700" },
});
