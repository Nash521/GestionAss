import { LoadingState, LoadingLabel } from "../../src/components/loading-state";
import { useCallback, useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AdminHeader } from "../../src/components/admin-chrome";
import { useAdminHeaderScroll } from "../../src/components/use-admin-header-scroll";
import { AdminMember, AdminMembersPage, getAdminMembers } from "../../src/features/members/api";

const background = require("../../assets/Fond_ecranMobile.png");
const emptyPage: AdminMembersPage = { totalMembers: 0, membersLate: 0, membersPaid: 0, members: [] };
const PAGE_SIZE = 20;
type MemberStatusFilter = "all" | AdminMember["memberStatus"];
type PaymentFilter = "all" | AdminMember["paymentStatus"];
type RoleFilter = "all" | AdminMember["role"];
const paymentLabels: Record<PaymentFilter, string> = { all: "Toutes les cotisations", paid: "À jour", unpaid: "En retard", partial: "Partielles" };
const roleLabels: Record<RoleFilter, string> = { all: "Tous les rôles", member: "Membres", admin: "Administrateurs" };
const statusLabels: Record<MemberStatusFilter, string> = { all: "Tous les statuts", pending_membership: "En attente", active: "Actifs", suspended: "Suspendus", removed: "Supprimés" };

export default function AdminMembers() {
  const { headerTranslateY, handleHeaderScroll } = useAdminHeaderScroll();
  const [page, setPage] = useState(emptyPage); const [members, setMembers] = useState<AdminMember[]>([]); const [query, setQuery] = useState("");
  const [memberStatus, setMemberStatus] = useState<MemberStatusFilter>("all"); const [paymentStatus, setPaymentStatus] = useState<PaymentFilter>("all"); const [role, setRole] = useState<RoleFilter>("all");
  const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState(false);
  const requestSequence = useRef(0);
  const loadMembers = useCallback(async (offset = 0) => {
    const requestId = ++requestSequence.current;
    if (offset === 0) { setLoading(true); setError(false); } else setLoadingMore(true);
    try {
      const result = await getAdminMembers({ query, memberStatus, paymentStatus, role, offset, limit: PAGE_SIZE });
      if (requestId !== requestSequence.current) return;
      setPage({ ...result, members: [] });
      setMembers((current) => offset === 0 ? result.members : [...current, ...result.members.filter((member) => !current.some((existing) => existing.id === member.id))]);
    } catch { if (requestId === requestSequence.current) setError(true); }
    finally { if (requestId === requestSequence.current) { setLoading(false); setLoadingMore(false); } }
  }, [query, memberStatus, paymentStatus, role]);
  const loadMembersRef = useRef(loadMembers);
  const skipInitialFocusRefresh = useRef(true);
  useEffect(() => { loadMembersRef.current = loadMembers; }, [loadMembers]);
  useEffect(() => { requestSequence.current++; setMembers([]); const timer = setTimeout(() => { void loadMembers(0); }, 300); return () => clearTimeout(timer); }, [loadMembers]);
  useFocusEffect(useCallback(() => {
    if (skipInitialFocusRefresh.current) { skipInitialFocusRefresh.current = false; return; }
    requestSequence.current++;
    void loadMembersRef.current(0);
  }, []));
  const filter = <T extends string>(title: string, current: T, change: (value: T) => void, labels: Record<T, string>) => <View style={styles.filterGroup}><Text style={styles.filterLabel}>{title}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{(Object.keys(labels) as T[]).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: current === value }} style={[styles.filter, current === value && styles.filterActive]} onPress={() => change(value)}><Text style={[styles.filterText, current === value && styles.filterTextActive]}>{labels[value]}</Text></Pressable>)}</ScrollView></View>;
  const activeFilters = [memberStatus, paymentStatus, role].filter((value) => value !== "all").length;
  return <View style={styles.page}>
    <ScrollView onScroll={handleHeaderScroll} scrollEventThrottle={16} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}><ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}><View style={styles.content}>
      <Text style={styles.kicker}>Gestion de l’association</Text><Text style={styles.title}>Membres</Text><Text style={styles.subtitle}>Gérez les adhérents, leurs rôles et leurs droits d’adhésion.</Text>
      <View style={styles.stats}><Stat icon="users" value={page.totalMembers} label="Total membres" /><Stat icon="clock" value={page.membersLate} label="Total en retard" /><Stat icon="check-circle" value={page.membersPaid} label="Total à jour" /></View>
      <Pressable style={styles.addButton} onPress={() => router.push("/(admin)/members/new")}><Feather name="user-plus" size={19} color="#FFF" /><Text style={styles.addText}>Ajouter un membre</Text></Pressable>
      <View style={styles.search}><Feather name="search" size={19} color="#65758A" /><TextInput value={query} onChangeText={setQuery} placeholder="Rechercher un nom, téléphone" placeholderTextColor="#8A98A8" style={styles.searchInput} /></View>
      <View style={styles.filtersPanel}><View style={styles.filtersHeading}><View style={styles.filtersTitleRow}><Feather name="sliders" size={17} color="#087C70" /><Text style={styles.filtersTitle}>Filtres</Text>{activeFilters > 0 ? <Text style={styles.activeCount}>{activeFilters}</Text> : null}</View>{activeFilters > 0 ? <Pressable accessibilityRole="button" onPress={() => { setMemberStatus("all"); setPaymentStatus("all"); setRole("all"); }}><Text style={styles.reset}>Effacer</Text></Pressable> : null}</View>{filter("Statut du membre", memberStatus, setMemberStatus, statusLabels)}{filter("Cotisations", paymentStatus, setPaymentStatus, paymentLabels)}{filter("Rôle", role, setRole, roleLabels)}</View>
      <View style={styles.list}>{loading ? <LoadingState label="Chargement des membres…" /> : error ? <View style={styles.state}><Text style={styles.message}>Impossible de charger les membres.</Text><Pressable onPress={() => void loadMembers(0)}><Text style={styles.retry}>Réessayer</Text></Pressable></View> : members.length === 0 ? <Text style={styles.message}>Aucun membre ne correspond à votre recherche.</Text> : <>{members.map((member) => <MemberCard key={member.id} member={member} />)}{members.length < page.totalMembers ? <Pressable disabled={loadingMore} style={[styles.more, loadingMore && styles.disabled]} onPress={() => void loadMembers(members.length)}><LoadingLabel loading={!!(loadingMore)} style={styles.moreText}>{loadingMore ? "Chargement…" : "Voir plus"}</LoadingLabel></Pressable> : null}</>}</View>
    </View></ImageBackground></ScrollView>
    <AdminHeader translateY={headerTranslateY} />
  </View>;
}

function Stat({ icon, value, label }: { icon: keyof typeof Feather.glyphMap; value: number; label: string }) { return <View style={styles.stat}><Feather name={icon} size={18} color="#00A99D" /><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function MemberCard({ member }: { member: AdminMember }) { const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase(); const payment = member.paymentStatus === "paid" ? { label: "À jour", style: styles.paid } : member.paymentStatus === "partial" ? { label: "Partiellement réglée", style: styles.partial } : { label: "En retard", style: styles.late }; const status = { active: { label: "Actif", style: styles.active }, pending_membership: { label: "En attente", style: styles.pending }, suspended: { label: "Suspendu", style: styles.suspended }, removed: { label: "Supprimé", style: styles.removed } }[member.memberStatus]; return <Pressable accessibilityRole="button" accessibilityLabel={`Voir ${member.firstName} ${member.lastName}`} onPress={() => router.push({ pathname: "/(admin)/members/[memberId]", params: { memberId: member.id } })} style={styles.member}><View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View><View style={styles.memberInfo}><Text style={styles.memberName}>{member.firstName} {member.lastName}</Text><Text style={styles.memberPhone}>{member.phone}</Text><View style={styles.badges}><Text accessibilityLabel={`Statut : ${status.label}`} style={[styles.badge, status.style]}>{status.label}</Text><Text style={styles.roleBadge}>{member.role === "admin" ? "Administrateur" : "Membre"}</Text><Text style={[styles.badge, payment.style]}>{payment.label}</Text></View></View><Feather name="chevron-right" size={18} color="#9AADB1" /></Pressable>; }

const styles = StyleSheet.create({
  filtersPanel: { backgroundColor: "rgba(255,255,255,.97)", borderColor: "#E1EBE8", borderRadius: 18, borderWidth: 1, gap: 15, padding: 16 },
  filtersHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  filtersTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  filtersTitle: { color: "#102B3D", fontSize: 15, fontWeight: "800" },
  activeCount: { backgroundColor: "#E1F7F1", borderRadius: 10, color: "#087C70", fontSize: 11, fontWeight: "800", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 2 },
  reset: { color: "#087C70", fontSize: 12, fontWeight: "800" },
  filterGroup: { gap: 8 },
  filterLabel: { color: "#73868D", fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  page: { flex: 1 }, background: { flexGrow: 1, minHeight: "100%" }, backgroundImage: { height: "100%", resizeMode: "cover", width: "100%" }, content: { gap: 13, padding: 20, paddingBottom: 108, paddingTop: 116 }, kicker: { color: "#65758A", fontSize: 13 }, title: { color: "#102B3D", fontSize: 30, fontWeight: "800" }, subtitle: { color: "#65758A", fontSize: 14, lineHeight: 20 }, stats: { flexDirection: "row", gap: 8 }, stat: { alignItems: "center", backgroundColor: "rgba(255,255,255,.96)", borderRadius: 15, flex: 1, minHeight: 102, padding: 11 }, statValue: { color: "#102B3D", fontSize: 20, fontWeight: "800", marginTop: 5 }, statLabel: { color: "#65758A", fontSize: 10, marginTop: 3, textAlign: "center" }, addButton: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 14, flexDirection: "row", gap: 9, justifyContent: "center", minHeight: 52 }, addText: { color: "#FFF", fontWeight: "800" }, search: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 13, flexDirection: "row", gap: 9, paddingHorizontal: 14 }, searchInput: { color: "#102B3D", flex: 1, minHeight: 48 }, filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, filter: { backgroundColor: "rgba(255,255,255,.9)", borderColor: "#DDE6E8", borderRadius: 20, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 }, filterActive: { backgroundColor: "#E1F7F1", borderColor: "#00A99D" }, filterText: { color: "#65758A", fontSize: 12, fontWeight: "600" }, filterTextActive: { color: "#007D74" }, list: { gap: 10 }, state: { alignItems: "center", gap: 8, padding: 25 }, message: { color: "#65758A", padding: 24, textAlign: "center" }, retry: { color: "#00A99D", fontWeight: "800" }, more: { alignItems: "center", borderColor: "#00A99D", borderRadius: 12, borderWidth: 1, padding: 13 }, moreText: { color: "#007D74", fontWeight: "800" }, member: { alignItems: "center", backgroundColor: "rgba(255,255,255,.97)", borderRadius: 16, flexDirection: "row", gap: 11, padding: 13 }, avatar: { alignItems: "center", backgroundColor: "#DDF5F0", borderRadius: 24, height: 47, justifyContent: "center", width: 47 }, avatarText: { color: "#007D74", fontWeight: "800" }, memberInfo: { flex: 1 }, memberName: { color: "#102B3D", fontWeight: "800" }, memberPhone: { color: "#65758A", fontSize: 12, marginTop: 2 }, badges: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 7 }, badge: { borderRadius: 8, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 3 }, active: { backgroundColor: "#E1F7F1", color: "#007D74" }, pending: { backgroundColor: "#FFF2D9", color: "#A46300" }, suspended: { backgroundColor: "#FDE7E4", color: "#C75042" }, removed: { backgroundColor: "#EFF4F4", color: "#65758A" }, paid: { backgroundColor: "#E1F7F1", color: "#007D74" }, partial: { backgroundColor: "#FFF2D9", color: "#A46300" }, late: { backgroundColor: "#FDE7E4", color: "#C75042" }, roleBadge: { backgroundColor: "#EFF4F4", borderRadius: 8, color: "#65758A", fontSize: 10, overflow: "hidden", paddingHorizontal: 7, paddingVertical: 3 }, remaining: { color: "#102B3D", fontSize: 11, fontWeight: "700" }, disabled: { opacity: .55 },
});

Object.assign(styles, {
  filterRow: { alignItems: "center", flexDirection: "row", gap: 7, paddingRight: 2 },
  filter: { backgroundColor: "#F2F6F5", borderColor: "#E1EAE7", borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  filterActive: { backgroundColor: "#087C70", borderColor: "#087C70" },
  filterText: { color: "#667B82", fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: "#FFF" },
  member: { alignItems: "center", backgroundColor: "rgba(255,255,255,.98)", borderColor: "#E7EEEC", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 11, padding: 13 },
});
