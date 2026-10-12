import { LoadingState } from "../src/components/loading-state";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getPaymentNotifications, markNotificationRead, type PaymentNotification } from "../src/features/notifications/api";
import { notificationCopy } from "../src/features/notifications/format";

const dateLabel = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function Notifications() {
  const [items, setItems] = useState<PaymentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setRefreshing(true); setError("");
    try { setItems(await getPaymentNotifications()); }
    catch { setError("Impossible de charger les notifications."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const open = async (item: PaymentNotification) => {
    if (!item.readAt) {
      try {
        await markNotificationRead(item.id);
        setItems((current) => current.map((value) => value.id === item.id ? { ...value, readAt: new Date().toISOString() } : value));
      } catch { setError("Impossible de marquer cette notification comme lue."); return; }
    }
    if (item.eventType === "exceptional_created" && item.exceptionalDueId) router.push({ pathname: "/exceptional/[dueId]", params: { dueId: item.exceptionalDueId } });
    else if (!item.isMemberRecipient) router.push({ pathname: "/(admin)/members/[memberId]", params: { memberId: item.memberId } });
  };

  const unread = items.filter((item) => !item.readAt).length;
  return <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void reload()} tintColor="#00A99D" />}>
    <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.canGoBack() ? router.back() : router.replace("/home")} style={styles.back}><Feather name="arrow-left" size={20} color="#007D74" /><Text style={styles.backText}>Retour</Text></Pressable>
    <View style={styles.heading}><View><Text style={styles.title}>Notifications</Text><Text style={styles.subtitle}>{unread ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Vous êtes à jour"}</Text></View><View style={styles.bell}><Feather name="bell" size={23} color="#A46300" /></View></View>
    <Text style={styles.intro}>Nouvelles cotisations exceptionnelles et paiements enregistrés pour vos cotisations.</Text>
    {error ? <View style={styles.errorBox}><Text style={styles.error} accessibilityRole="alert">{error}</Text><Pressable onPress={() => void reload()} accessibilityRole="button"><Text style={styles.retry}>Réessayer</Text></Pressable></View> : null}
    {loading ? <LoadingState label="Chargement des notifications…" /> : items.length === 0 && !error ? <View style={styles.emptyCard}><Feather name="inbox" size={30} color="#8BA6A3" /><Text style={styles.empty}>Aucune notification pour le moment.</Text></View> : null}
    {items.map((item) => {
      const copy = notificationCopy(item, item.isMemberRecipient);
      const icon = item.kind === "membership" ? "award" : item.kind === "exceptional" ? "gift" : "calendar";
      const iconStyle = item.kind === "membership" ? styles.membershipIcon : item.kind === "exceptional" ? styles.exceptionalIcon : styles.monthlyIcon;
      const iconColor = item.kind === "membership" ? "#007D74" : item.kind === "exceptional" ? "#813E9F" : "#3659B5";
      return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.readAt ? "Lue" : "Non lue"}, ${copy.title}`} onPress={() => void open(item)} style={[styles.card, !item.readAt && styles.unreadCard]}>
        <View style={[styles.icon, iconStyle]}><Feather name={icon} size={21} color={iconColor} /></View>
        <View style={styles.cardContent}><View style={styles.cardTitleRow}><Text style={styles.cardTitle}>{copy.title}</Text>{!item.readAt ? <View style={styles.dot} /> : null}</View><Text style={styles.body}>{copy.body}</Text><Text style={styles.date}>{dateLabel(item.createdAt)}</Text>{!item.isMemberRecipient ? <Text style={styles.openMember}>Voir la fiche du membre →</Text> : null}</View>
      </Pressable>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { alignSelf: "center", backgroundColor: "#FFF", flexGrow: 1, gap: 15, maxWidth: 760, padding: 20, paddingBottom: 50, paddingTop: 30, width: "100%" },
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 7, minHeight: 38 }, backText: { color: "#007D74", fontWeight: "800" },
  heading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 5 }, title: { color: "#102B3D", fontSize: 29, fontWeight: "800" }, subtitle: { color: "#007D74", fontSize: 14, fontWeight: "700", marginTop: 4 },
  bell: { alignItems: "center", backgroundColor: "#FFF1D8", borderRadius: 18, height: 50, justifyContent: "center", width: 50 }, intro: { color: "#65758A", fontSize: 13, lineHeight: 19, marginBottom: 6 },
  card: { backgroundColor: "#FFF", borderColor: "#E1EBE9", borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 13, padding: 16 }, unreadCard: { borderColor: "#76B9AF", borderWidth: 1.5 },
  icon: { alignItems: "center", borderRadius: 13, height: 43, justifyContent: "center", width: 43 }, membershipIcon: { backgroundColor: "#EAF7F4" }, monthlyIcon: { backgroundColor: "#EAF0FF" }, exceptionalIcon: { backgroundColor: "#F5EAF9" }, cardContent: { flex: 1, gap: 6 }, cardTitleRow: { alignItems: "flex-start", flexDirection: "row", gap: 7 }, cardTitle: { color: "#102B3D", flex: 1, fontSize: 14, fontWeight: "800", lineHeight: 20 }, dot: { backgroundColor: "#00A99D", borderRadius: 5, height: 9, marginTop: 5, width: 9 },
  body: { color: "#506275", fontSize: 13, lineHeight: 19 }, date: { color: "#84939D", fontSize: 11, marginTop: 2 }, openMember: { color: "#007D74", fontSize: 12, fontWeight: "700", marginTop: 3 },
  emptyCard: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 17, gap: 10, padding: 28 }, empty: { color: "#65758A", fontSize: 14, textAlign: "center" }, errorBox: { backgroundColor: "#FFF4F2", borderRadius: 12, gap: 8, padding: 14 }, error: { color: "#B64337", fontSize: 13 }, retry: { color: "#007D74", fontWeight: "800" },
});
