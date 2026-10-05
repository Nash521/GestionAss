import { LoadingState, LoadingLabel } from "../src/components/loading-state";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { MemberNavigation } from "../src/components/member-navigation";
import { getMyMemberProfile, type MemberProfile } from "../src/features/member-account/api";
import { clearBiometricLogin } from "../src/lib/biometric-session";
import { getSessionDestination, getSupabaseClient } from "../src/lib/supabase";

const background = require("../assets/Fond_ecranMobile.png");
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
const dateLabel = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));

export default function Profile() {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [signOutError, setSignOutError] = useState("");
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
      const result = await getMyMemberProfile();
      if (requestId === requestSequence.current) setProfile(result);
    } catch {
      if (requestId === requestSequence.current) setError("Impossible de charger votre profil.");
    } finally {
      if (requestId === requestSequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useFocusEffect(useCallback(() => { void reload(); return () => { requestSequence.current++; }; }, [reload]));

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true); setSignOutError("");
    try {
      await clearBiometricLogin();
      const { error: authError } = await getSupabaseClient().auth.signOut({ scope: "local" });
      if (authError) throw authError;
      router.replace("/login");
    } catch {
      setSignOutError("Impossible de vous déconnecter. Réessayez.");
      setSigningOut(false);
    }
  };

  const memberStatus = profile?.memberStatus === "active" ? "Actif" : profile?.memberStatus === "suspended" ? "Suspendu" : "En attente";
  const membershipStatus = profile?.membershipStatus === "paid" ? "Droit d’adhésion validé" : profile?.membershipStatus === "partial" ? "Droit d’adhésion partiel" : "Droit d’adhésion en attente";
  const initials = profile ? `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase() : "";

  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void reload(true)} tintColor="#00A99D" />}>
      <ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}><View style={styles.content}>
        <Text style={styles.overline}>ESPACE MEMBRE</Text><Text style={styles.title}>Profil</Text><Text style={styles.subtitle}>Vos informations au sein de l’association.</Text>
        {error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void reload()}><Text style={styles.retry}>Réessayer</Text></Pressable></View> : null}
        {loading ? <View style={styles.state}><LoadingState label="Chargement de votre profil…" /></View> : profile ? <>
          <View style={styles.identity}><View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View><Text style={styles.name}>{profile.firstName} {profile.lastName}</Text><Text style={styles.memberNumber}>{profile.memberNumber}</Text><View style={styles.badges}><Text style={styles.badge}>{memberStatus}</Text><Text style={[styles.badge, profile.membershipStatus === "paid" ? styles.paid : profile.membershipStatus === "partial" ? styles.partial : styles.unpaid]}>{membershipStatus}</Text></View></View>
          <View style={styles.section}><Text style={styles.sectionTitle}>Informations personnelles</Text><InfoRow icon="phone" label="Téléphone" value={profile.phone} /><InfoRow icon="calendar" label="Membre depuis le" value={dateLabel(profile.joiningDate)} /><InfoRow icon="users" label="Association" value={profile.organizationName} /></View>
          <View style={styles.section}><Text style={styles.sectionTitle}>Droit d’adhésion</Text><View style={styles.feeRow}><Text style={styles.feeLabel}>Montant réglé</Text><Text style={styles.feeValue}>{money(profile.membershipAmountPaid)}</Text></View><View style={styles.feeRow}><Text style={styles.feeLabel}>Montant dû</Text><Text style={styles.feeValue}>{money(profile.membershipAmountDue)}</Text></View></View>
          <Pressable accessibilityRole="button" onPress={() => router.push("/notifications")} style={styles.notifications}><Feather name="bell" size={19} color="#A46300" /><Text style={styles.notificationsText}>Mes notifications</Text><Feather name="chevron-right" size={19} color="#007D74" /></Pressable>
          {signOutError ? <Text accessibilityRole="alert" style={styles.error}>{signOutError}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Se déconnecter" disabled={signingOut} onPress={() => void signOut()} style={styles.signOut}><Feather name="log-out" size={18} color="#B64337" /><LoadingLabel loading={!!(signingOut)} style={styles.signOutText}>{signingOut ? "Déconnexion…" : "Se déconnecter"}</LoadingLabel></Pressable>
        </> : null}
      </View></ImageBackground>
    </ScrollView>
    <MemberNavigation active="profile" />
  </View>;
}

function InfoRow({ icon, label, value }: { icon: "phone" | "calendar" | "users"; label: string; value: string }) {
  const iconStyle = icon === "phone" ? styles.phoneIcon : icon === "calendar" ? styles.calendarIcon : styles.associationIcon;
  const iconColor = icon === "phone" ? "#2764A5" : icon === "calendar" ? "#A46300" : "#7B4BA8";
  return <View style={styles.infoRow}><View style={[styles.infoIcon, iconStyle]}><Feather name={icon} size={17} color={iconColor} /></View><View style={styles.infoText}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, scroll: { flexGrow: 1 }, background: { flexGrow: 1, minHeight: "100%" }, backgroundImage: { height: "100%", resizeMode: "cover", width: "100%" }, content: { alignSelf: "center", gap: 15, maxWidth: 760, padding: 20, paddingBottom: 115, paddingTop: 34, width: "100%" },
  overline: { color: "#007D74", fontSize: 11, fontWeight: "800", letterSpacing: 1.3 }, title: { color: "#102B3D", fontSize: 29, fontWeight: "800", marginTop: -9 }, subtitle: { color: "#65758A", fontSize: 13, lineHeight: 19, marginTop: -9 },
  identity: { alignItems: "center", backgroundColor: "rgba(255,255,255,.97)", borderColor: "#E1EBE9", borderRadius: 18, borderWidth: 1, gap: 8, padding: 22 }, avatar: { alignItems: "center", backgroundColor: "#DDF5E9", borderRadius: 34, height: 68, justifyContent: "center", width: 68 }, avatarText: { color: "#007D74", fontSize: 25, fontWeight: "800" }, name: { color: "#102B3D", fontSize: 21, fontWeight: "800" }, memberNumber: { color: "#65758A", fontSize: 13 }, badges: { flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "center", marginTop: 4 }, badge: { backgroundColor: "#EAF7F4", borderRadius: 9, color: "#007D74", fontSize: 11, fontWeight: "800", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 6 }, paid: { backgroundColor: "#DDF5E9", color: "#007D74" }, partial: { backgroundColor: "#FFF0D6", color: "#A46300" }, unpaid: { backgroundColor: "#FDE7E4", color: "#B64337" },
  section: { backgroundColor: "rgba(255,255,255,.97)", borderColor: "#E1EBE9", borderRadius: 17, borderWidth: 1, gap: 14, padding: 17 }, sectionTitle: { color: "#102B3D", fontSize: 17, fontWeight: "800" }, infoRow: { alignItems: "center", flexDirection: "row", gap: 11 }, infoIcon: { alignItems: "center", borderRadius: 10, height: 38, justifyContent: "center", width: 38 }, phoneIcon: { backgroundColor: "#E8F2FF" }, calendarIcon: { backgroundColor: "#FFF1D8" }, associationIcon: { backgroundColor: "#F1E9FB" }, infoText: { flex: 1, gap: 2 }, infoLabel: { color: "#84939D", fontSize: 11 }, infoValue: { color: "#102B3D", fontSize: 13, fontWeight: "700" }, feeRow: { flexDirection: "row", justifyContent: "space-between" }, feeLabel: { color: "#65758A", fontSize: 13 }, feeValue: { color: "#102B3D", fontSize: 13, fontWeight: "800" },
  notifications: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#E1EBE9", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 11, minHeight: 52, paddingHorizontal: 15 }, notificationsText: { color: "#007D74", flex: 1, fontWeight: "800" }, signOut: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#EEC9C4", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 9, justifyContent: "center", minHeight: 52 }, signOutText: { color: "#B64337", fontSize: 15, fontWeight: "800" },
  state: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 16, padding: 30 }, stateText: { color: "#65758A" }, errorBox: { backgroundColor: "#FFF4F2", borderRadius: 12, gap: 8, padding: 14 }, error: { color: "#B64337", fontSize: 13 }, retry: { color: "#007D74", fontWeight: "800" },
});
