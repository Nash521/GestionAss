import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LoadingState } from "../../../src/components/loading-state";
import { getAdminMerchantLedger, recordAdminMerchantMovement, type MerchantLedger, type MerchantMovementKind } from "../../../src/features/finance/merchant-ledger-api";

const kinds: { value: MerchantMovementKind; label: string; sign: 1 | -1 }[] = [
  { value: "opening", label: "Solde initial", sign: 1 },
  { value: "receipt", label: "Entrée reçue", sign: 1 },
  { value: "disbursement", label: "Sortie / retrait", sign: -1 },
  { value: "fee", label: "Frais", sign: -1 },
  { value: "refund", label: "Remboursement reçu", sign: 1 },
  { value: "transfer_in", label: "Transfert reçu", sign: 1 },
  { value: "transfer_out", label: "Transfert envoyé", sign: -1 },
  { value: "adjustment_in", label: "Correction positive", sign: 1 },
  { value: "adjustment_out", label: "Correction négative", sign: -1 },
];
const money = (amount: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount) + " FCFA";
const today = () => new Date().toISOString().slice(0, 10);

export default function MerchantAccounts() {
  const [ledger, setLedger] = useState<MerchantLedger | null>(null);
  const [selected, setSelected] = useState("");
  const [kind, setKind] = useState<MerchantMovementKind>("opening");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminMerchantLedger();
      setLedger(result);
      setSelected((current) => result.accounts.some((account) => account.merchantId === current)
        ? current : result.accounts.find((account) => account.current)?.merchantId ?? result.accounts[0]?.merchantId ?? "");
      setError("");
    } catch { setError("Impossible de charger le registre des comptes."); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async () => {
    if (saving) return;
    const value = Number(amount);
    if (!selected || !Number.isFinite(value) || value <= 0 || value > 9999999999
      || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + "T00:00:00Z"))
      || date > today() || !description.trim() || (kind !== "opening" && !reference.trim())) {
      setError("Renseignez le compte, un montant positif, une date passée, un motif et une référence Wave (sauf pour le solde initial)."); return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      await recordAdminMerchantMovement({ merchantId: selected, kind, amount: value, occurredOn: date, description: description.trim(), reference: reference.trim() || null });
      setAmount(""); setDescription(""); setReference("");
      await load(); setNotice("Mouvement enregistré dans le registre.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };

  const movements = ledger?.movements.filter((movement) => movement.merchantId === selected) ?? [];
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.replace("/(admin)/finances")} accessibilityRole="button" style={styles.back}><Feather name="arrow-left" size={17} color="#087C70" /><Text style={styles.backText}>Finances</Text></Pressable>
    <Text style={styles.title}>Comptes marchands</Text>
    <Text style={styles.hint}>Registre manuel des mouvements par compte Wave, y compris les anciens comptes. Le solde calculé n’est pas le solde réel Wave : rapprochez-le avec le relevé du compte.</Text>
    {loading ? <LoadingState label="Chargement des comptes…" /> : null}
    {ledger?.accounts.length === 0 ? <View style={styles.card}><Text style={styles.hint}>Configurez d’abord un lien marchand Wave dans les paramètres Finance.</Text></View> : null}
    <View style={styles.accounts}>{ledger?.accounts.map((account) => <Pressable key={account.merchantId} onPress={() => setSelected(account.merchantId)} accessibilityRole="button" accessibilityState={{ selected: selected === account.merchantId }} style={[styles.account, selected === account.merchantId && styles.accountSelected]}>
      <Text style={styles.accountLabel}>{account.current ? "COMPTE ACTUEL" : "ANCIEN COMPTE"}</Text><Text style={styles.merchant} numberOfLines={1}>{account.merchantId}</Text>
      <Text style={styles.balance}>{money(account.calculatedBalance)}</Text><Text style={styles.hint}>{account.movementCount} mouvement(s) enregistré(s)</Text>
    </Pressable>)}</View>
    {selected ? <View style={styles.card}>
      <Text style={styles.section}>Ajouter un mouvement</Text>
      <Text style={styles.hint}>Saisissez seulement les opérations vérifiées sur le compte Wave. Pour un transfert, enregistrez la sortie et l’entrée sur les deux comptes avec la même référence.</Text>
      <View style={styles.kinds}>{kinds.map((item) => <Pressable key={item.value} onPress={() => setKind(item.value)} accessibilityRole="button" accessibilityState={{ selected: kind === item.value }} style={[styles.kind, kind === item.value && styles.kindSelected]}><Text style={[styles.kindText, kind === item.value && styles.kindTextSelected]}>{item.label}</Text></Pressable>)}</View>
      <Text style={styles.label}>Montant (FCFA)</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="Ex. 5000" accessibilityLabel="Montant du mouvement" style={styles.input} />
      <Text style={styles.label}>Date</Text><TextInput value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" accessibilityLabel="Date du mouvement" style={styles.input} />
      <Text style={styles.label}>Motif</Text><TextInput value={description} onChangeText={setDescription} placeholder="Ex. Cotisation reçue" accessibilityLabel="Motif du mouvement" style={styles.input} />
      {kind !== "opening" ? <><Text style={styles.label}>Référence Wave</Text><TextInput value={reference} onChangeText={setReference} placeholder="Référence figurant sur le relevé" accessibilityLabel="Référence Wave du mouvement" style={styles.input} /></> : null}
      <Pressable onPress={() => void save()} disabled={saving} accessibilityRole="button" style={[styles.save, saving && styles.disabled]}><Text style={styles.saveText}>{saving ? "Enregistrement…" : "Enregistrer le mouvement"}</Text></Pressable>
    </View> : null}
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    {notice ? <Text style={styles.success}>{notice}</Text> : null}
    {selected ? <View style={styles.card}><Text style={styles.section}>Mouvements récents</Text>{movements.length === 0 ? <Text style={styles.hint}>Aucun mouvement pour ce compte.</Text> : movements.map((item) => { const movementKind = kinds.find((entry) => entry.value === item.kind); return <View key={item.id} style={styles.movement}><View style={styles.movementMain}><Text style={styles.label}>{movementKind?.label ?? item.kind}</Text><Text style={styles.hint}>{item.occurredOn} · {item.description}{item.reference ? ` · ${item.reference}` : ""}</Text></View><Text style={[styles.movementAmount, movementKind?.sign === -1 && styles.debit]}>{movementKind?.sign === -1 ? "−" : "+"}{money(item.amount)}</Text></View>; })}</View> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { alignSelf: "center", backgroundColor: "#F6F9F8", flexGrow: 1, gap: 17, maxWidth: 800, padding: 20, paddingBottom: 100, paddingTop: 30, width: "100%" },
  back: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#E5F3EE", borderRadius: 11, flexDirection: "row", gap: 7, paddingHorizontal: 12, paddingVertical: 9 }, backText: { color: "#087C70", fontWeight: "800" },
  title: { color: "#102B3D", fontSize: 28, fontWeight: "800" }, hint: { color: "#65758A", fontSize: 12, lineHeight: 18 },
  accounts: { gap: 10 }, account: { backgroundColor: "#FFF", borderColor: "#E1EBE9", borderRadius: 16, borderWidth: 1, gap: 4, padding: 16 }, accountSelected: { borderColor: "#00A99D", borderWidth: 2 }, accountLabel: { color: "#087C70", fontSize: 10, fontWeight: "800" }, merchant: { color: "#102B3D", fontSize: 14, fontWeight: "800" }, balance: { color: "#102B3D", fontSize: 22, fontWeight: "800", marginTop: 3 },
  card: { backgroundColor: "#FFF", borderColor: "#E1EBE9", borderRadius: 18, borderWidth: 1, gap: 10, padding: 18 }, section: { color: "#102B3D", fontSize: 18, fontWeight: "800" },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, kind: { backgroundColor: "#E9F0ED", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 }, kindSelected: { backgroundColor: "#075E58" }, kindText: { color: "#65758A", fontSize: 11, fontWeight: "700" }, kindTextSelected: { color: "#FFF" },
  label: { color: "#102B3D", fontSize: 12, fontWeight: "800" }, input: { backgroundColor: "#FFF", borderColor: "#DDE6E8", borderRadius: 12, borderWidth: 1, color: "#102B3D", minHeight: 48, padding: 12 },
  save: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 12, justifyContent: "center", minHeight: 50, marginTop: 4 }, saveText: { color: "#FFF", fontWeight: "800" }, disabled: { opacity: .5 },
  movement: { alignItems: "center", borderTopColor: "#E1EBE9", borderTopWidth: 1, flexDirection: "row", gap: 8, paddingTop: 11 }, movementMain: { flex: 1, gap: 3 }, movementAmount: { color: "#087C70", fontSize: 12, fontWeight: "800" }, debit: { color: "#B4613F" },
  error: { color: "#B64337", fontSize: 12 }, success: { color: "#087C70", fontSize: 12, fontWeight: "800" },
});
