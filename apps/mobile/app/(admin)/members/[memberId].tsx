import { useCallback, useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AdminHeader } from "../../../src/components/admin-chrome";
import { AdminMemberDetail, ContributionDue, getAdminMemberDetail, manageAdminMember } from "../../../src/lib/supabase";

const background = require("../../../assets/Fond_ecranMobile.png");
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
const statusLabel = (status: ContributionDue["status"]) => status === "paid" ? "Réglée" : status === "partial" ? "Partielle" : "Impayée";
const memberStatusLabel = (status: AdminMemberDetail["member"]["memberStatus"]) => ({ active: "Actif", pending_membership: "En attente", suspended: "Suspendu", removed: "Supprimé" })[status];

export default function MemberDetail() {
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const [detail, setDetail] = useState<AdminMemberDetail | null>(null);
  const [loading, setLoading] = useState(typeof memberId === "string");
  const [error, setError] = useState(false);
  const requestSequence = useRef(0);
  const validMemberId = typeof memberId === "string" && memberId.length > 0;

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
    if (!validMemberId) { setDetail(null); setError(false); setLoading(false); return; }
    void loadDetail();
    return () => { requestSequence.current++; };
  }, [loadDetail, validMemberId]);

  const body = !validMemberId ? <State message="Membre introuvable." /> : loading ? <State message="Chargement du membre…" /> : error || !detail ? <State message="Impossible de charger ce membre." retry={loadDetail} /> : <MemberContent detail={detail} />;
  return <View style={styles.page}>
    <ScrollView showsVerticalScrollIndicator={false}><ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}><View style={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour aux membres" onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" color="#007D74" size={20} /><Text style={styles.backText}>Retour</Text></Pressable>
      {body}
    </View></ImageBackground></ScrollView>
    <AdminHeader />
  </View>;
}

function MemberContent({ detail }: { detail: AdminMemberDetail }) {
  const { membershipFee, monthlyDues, exceptionalDues, aid, summary, chart } = detail;
  return <>
    <IdentityCard detail={detail} />
    <Section title="Droit d’adhésion"><View style={styles.amountGrid}><AmountCard label="Montant dû" value={money(membershipFee.amountDue)} /><AmountCard label="Montant réglé" value={money(membershipFee.amountPaid)} /><AmountCard label="Reste à payer" value={money(membershipFee.amountRemaining)} /></View><StatusPill status={membershipFee.status} /></Section>
    <Section title="Total cotisé"><View style={styles.amountGrid}><AmountCard label="Total" value={money(summary.totalContributed)} /><AmountCard label="Mensuel" value={money(summary.monthlyPaid)} /><AmountCard label="Exceptionnel" value={money(summary.exceptionalPaid)} /></View><View style={styles.amountGrid}><AmountCard label="Mensualités à payer" value={money(summary.monthlyRemaining)} /><AmountCard label="Exceptionnelles à payer" value={money(summary.exceptionalRemaining)} /></View></Section>
    <Section title="Calendrier des cotisations">{monthlyDues.length ? monthlyDues.map((due) => <ContributionRow key={due.id} due={due} />) : <Empty message="Aucune cotisation enregistrée." />}</Section>
    <Section title="Cotisations exceptionnelles">{exceptionalDues.length ? exceptionalDues.map((due) => <ContributionRow key={due.id} due={due} />) : <Empty message="Aucune cotisation enregistrée." />}</Section>
    <Section title="Aides reçues"><View style={styles.aidSummary}><AmountCard label="Nombre d’aides" value={String(aid.count)} /><AmountCard label="Total reçu" value={money(aid.totalReceived)} /></View>{aid.items.length ? aid.items.map((item) => <AidRow key={item.id} item={item} />) : <Empty message="Aucune aide reçue." />}</Section>
    <Section title="Évolution des cotisations"><ContributionChart points={chart} /></Section>
  </>;
}

function IdentityCard({ detail }: { detail: AdminMemberDetail }) {
  const { member } = detail; const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();
  const lifecycle = (action: "suspend" | "reactivate" | "archive", label: string) => Alert.alert(label, `Confirmer : ${label.toLowerCase()} ce membre ?`, [{ text: "Annuler", style: "cancel" }, { text: label, style: action === "archive" ? "destructive" : "default", onPress: () => { void manageAdminMember({ memberId: member.id, action }).then(load => load && router.back()).catch(() => Alert.alert("Action impossible", "Le changement n’a pas pu être enregistré.")); } }]);
  return <View style={styles.identity}><View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View><View style={styles.identityInfo}><Text style={styles.name}>{member.firstName} {member.lastName}</Text><Text style={styles.meta}>{member.memberNumber}</Text><Text style={styles.meta}>{member.phone}</Text><Text style={styles.meta}>Adhésion : {date(member.joiningDate)}</Text><View style={styles.memberBadges}><Text style={styles.memberBadge}>{member.role === "admin" ? "Administrateur" : "Membre"}</Text><Text style={styles.memberBadge}>{memberStatusLabel(member.memberStatus)}</Text></View><Pressable onPress={() => router.push({ pathname: "/(admin)/members/edit", params: { memberId: member.id, firstName: member.firstName, lastName: member.lastName, phone: member.phone } })} accessibilityRole="button"><Text style={styles.action}>Modifier</Text></Pressable>{member.memberStatus === "active" ? <Pressable onPress={() => lifecycle("suspend", "Suspendre")} accessibilityRole="button"><Text style={styles.action}>Suspendre</Text></Pressable> : member.memberStatus === "suspended" ? <Pressable onPress={() => lifecycle("reactivate", "Réactiver")} accessibilityRole="button"><Text style={styles.action}>Réactiver</Text></Pressable> : null}{member.memberStatus !== "removed" ? <Pressable onPress={() => lifecycle("archive", "Archiver")} accessibilityRole="button"><Text style={styles.archiveAction}>Archiver</Text></Pressable> : null}</View></View>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function AmountCard({ label, value }: { label: string; value: string }) { return <View style={styles.amountCard}><Text style={styles.amountValue}>{value}</Text><Text style={styles.amountLabel}>{label}</Text></View>; }
function StatusPill({ status }: { status: ContributionDue["status"] }) { return <Text style={[styles.pill, status === "paid" ? styles.paid : status === "partial" ? styles.partial : styles.unpaid]}>{statusLabel(status)}</Text>; }
function ContributionRow({ due }: { due: ContributionDue }) { return <View style={styles.row}><View style={styles.rowInfo}><Text style={styles.rowTitle}>{due.label ?? (due.month ? date(due.month) : "Cotisation")}</Text><Text style={styles.rowMeta}>Échéance : {date(due.dueDate)}</Text><Text style={styles.rowMeta}>Réglé : {money(due.amountPaid)} · Reste : {money(due.amountRemaining)}</Text></View><View style={styles.rowRight}><Text style={styles.rowAmount}>{money(due.amountDue)}</Text><StatusPill status={due.status} /></View></View>; }
function AidRow({ item }: { item: AdminMemberDetail["aid"]["items"][number] }) { return <View style={styles.row}><View style={styles.rowInfo}><Text style={styles.rowTitle}>{item.label}</Text><Text style={styles.rowMeta}>{date(item.disbursedOn)}</Text></View><Text style={styles.rowAmount}>{money(item.amount)}</Text></View>; }
function Empty({ message }: { message: string }) { return <Text style={styles.empty}>{message}</Text>; }
function State({ message, retry }: { message: string; retry?: () => void }) { return <View style={styles.state}><Text style={styles.empty}>{message}</Text>{retry ? <Pressable accessibilityRole="button" onPress={() => void retry()} style={styles.retry}><Text style={styles.retryText}>Réessayer</Text></Pressable> : null}</View>; }

function ContributionChart({ points }: { points: AdminMemberDetail["chart"] }) {
  const paid = points.reduce((sum, point) => sum + point.paid, 0); const unpaid = points.reduce((sum, point) => sum + point.unpaid, 0); const maximum = Math.max(1, ...points.flatMap((point) => [point.paid, point.unpaid]));
  return <View accessible={true} accessibilityLabel={`Graphique payé et non payé : ${paid} payés, ${unpaid} impayés`} style={styles.chart}>{points.map((point) => <View accessible={false} key={point.month} style={styles.chartGroup}><View style={styles.bars}><View style={[styles.bar, styles.barPaid, { height: `${Math.max(5, point.paid / maximum * 100)}%` }]} /><View style={[styles.bar, styles.barUnpaid, { height: `${Math.max(5, point.unpaid / maximum * 100)}%` }]} /></View><Text numberOfLines={1} style={styles.chartLabel}>{point.month}</Text></View>)}</View>;
}

const styles = StyleSheet.create({ action: { color: "#007D74", fontWeight: "700", marginTop: 7 }, archiveAction: { color: "#C75042", fontWeight: "700", marginTop: 7 },
  page: { flex: 1 }, background: { minHeight: "100%" }, backgroundImage: { resizeMode: "cover" }, content: { gap: 14, padding: 20, paddingBottom: 108, paddingTop: 116 }, back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 7 }, backText: { color: "#007D74", fontWeight: "800" }, identity: { alignItems: "center", backgroundColor: "rgba(255,255,255,.97)", borderRadius: 18, flexDirection: "row", gap: 13, padding: 16 }, avatar: { alignItems: "center", backgroundColor: "#DDF5F0", borderRadius: 31, height: 62, justifyContent: "center", width: 62 }, avatarText: { color: "#007D74", fontSize: 20, fontWeight: "800" }, identityInfo: { flex: 1, gap: 3 }, name: { color: "#102B3D", fontSize: 20, fontWeight: "800" }, meta: { color: "#65758A", fontSize: 12 }, memberBadges: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 3 }, memberBadge: { backgroundColor: "#EFF4F4", borderRadius: 8, color: "#65758A", fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 3 }, section: { backgroundColor: "rgba(255,255,255,.94)", borderRadius: 17, gap: 10, padding: 14 }, sectionTitle: { color: "#102B3D", fontSize: 16, fontWeight: "800" }, amountGrid: { flexDirection: "row", gap: 7 }, amountCard: { backgroundColor: "#F2FAF8", borderRadius: 11, flex: 1, padding: 10 }, amountValue: { color: "#007D74", fontSize: 13, fontWeight: "800" }, amountLabel: { color: "#65758A", fontSize: 10, marginTop: 4 }, aidSummary: { flexDirection: "row", gap: 8 }, pill: { alignSelf: "flex-start", borderRadius: 8, fontSize: 11, fontWeight: "700", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 }, paid: { backgroundColor: "#E1F7F1", color: "#007D74" }, partial: { backgroundColor: "#FFF2D9", color: "#A46300" }, unpaid: { backgroundColor: "#FDE7E4", color: "#C75042" }, row: { alignItems: "center", borderTopColor: "#E8EEEE", borderTopWidth: 1, flexDirection: "row", gap: 8, paddingTop: 10 }, rowInfo: { flex: 1, gap: 2 }, rowTitle: { color: "#102B3D", fontWeight: "700" }, rowMeta: { color: "#65758A", fontSize: 11 }, rowRight: { alignItems: "flex-end", gap: 5 }, rowAmount: { color: "#102B3D", fontSize: 12, fontWeight: "800" }, empty: { color: "#65758A", paddingVertical: 12, textAlign: "center" }, state: { alignItems: "center", paddingVertical: 55 }, retry: { backgroundColor: "#00A99D", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }, retryText: { color: "#FFF", fontWeight: "800" }, chart: { alignItems: "flex-end", flexDirection: "row", gap: 7, height: 155, paddingTop: 10 }, chartGroup: { alignItems: "center", flex: 1, height: "100%" }, bars: { alignItems: "flex-end", flex: 1, flexDirection: "row", gap: 2, justifyContent: "center", width: "100%" }, bar: { borderRadius: 3, maxHeight: "100%", width: "31%" }, barPaid: { backgroundColor: "#00A99D" }, barUnpaid: { backgroundColor: "#F0A03B" }, chartLabel: { color: "#65758A", fontSize: 9, marginTop: 5, maxWidth: 42 },
});

Object.assign(styles, { action: { color: "#007D74", fontWeight: "700", marginTop: 7 }, archiveAction: { color: "#C75042", fontWeight: "700", marginTop: 7 } });
