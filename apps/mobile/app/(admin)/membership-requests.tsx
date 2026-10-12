import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AdminHeader } from "../../src/components/admin-chrome";
import { useAdminHeaderScroll } from "../../src/components/use-admin-header-scroll";
import { getSupabaseClient, invokeRegistrationFunction } from "../../src/lib/supabase";
import { LoadingLabel, LoadingState } from "../../src/components/loading-state";

type Request = { id: string; first_name: string; last_name: string; phone: string; submitted_at: string };

export default function MembershipRequests() {
  const { headerTranslateY, handleHeaderScroll } = useAdminHeaderScroll();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: loadError } = await getSupabaseClient().from("membership_requests").select("id, first_name, last_name, phone, submitted_at").eq("status", "pending").order("submitted_at");
      if (loadError) throw loadError;
      setRequests(data ?? []); setError(null);
    } catch { setError("Impossible de charger les demandes."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const decide = async (requestId: string, decision: "approved" | "rejected") => {
    if (decision === "rejected" && !reason.trim()) { setError("Le motif du refus est obligatoire."); return; }
    setBusyId(requestId); setError(null);
    try {
      await invokeRegistrationFunction("decide-membership-request", { requestId, decision, reason: decision === "rejected" ? reason.trim() : undefined });
      setRejectingId(null); setReason(""); await load();
    } catch { setError("La décision n’a pas pu être enregistrée."); }
    finally { setBusyId(null); }
  };

  return <View style={styles.page}>
    <View style={styles.content}><Text style={styles.title}>Demandes d’adhésion</Text>
    {error ? <Text style={styles.error}>{error}</Text> : null}</View>
    <FlatList onScroll={handleHeaderScroll} scrollEventThrottle={16} data={requests} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListEmptyComponent={loading ? <LoadingState label="Chargement des demandes…" /> : error ? null : <Text style={styles.empty}>Aucune demande en attente.</Text>} renderItem={({ item }) => <View style={styles.card}>
      <Text style={styles.name}>{item.first_name} {item.last_name}</Text><Text style={styles.phone}>{item.phone}</Text>
      {rejectingId === item.id ? <><TextInput value={reason} onChangeText={setReason} placeholder="Motif du refus" style={styles.input} multiline /><Pressable style={styles.reject} onPress={() => decide(item.id, "rejected")} disabled={busyId === item.id}><LoadingLabel loading={busyId === item.id} style={styles.rejectLabel}>{busyId === item.id ? "Enregistrement…" : "Confirmer le refus"}</LoadingLabel></Pressable></> : <View style={styles.actions}>
        <Pressable style={styles.approve} onPress={() => Alert.alert("Approuver ?", `Valider ${item.first_name} ${item.last_name} ?`, [{ text: "Annuler", style: "cancel" }, { text: "Approuver", onPress: () => { void decide(item.id, "approved"); } }])} disabled={busyId === item.id}><LoadingLabel loading={busyId === item.id} style={styles.approveLabel}>{busyId === item.id ? "Enregistrement…" : "Approuver"}</LoadingLabel></Pressable>
        <Pressable style={styles.refuse} onPress={() => setRejectingId(item.id)} disabled={busyId === item.id}><Text style={styles.refuseLabel}>Refuser</Text></Pressable>
      </View>}
    </View>} /><AdminHeader translateY={headerTranslateY} />
  </View>;
}

const styles = StyleSheet.create({ page: { backgroundColor: "#F3FAF5", flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 112 }, title: { color: "#102B3D", fontSize: 25, fontWeight: "700" }, error: { color: "#B3261E", marginTop: 10 }, list: { gap: 12, paddingBottom: 104, paddingHorizontal: 20, paddingTop: 18 }, empty: { color: "#506275", textAlign: "center" }, card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16 }, name: { color: "#102B3D", fontSize: 17, fontWeight: "700" }, phone: { color: "#506275", marginTop: 4 }, actions: { flexDirection: "row", gap: 8, marginTop: 14 }, approve: { backgroundColor: "#00A99D", borderRadius: 9, flex: 1, padding: 10 }, approveLabel: { color: "#FFFFFF", fontWeight: "700", textAlign: "center" }, refuse: { borderColor: "#B3261E", borderRadius: 9, borderWidth: 1, flex: 1, padding: 10 }, refuseLabel: { color: "#B3261E", fontWeight: "700", textAlign: "center" }, input: { borderColor: "#C4D2D9", borderRadius: 9, borderWidth: 1, marginTop: 14, minHeight: 70, padding: 10 }, reject: { backgroundColor: "#B3261E", borderRadius: 9, marginTop: 8, padding: 10 }, rejectLabel: { color: "#FFFFFF", fontWeight: "700", textAlign: "center" } });
