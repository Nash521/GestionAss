import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, ImageBackground, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { MemberNavigation } from "../src/components/member-navigation";
import { getMyMemberDashboard } from "../src/features/member-dashboard/api";
import { buildMemberDashboard, type MemberDashboardData } from "../src/features/member-dashboard/model";
import { buildMemberContributionYear, isAnnualProgressVisible, type CalendarMonth } from "../src/features/members/contribution-year";
import { getSessionDestination } from "../src/lib/supabase";

const background = require("../assets/Fond_ecranMobile.png");
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
const monthName = (month: string) => new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(`${month}-01T00:00:00`));

export default function Home() {
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [data, setData] = useState<MemberDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);
  const progress = useRef(new Animated.Value(0)).current;
  const progressTop = useRef<number | null>(null);
  const viewportHeight = useRef(0);
  const scrollOffset = useRef(0);
  const animationStarted = useRef(false);

  const animateProgressIfVisible = useCallback(() => {
    if (animationStarted.current || progressTop.current === null) return;
    if (isAnnualProgressVisible(progressTop.current, viewportHeight.current, scrollOffset.current)) {
      animationStarted.current = true;
      Animated.timing(progress, { toValue: 1, duration: 1100, useNativeDriver: false }).start();
    }
  }, [progress]);

  const load = useCallback(async (isRefresh = false) => {
    const requestId = ++requestSequence.current;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const session = await getSessionDestination();
      if (requestId !== requestSequence.current) return;
      if (session.destination !== "active") { router.replace("/login"); return; }
      if (session.role === "admin") { router.replace("/(admin)/dashboard"); return; }
      const result = await getMyMemberDashboard(new Date().getFullYear());
      if (requestId === requestSequence.current) setData(result);
    } catch {
      if (requestId === requestSequence.current) setError("Impossible de charger votre tableau de bord.");
    } finally {
      if (requestId === requestSequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); return () => { requestSequence.current++; }; }, [load]));
  useEffect(() => {
    progress.stopAnimation(); progress.setValue(0); animationStarted.current = false; progressTop.current = null;
  }, [selectedYear, progress]);

  const changeYear = (year: number) => setSelectedYear(year);
  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => { scrollOffset.current = nativeEvent.contentOffset.y; animateProgressIfVisible(); };
  const handleProgressLayout = (event: LayoutChangeEvent) => { progressTop.current = event.nativeEvent.layout.y; animateProgressIfVisible(); };
  const summary = data ? buildMemberDashboard(data, selectedYear) : null;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const calendar = data ? buildMemberContributionYear(data.monthlyDues, data.monthlyRate, selectedYear, today) : null;

  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={80} onLayout={({ nativeEvent }) => { viewportHeight.current = nativeEvent.layout.height; animateProgressIfVisible(); }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#00A99D" />}>
      <ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}><View style={styles.content}>
        <View style={styles.header}><View style={styles.headerText}><Text style={styles.overline}>ESPACE MEMBRE</Text><Text style={styles.title}>Tableau de bord</Text><Text style={styles.organization}>{data?.organizationName ?? "GestionAss"}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.notificationButton}><Feather name="bell" size={21} color="#007D74" /></Pressable></View>
        {loading ? <View style={styles.state}><Text style={styles.stateText}>Chargement de vos cotisations…</Text></View> : error || !data || !summary ? <View style={styles.state}><Text style={styles.stateText}>{error || "Aucune donnée disponible."}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}><Text style={styles.retryText}>Réessayer</Text></Pressable></View> : <>
          <Text style={styles.greeting}>Bonjour {data.firstName}</Text><Text style={styles.intro}>Voici le suivi de vos cotisations depuis votre adhésion.</Text>
          <View style={styles.cardGrid}><MetricCard icon="check-circle" label="Total payé" value={money(summary.totalPaid)} tone="green" /><MetricCard icon="file-text" label="Total dû" value={money(summary.totalDue)} tone="blue" /><MetricCard icon="calendar" label="Mois payés" value={String(summary.monthsPaid)} tone="green" /><MetricCard icon="gift" label="Cotisations exceptionnelles payées" value={money(summary.exceptionalPaid)} tone="purple" /><MetricCard icon="clock" label="Mois non soldés" value={String(summary.monthsUnsettled)} tone="amber" /></View>
          {calendar ? <MonthlyCalendar months={calendar.months} year={selectedYear} onChangeYear={changeYear} /> : null}
          <View onLayout={handleProgressLayout}><View style={styles.section}><Text style={styles.sectionTitle}>Progression annuelle</Text><AnnualProgress year={selectedYear} paid={summary.annualPaid} goal={summary.annualGoal} percentage={summary.percentage} progress={progress} /></View></View>
        </>}
      </View></ImageBackground>
    </ScrollView>
    <MemberNavigation active="home" />
  </View>;
}

function MetricCard({ icon, label, value, tone }: { icon: "check-circle" | "file-text" | "calendar" | "gift" | "clock"; label: string; value: string; tone: "green" | "blue" | "purple" | "amber" }) {
  return <View style={styles.metricCard} accessible accessibilityLabel={`${label} : ${value}`}><View style={[styles.metricIcon, tone === "green" ? styles.metricGreen : tone === "amber" ? styles.metricAmber : tone === "purple" ? styles.metricPurple : styles.metricBlue]}><Feather name={icon} size={19} color={tone === "amber" ? "#9B6900" : tone === "purple" ? "#8055A8" : "#007D74"} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function MonthlyCalendar({ months, year, onChangeYear }: { months: CalendarMonth[]; year: number; onChangeYear: (year: number) => void }) {
  return <View style={styles.section}>
    <View style={styles.calendarHeading}><Text style={styles.sectionTitle}>Calendrier des mensualités</Text><View style={styles.calendarYearControls}><Pressable accessibilityRole="button" accessibilityLabel="Année précédente" disabled={year <= 2000} onPress={() => onChangeYear(year - 1)} style={styles.calendarYearButton}><Feather name="chevron-left" size={17} color="#007D74" /></Pressable><Text style={styles.calendarYear}>{year}</Text><Pressable accessibilityRole="button" accessibilityLabel="Année suivante" disabled={year >= 2100} onPress={() => onChangeYear(year + 1)} style={styles.calendarYearButton}><Feather name="chevron-right" size={17} color="#007D74" /></Pressable></View></View>
    <Text style={styles.sectionHint}>Vos 12 mensualités pour {year}.</Text>
    <View style={styles.calendarGrid}>{months.map((month) => <MonthlyCalendarCard key={month.month} month={month} />)}</View>
  </View>;
}

function MonthlyCalendarCard({ month }: { month: CalendarMonth }) {
  const status = month.status === "paid" ? "Payé" : month.status === "partial" ? "Partiel" : month.status === "late" ? "En retard" : month.status === "upcoming" ? (month.due ? "À payer" : "À venir") : "Non émis";
  const tone = month.status === "paid" ? styles.calendarPaid : month.status === "partial" ? styles.calendarPartial : month.status === "late" ? styles.calendarLate : styles.calendarNeutral;
  const label = monthName(month.month);
  return <Pressable style={[styles.calendarCard, tone]} accessibilityRole="button" accessibilityLabel={`Voir la mensualité de ${label} ${month.month.slice(0, 4)} : ${status}${month.due ? `, ${money(month.due.amountPaid)} réglés sur ${money(month.due.amountDue)}` : ""}`} onPress={() => router.push({ pathname: month.due && month.due.amountRemaining > 0 ? "/monthly/[month]/pay" : "/monthly/[month]", params: { month: month.month } })}>
    <View style={styles.calendarCardHeading}><Text style={styles.calendarMonth}>{label}</Text><Feather name="chevron-right" size={13} color="#65758A" /></View>
    <Text style={styles.calendarStatus}>{status}</Text>
    <Text style={styles.calendarAmount}>{month.due ? money(month.due.amountPaid) : "—"}</Text>
    {month.due ? <Text style={styles.calendarTarget}>sur {money(month.due.amountDue)}</Text> : null}
  </Pressable>;
}

function AnnualProgress({ year, paid, goal, percentage, progress }: { year: number; paid: number; goal: number; percentage: number; progress: Animated.Value }) {
  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${percentage}%`] });
  return <View style={styles.progressPanel} accessible accessibilityLabel={`Objectif annuel ${year} : ${money(paid)} réglés sur ${money(goal)}, ${Math.round(percentage)} pour cent`}><View style={styles.progressHeading}><Text style={styles.progressLabel}>Objectif des 12 mensualités</Text><Text style={styles.progressPercent}>{Math.round(percentage)} %</Text></View><Text style={styles.progressAmount}>{money(paid)} réglés sur {money(goal)}</Text><View style={styles.progressTrack}><Animated.View style={[styles.progressFill, { width: fillWidth }]} /></View><View style={styles.progressDots}>{Array.from({ length: 12 }, (_, index) => <View key={index} style={[styles.progressDot, percentage >= (index + 1) / 12 * 100 && styles.progressDotReached]} />)}</View><Text style={styles.progressHint}>Chaque point représente un douzième de l’objectif annuel.</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, scrollContent: { flexGrow: 1 }, background: { flexGrow: 1, minHeight: "100%" }, backgroundImage: { height: "100%", resizeMode: "cover", width: "100%" }, content: { alignSelf: "center", gap: 15, maxWidth: 760, padding: 20, paddingBottom: 116, paddingTop: 34, width: "100%" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, headerText: { flex: 1 }, overline: { color: "#007D74", fontSize: 11, fontWeight: "800", letterSpacing: 1.3 }, title: { color: "#102B3D", fontSize: 28, fontWeight: "800", marginTop: 4 }, organization: { color: "#65758A", fontSize: 13, marginTop: 4 }, notificationButton: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 14, height: 46, justifyContent: "center", width: 46 },
  greeting: { color: "#102B3D", fontSize: 20, fontWeight: "800", marginTop: 3 }, intro: { color: "#65758A", fontSize: 13, marginTop: -10 }, cardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }, metricCard: { backgroundColor: "rgba(255,255,255,.97)", borderColor: "#E1EBE9", borderRadius: 17, borderWidth: 1, gap: 8, minHeight: 130, padding: 15, width: "48%" }, metricIcon: { alignItems: "center", borderRadius: 10, height: 34, justifyContent: "center", width: 34 }, metricGreen: { backgroundColor: "#DFF5EE" }, metricBlue: { backgroundColor: "#E7F3F7" }, metricPurple: { backgroundColor: "#F1E9FA" }, metricAmber: { backgroundColor: "#FFF0D4" }, metricValue: { color: "#102B3D", fontSize: 18, fontWeight: "800" }, metricLabel: { color: "#65758A", fontSize: 11, lineHeight: 16 },
  section: { backgroundColor: "rgba(255,255,255,.96)", borderColor: "#E1EBE9", borderRadius: 17, borderWidth: 1, gap: 12, padding: 17 }, sectionTitle: { color: "#102B3D", fontSize: 17, fontWeight: "800" }, sectionHint: { color: "#65758A", fontSize: 12, lineHeight: 18 }, calendarHeading: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }, calendarYearControls: { alignItems: "center", flexDirection: "row", gap: 4 }, calendarYearButton: { alignItems: "center", backgroundColor: "#EAF7F4", borderRadius: 8, height: 28, justifyContent: "center", width: 28 }, calendarYear: { color: "#102B3D", fontSize: 13, fontWeight: "800", minWidth: 34, textAlign: "center" }, calendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }, calendarCard: { borderRadius: 12, minHeight: 104, padding: 10, width: "31%" }, calendarCardHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, calendarPaid: { backgroundColor: "#DDF5E9" }, calendarPartial: { backgroundColor: "#FFF0D6" }, calendarLate: { backgroundColor: "#FDE7E4" }, calendarNeutral: { backgroundColor: "#F0F3F5" }, calendarMonth: { color: "#102B3D", fontSize: 14, fontWeight: "800", textTransform: "capitalize" }, calendarStatus: { color: "#42566B", fontSize: 11, fontWeight: "700", marginTop: 5 }, calendarAmount: { color: "#102B3D", fontSize: 12, fontWeight: "800", marginTop: 7 }, calendarTarget: { color: "#65758A", fontSize: 9, marginTop: 2 },
  progressPanel: { gap: 12, paddingVertical: 7 }, progressHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, progressLabel: { color: "#102B3D", flex: 1, fontSize: 13, fontWeight: "700" }, progressPercent: { color: "#007D74", fontSize: 23, fontWeight: "800" }, progressAmount: { color: "#65758A", fontSize: 12 }, progressTrack: { backgroundColor: "#DDE8E7", borderRadius: 10, height: 14, overflow: "hidden" }, progressFill: { backgroundColor: "#00A99D", borderRadius: 10, height: "100%" }, progressDots: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 3 }, progressDot: { backgroundColor: "#B8C7C8", borderRadius: 5, height: 8, width: 8 }, progressDotReached: { backgroundColor: "#00A99D" }, progressHint: { color: "#65758A", fontSize: 10 },
  state: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 15, gap: 13, padding: 35 }, stateText: { color: "#65758A", textAlign: "center" }, retry: { backgroundColor: "#00A99D", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }, retryText: { color: "#FFF", fontWeight: "800" },
});
