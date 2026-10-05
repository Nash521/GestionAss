import { LoadingState, LoadingLabel } from "../../components/loading-state";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getAdminFinance, getAdminMembers, type ExceptionalContribution } from "../../lib/supabase";

export type DisbursementTarget = { id: string; label: string; description: string };

export function DisbursementTargetPicker({ kind, onSelect, onClose }: {
  kind: "member" | "contribution"; onSelect: (target: DisbursementTarget) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<DisbursementTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const contributions = useRef<ExceptionalContribution[] | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async (offset = 0) => {
    const requestId = ++sequence.current;
    setError("");
    if (offset) setLoadingMore(true); else { setLoading(true); setItems([]); }
    try {
      let targets: DisbursementTarget[];
      let more: boolean;
      if (kind === "member") {
        const result = await getAdminMembers({ query: search, offset, limit: 30 });
        targets = result.members.map((member) => ({ id: member.id, label: `${member.firstName} ${member.lastName}`, description: member.phone }));
        more = targets.length === 30;
      } else {
        if (!contributions.current) {
          const all: ExceptionalContribution[] = [];
          let total = 1;
          while (all.length < total) {
            const result = await getAdminFinance("exceptional", all.length, 50);
            if (requestId !== sequence.current) return;
            all.push(...result.items as ExceptionalContribution[]);
            total = result.metadata.total;
            if (!result.items.length) break;
          }
          contributions.current = all;
        }
        const matches = contributions.current.filter((item) => item.label.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr")));
        targets = matches.slice(offset, offset + 30).map((item) => ({ id: item.id, label: item.label, description: `${new Intl.NumberFormat("fr-FR").format(item.amount)} FCFA par membre` }));
        more = offset + targets.length < matches.length;
      }
      if (requestId !== sequence.current) return;
      setItems((current) => offset ? [...current, ...targets] : targets); setHasMore(more);
    } catch {
      if (requestId === sequence.current) setError("Impossible de charger la liste. Réessayez.");
    } finally {
      if (requestId === sequence.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [kind, search]);
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);

  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}><View style={styles.dialog}>
      <View style={styles.heading}><Text style={styles.title}>{kind === "member" ? "Choisir le bénéficiaire" : "Choisir la cotisation"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fermer la sélection" onPress={onClose} style={styles.close}><Feather name="x" size={22} color="#173343" /></Pressable></View>
      <View style={styles.search}><Feather name="search" size={18} color="#65758A" /><TextInput accessibilityLabel={kind === "member" ? "Rechercher un bénéficiaire" : "Rechercher une cotisation"} placeholder={kind === "member" ? "Nom, prénom ou téléphone" : "Nom de la cotisation"} value={query} onChangeText={setQuery} autoCorrect={false} style={styles.input} /></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        {loading || search !== query.trim() ? <LoadingState label="Chargement…" /> : <>
          {items.map((target) => <Pressable key={target.id} accessibilityRole="button" onPress={() => onSelect(target)} style={styles.item}><View style={styles.identity}><Text style={styles.name}>{target.label}</Text><Text style={styles.description}>{target.description}</Text></View><Feather name="chevron-right" size={18} color="#087C70" /></Pressable>)}
          {!items.length && !error ? <Text style={styles.message}>Aucun résultat.</Text> : null}
          {error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load(items.length)}><Text style={styles.action}>Réessayer</Text></Pressable></View> : hasMore ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void load(items.length)} style={styles.more}><LoadingLabel loading={!!(loadingMore)} style={styles.action}>{loadingMore ? "Chargement…" : "Afficher plus"}</LoadingLabel></Pressable> : null}
        </>}
      </ScrollView>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(16,43,61,.45)", justifyContent: "center", padding: 20 }, dialog: { backgroundColor: "#FFF", borderRadius: 20, padding: 18, maxHeight: "80%", width: "100%", maxWidth: 600, alignSelf: "center", gap: 15 }, heading: { flexDirection: "row", alignItems: "center", gap: 8 }, title: { flex: 1, color: "#173343", fontSize: 18, fontWeight: "800" }, close: { padding: 8 }, search: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#F6F9F8", borderRadius: 12, paddingHorizontal: 12 }, input: { flex: 1, minWidth: 0, minHeight: 48, color: "#173343", fontSize: 13 }, list: { gap: 7 }, item: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: "#E8EFED" }, identity: { flex: 1, gap: 5 }, name: { color: "#173343", fontWeight: "700", fontSize: 14 }, description: { color: "#738690", fontSize: 12 }, message: { textAlign: "center", color: "#738690", padding: 20 }, action: { color: "#087C70", fontWeight: "800" }, more: { padding: 15, alignItems: "center" }, state: { gap: 10, padding: 15, alignItems: "center" }, error: { color: "#B64337" },
});
