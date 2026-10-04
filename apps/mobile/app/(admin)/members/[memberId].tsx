import { useCallback, useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Animated, ImageBackground, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AdminHeader } from "../../../src/components/admin-chrome";
import { AdminMemberDetail, ContributionDue, getAdminMemberDetail, manageAdminMember } from "../../../src/features/members/api";
import { buildMemberContributionYear, CalendarMonth, isAnnualProgressVisible } from "../../../src/features/members/contribution-year";

const background = require("../../../assets/Fond_ecranMobile.png");
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
const statusLabel = (status: ContributionDue["status"]) => status === "paid" ? "Réglée" : status === "partial" ? "Partielle" : "Impayée";
const memberStatusLabel = (status: AdminMemberDetail["member"]["memberStatus"]) => ({ active: "Actif", pending_membership: "En attente", suspended: "Suspendu", removed: "Supprimé" })[status];

export default function MemberDetail() {
  const { memberId, paymentUpdated, selectedYear: selectedYearParam } = useLocalSearchParams<{ memberId: string; paymentUpdated?: string; selectedYear?: string }>();
  const [detail, setDetail] = useState<AdminMemberDetail | null>(null);
  const [loading, setLoading] = useState(typeof memberId === "string");
  const [error, setError] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const requestSequence = useRef(0);
  const progress = useRef(new Animated.Value(0)).current;
  const chartTop = useRef<number | null>(null);
  const viewportHeight = useRef(0);
  const scrollOffset = useRef(0);
  const animationStarted = useRef(false);
  const validMemberId = typeof memberId === "string" && memberId.length > 0;

  const animateChartIfVisible = useCallback(() => {
    const top = chartTop.current;
    if (animationStarted.current || top === null) return;
    if (isAnnualProgressVisible(top, viewportHeight.current, scrollOffset.current)) {
      animationStarted.current = true;
      Animated.timing(progress, { toValue: 1, duration: 1100, useNativeDriver: false }).start();
    }
  }, [progress]);

  const handleChartLayout = (event: LayoutChangeEvent) => {
    chartTop.current = event.nativeEvent.layout.y;
    animateChartIfVisible();
  };

  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.current = nativeEvent.contentOffset.y;
    animateChartIfVisible();
  };

  const loadDetail = useCallback(async () => {
    if (!validMemberId) return;
    const requestId = ++requestSequence.current;
    setLoading(true); setError(false);
    try {
      const result = await getAdminMemberDetail(memberId);
      if (requestId !== requestSequence.current) return;
      setDetail(result);
    } catch {
      if (requestId !== requestSequence.current) return;
      setError(true);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [memberId, validMemberId]);

  useEffect(() => {
    progress.setValue(0); animationStarted.current = false; chartTop.current = null;
    const requestedYear = Number(selectedYearParam);
    setSelectedYear(selectedYearParam && Number.isInteger(requestedYear) && requestedYear >= 1900 && requestedYear <= 2100 ? requestedYear : new Date().getFullYear());
    if (!validMemberId) { setDetail(null); setError(false); setLoading(false); return; }
    void loadDetail();
    return () => { requestSequence.current++; };
  }, [loadDetail, validMemberId, progress, paymentUpdated, selectedYearParam]);

  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(0);
    animationStarted.current = false;
    animateChartIfVisible();
  }, [selectedYear, progress, animateChartIfVisible]);

  const body = !validMemberId ? <State message="Membre introuvable." /> : loading ? <State message="Chargement du membre…" /> : error || !detail ? <State message="Impossible de charger ce membre." retry={loadDetail} /> : <MemberContent detail={detail} onReactivate={loadDetail} progress={progress} onChartLayout={handleChartLayout} selectedYear={selectedYear} onChangeYear={setSelectedYear} />;
  return <View style={styles.page}>
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={80} onLayout={({ nativeEvent }) => { viewportHeight.current = nativeEvent.layout.height; animateChartIfVisible(); }}><ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}><View style={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour aux membres" onPress={() => router.replace("/(admin)/members")} style={styles.back}><Feather name="arrow-left" color="#007D74" size={20} /><Text style={styles.backText}>Retour</Text></Pressable>
      {body}
    </View></ImageBackground></ScrollView>
    <AdminHeader />
  </View>;
}

function MemberContent({ detail, onReactivate, progress, onChartLayout, selectedYear, onChangeYear }: { detail: AdminMemberDetail; onReactivate: () => void; progress: Animated.Value; onChartLayout: (event: LayoutChangeEvent) => void; selectedYear: number; onChangeYear: (year: number) => void }) {
  const { monthlyDues, exceptionalDues, aid } = detail;
  const now = new Date();
  const currentYear = now.getFullYear();
  const today = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const contributionYear = buildMemberContributionYear(monthlyDues, (detail.annualMonthlyGoal ?? 0) / 12, selectedYear, today);
  return <>
    <IdentityCard detail={detail} onReactivate={onReactivate} />
    <Section title="Calendrier des cotisations"><View style={styles.calendarYearControls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Année précédente" onPress={() => onChangeYear(selectedYear - 1)} style={styles.calendarYearButton}><Feather name="chevron-left" size={21} color="#007D74" /></Pressable>
      <Text style={styles.calendarYear}>Année {selectedYear} · 12 mensualités</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Année suivante" onPress={() => onChangeYear(selectedYear + 1)} style={styles.calendarYearButton}><Feather name="chevron-right" size={21} color="#007D74" /></Pressable>
    </View>{selectedYear !== currentYear ? <Pressable accessibilityRole="button" onPress={() => onChangeYear(currentYear)} style={styles.calendarYearReset}><Text style={styles.calendarYearResetText}>Revenir à {currentYear}</Text></Pressable> : null}<View style={styles.calendarGrid}>{contributionYear.months.map((month) => <CalendarCard key={month.month} month={month} onPress={month.due && month.due.amountRemaining > 0 ? () => router.push({ pathname: "/(admin)/members/[memberId]/monthly-payment", params: { memberId: detail.member.id, dueId: month.due!.id, selectedYear: String(selectedYear) } }) : undefined} />)}</View></Section>
    <Section title="Cotisations exceptionnelles">{exceptionalDues.length ? exceptionalDues.map((due) => <ContributionRow key={due.id} due={due} />) : <Empty message="Aucune cotisation enregistrée." />}</Section>
    <Section title="Aides reçues"><View style={styles.aidSummary}><AmountCard label="Nombre d’aides" value={String(aid.count)} /><AmountCard label="Total reçu" value={money(aid.totalReceived)} /></View>{aid.items.length ? aid.items.map((item) => <AidRow key={item.id} item={item} />) : <Empty message="Aucune aide reçue." />}</Section>
    <View onLayout={onChartLayout}><Section title="Évolution des cotisations"><AnnualProgress year={selectedYear} paid={contributionYear.paid} goal={contributionYear.annualGoal} percentage={contributionYear.percentage} progress={progress} /></Section></View>
  </>;
}

function IdentityCard({ detail, onReactivate }: { detail: AdminMemberDetail; onReactivate: () => void }) {
  const { member, membershipFee } = detail; const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();
  const reactivate = () => Alert.alert("Réactiver", "Confirmer la réactivation manuelle de ce membre ?", [{ text: "Annuler", style: "cancel" }, { text: "Réactiver", onPress: () => { void manageAdminMember({ memberId: member.id, action: "reactivate" }).then(onReactivate).catch(() => Alert.alert("Action impossible", "Le changement n’a pas pu être enregistré.")); } }]);
  const feeLabel = membershipFee.status === "paid" ? "Droit d’adhésion validé" : membershipFee.status === "partial" ? "Droit d’adhésion partiel" : "Droit d’adhésion en attente";
  return <View style={styles.identity}>
    <View style={styles.identityHead}><View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View><View style={styles.identityInfo}><Text style={styles.name}>{member.firstName} {member.lastName}</Text><Text style={styles.memberNumber}>{member.memberNumber}</Text></View></View>
    <View style={styles.identityDetails}><View style={styles.identityDetail}><Feather name="phone" size={15} color="#65758A" /><Text style={styles.meta}>{member.phone}</Text></View><View style={styles.identityDetail}><Feather name="calendar" size={15} color="#65758A" /><Text style={styles.meta}>Depuis le {date(member.joiningDate)}</Text></View></View>
    <View style={styles.memberBadges}><Text style={styles.memberBadge}>{member.role === "admin" ? "Administrateur" : "Membre"}</Text><Text style={styles.memberBadge}>{memberStatusLabel(member.memberStatus)}</Text><Text style={[styles.memberBadge, membershipFee.status === "paid" ? styles.paid : membershipFee.status === "partial" ? styles.partial : styles.unpaid]}>{feeLabel}</Text></View>
    <View style={styles.identityActions}><Pressable onPress={() => router.push({ pathname: "/(admin)/members/edit", params: { memberId: member.id, firstName: member.firstName, lastName: member.lastName, phone: member.phone } })} accessibilityRole="button" style={styles.identityAction}><Feather name="edit-2" size={14} color="#007D74" /><Text style={styles.action}>Modifier</Text></Pressable><Pressable onPress={() => router.push({ pathname: "/(admin)/members/[memberId]/disciplinary", params: { memberId: member.id } })} accessibilityRole="button" style={styles.identityAction}><Feather name="file-text" size={14} color="#007D74" /><Text style={styles.action}>Dossiers disciplinaires</Text></Pressable>{member.memberStatus === "suspended" ? <Pressable onPress={reactivate} accessibilityRole="button" style={styles.identityAction}><Text style={styles.action}>Réactiver</Text></Pressable> : null}</View>
  </View>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function AmountCard({ label, value }: { label: string; value: string }) { return <View style={styles.amountCard}><Text style={styles.amountValue}>{value}</Text><Text style={styles.amountLabel}>{label}</Text></View>; }
function StatusPill({ status }: { status: ContributionDue["status"] }) { return <Text style={[styles.pill, status === "paid" ? styles.paid : status === "partial" ? styles.partial : styles.unpaid]}>{statusLabel(status)}</Text>; }
function ContributionRow({ due }: { due: ContributionDue }) { return <View style={styles.row}><View style={styles.rowInfo}><Text style={styles.rowTitle}>{due.label ?? (due.month ? date(due.month) : "Cotisation")}</Text><Text style={styles.rowMeta}>Échéance : {date(due.dueDate)}</Text><Text style={styles.rowMeta}>Réglé : {money(due.amountPaid)} · Reste : {money(due.amountRemaining)}</Text></View><View style={styles.rowRight}><Text style={styles.rowAmount}>{money(due.amountDue)}</Text><StatusPill status={due.status} /></View></View>; }
function AidRow({ item }: { item: AdminMemberDetail["aid"]["items"][number] }) { return <View style={styles.row}><View style={styles.rowInfo}><Text style={styles.rowTitle}>{item.label}</Text><Text style={styles.rowMeta}>{date(item.disbursedOn)}</Text></View><Text style={styles.rowAmount}>{money(item.amount)}</Text></View>; }
function Empty({ message }: { message: string }) { return <Text style={styles.empty}>{message}</Text>; }
function State({ message, retry }: { message: string; retry?: () => void }) { return <View style={styles.state}><Text style={styles.empty}>{message}</Text>{retry ? <Pressable accessibilityRole="button" onPress={() => void retry()} style={styles.retry}><Text style={styles.retryText}>Réessayer</Text></Pressable> : null}</View>; }

function CalendarCard({ month, onPress }: { month: CalendarMonth; onPress?: () => void }) {
  const [year, number] = month.month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(Date.UTC(year, number - 1, 1)));
  const status = month.status === "paid" ? "Payé" : month.status === "partial" ? "Partiel" : month.status === "late" ? "En retard" : month.status === "upcoming" ? (month.due ? "À payer" : "À venir") : "Non émis";
  const tone = month.status === "paid" ? styles.calendarPaid : month.status === "partial" ? styles.calendarPartial : month.status === "late" ? styles.calendarLate : styles.calendarNeutral;
  const content = <>
    <Text style={styles.calendarMonth}>{label}</Text><Text style={styles.calendarStatus}>{status}</Text>
    <Text style={styles.calendarAmount}>{month.due ? money(month.due.amountPaid) : "—"}</Text>
    {month.due ? <Text style={styles.calendarTarget}>sur {money(month.due.amountDue)}</Text> : null}
  </>;
  const accessibilityLabel = `${label} ${year} : ${status}${month.due ? `, ${money(month.due.amountPaid)} réglés sur ${money(month.due.amountDue)}` : ""}${onPress ? ", ouvrir le paiement" : ""}`;
  return onPress ? <Pressable onPress={onPress} style={[styles.calendarCard, tone]} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>{content}</Pressable>
    : <View style={[styles.calendarCard, tone]} accessible accessibilityLabel={accessibilityLabel}>{content}</View>;
}

function AnnualProgress({ year, paid, goal, percentage, progress }: { year: number; paid: number; goal: number; percentage: number; progress: Animated.Value }) {
  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${percentage}%`] });
  return <View accessible={true} accessibilityLabel={`Objectif annuel ${year} : ${money(paid)} réglés sur ${money(goal)}, ${Math.round(percentage)} pour cent`} style={styles.progressPanel}>
    <View style={styles.progressHeading}><Text style={styles.progressLabel}>Objectif annuel des mensualités · {year}</Text><Text style={styles.progressPercent}>{Math.round(percentage)} %</Text></View>
    <Text style={styles.progressAmount}>{money(paid)} réglés sur {money(goal)}</Text>
    <View style={styles.progressTrack}><Animated.View style={[styles.progressFill, { width: fillWidth }]} /></View>
    <View style={styles.progressDots}>{Array.from({ length: 12 }, (_, index) => <View key={index} style={[styles.progressDot, percentage >= (index + 1) / 12 * 100 && styles.progressDotReached]} />)}</View>
    <Text style={styles.progressHint}>Chaque point représente un douzième de l’objectif annuel.</Text>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  background: { flexGrow: 1, minHeight: "100%" },
  backgroundImage: { height: "100%", resizeMode: "cover", width: "100%" },
  content: { alignSelf: "center", gap: 14, maxWidth: 760, padding: 20, paddingBottom: 108, paddingTop: 116, width: "100%" },
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 7 },
  backText: { color: "#007D74", fontWeight: "800" },
  identity: { backgroundColor: "rgba(255,255,255,.97)", borderRadius: 18, gap: 14, padding: 18 },
  identityHead: { alignItems: "center", flexDirection: "row", gap: 14 },
  avatar: { alignItems: "center", backgroundColor: "#DDF5F0", borderRadius: 34, height: 68, justifyContent: "center", width: 68 },
  avatarText: { color: "#007D74", fontSize: 21, fontWeight: "800" },
  identityInfo: { flex: 1, gap: 4 },
  name: { color: "#102B3D", fontSize: 21, fontWeight: "800" },
  memberNumber: { color: "#007D74", fontSize: 12, fontWeight: "700" },
  identityDetails: { borderTopColor: "#E8EEEE", borderTopWidth: 1, gap: 8, paddingTop: 12 },
  identityDetail: { alignItems: "center", flexDirection: "row", gap: 8 },
  meta: { color: "#65758A", fontSize: 12 },
  memberBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  memberBadge: { backgroundColor: "#EFF4F4", borderRadius: 8, color: "#65758A", fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 6 },
  identityActions: { borderTopColor: "#E8EEEE", borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 10 },
  identityAction: { alignItems: "center", backgroundColor: "#F2FAF8", borderRadius: 9, flexDirection: "row", gap: 6, paddingHorizontal: 11, paddingVertical: 9 },
  action: { color: "#007D74", fontSize: 12, fontWeight: "700" },
  section: { backgroundColor: "rgba(255,255,255,.94)", borderRadius: 17, gap: 12, padding: 16 },
  sectionTitle: { color: "#102B3D", fontSize: 16, fontWeight: "800" },
  calendarYearControls: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  calendarYearButton: { alignItems: "center", backgroundColor: "#EAF7F4", borderRadius: 10, height: 36, justifyContent: "center", width: 42 },
  calendarYear: { color: "#102B3D", fontSize: 13, fontWeight: "700" },
  calendarYearReset: { alignSelf: "center", paddingHorizontal: 8, paddingVertical: 4 },
  calendarYearResetText: { color: "#007D74", fontSize: 12, fontWeight: "700" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  calendarCard: { borderRadius: 12, minHeight: 104, padding: 10, width: "31%" },
  calendarPaid: { backgroundColor: "#DDF5E9" },
  calendarPartial: { backgroundColor: "#FFF0D6" },
  calendarLate: { backgroundColor: "#FDE7E4" },
  calendarNeutral: { backgroundColor: "#F0F3F5" },
  calendarMonth: { color: "#102B3D", fontSize: 14, fontWeight: "800" },
  calendarStatus: { color: "#42566B", fontSize: 11, fontWeight: "700", marginTop: 5 },
  calendarAmount: { color: "#102B3D", fontSize: 12, fontWeight: "800", marginTop: 7 },
  calendarTarget: { color: "#65758A", fontSize: 9, marginTop: 2 },
  amountGrid: { flexDirection: "row", gap: 7 },
  amountCard: { backgroundColor: "#F2FAF8", borderRadius: 11, flex: 1, padding: 10 },
  amountValue: { color: "#007D74", fontSize: 13, fontWeight: "800" },
  amountLabel: { color: "#65758A", fontSize: 10, marginTop: 4 },
  aidSummary: { flexDirection: "row", gap: 8 },
  pill: { alignSelf: "flex-start", borderRadius: 8, fontSize: 11, fontWeight: "700", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 },
  paid: { backgroundColor: "#E1F7F1", color: "#007D74" },
  partial: { backgroundColor: "#FFF2D9", color: "#A46300" },
  unpaid: { backgroundColor: "#FDE7E4", color: "#C75042" },
  row: { alignItems: "center", borderTopColor: "#E8EEEE", borderTopWidth: 1, flexDirection: "row", gap: 8, paddingTop: 10 },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { color: "#102B3D", fontWeight: "700" },
  rowMeta: { color: "#65758A", fontSize: 11 },
  rowRight: { alignItems: "flex-end", gap: 5 },
  rowAmount: { color: "#102B3D", fontSize: 12, fontWeight: "800" },
  progressPanel: { gap: 12, paddingVertical: 7 },
  progressHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { color: "#102B3D", fontSize: 13, fontWeight: "700" },
  progressPercent: { color: "#007D74", fontSize: 23, fontWeight: "800" },
  progressAmount: { color: "#65758A", fontSize: 12 },
  progressTrack: { backgroundColor: "#DDE8E7", borderRadius: 10, height: 14, overflow: "hidden" },
  progressFill: { backgroundColor: "#00A99D", borderRadius: 10, height: "100%" },
  progressDots: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 3 },
  progressDot: { backgroundColor: "#B8C7C8", borderRadius: 5, height: 8, width: 8 },
  progressDotReached: { backgroundColor: "#00A99D" },
  progressHint: { color: "#65758A", fontSize: 10 },
  empty: { color: "#65758A", paddingVertical: 12, textAlign: "center" },
  state: { alignItems: "center", paddingVertical: 55 },
  retry: { backgroundColor: "#00A99D", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: "#FFF", fontWeight: "800" },
});
