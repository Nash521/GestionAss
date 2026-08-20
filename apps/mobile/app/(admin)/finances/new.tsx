import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createAdminFinanceAction, getFunctionErrorMessage } from "../../../src/lib/supabase";

type Kind = "exceptional" | "payment" | "disbursement";
const today = new Date().toISOString().slice(0, 10);
export default function NewFinance() {
  const [kind, setKind] = useState<Kind>("exceptional"); const [label, setLabel] = useState(""); const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today); const [targets, setTargets] = useState(""); const [dueId, setDueId] = useState(""); const [reference, setReference] = useState("");
  const [memberId, setMemberId] = useState(""); const [contributionId, setContributionId] = useState(""); const [justification, setJustification] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const submit = async () => {
    const numeric = Number(amount);
    if (!label.trim() || !Number.isFinite(numeric) || numeric <= 0 || !date) return setError("Libellé, montant et date sont obligatoires.");
    if (kind === "payment" && (!dueId.trim() || !reference.trim())) return setError("La référence de cotisation et le justificatif sont obligatoires.");
    if (kind === "disbursement" && (!justification.trim() || (memberId.trim() && contributionId.trim()))) return setError("Justification obligatoire; choisissez une seule cible.");
    setSaving(true); setError("");
    try {
      const action = kind === "exceptional" ? { action: "createExceptional" as const, label: label.trim(), amount: numeric, dueDate: date, targetMemberIds: targets.split(",").map((v) => v.trim()).filter(Boolean) } : kind === "payment" ? { action: "recordPayment" as const, kind: "monthly" as const, dueId: dueId.trim(), amount: numeric, paidOn: date, reference: reference.trim(), source: "manual" as const } : { action: "createDisbursement" as const, label: label.trim(), amount: numeric, disbursedOn: date, type: memberId.trim() ? "member_aid" as const : contributionId.trim() ? "exceptional_contribution_payment" as const : "general_expense" as const, beneficiaryMemberId: memberId.trim() || null, exceptionalContributionId: contributionId.trim() || null, justification: justification.trim() };
      await createAdminFinanceAction(action); router.back();
    } catch (e) { setError((await getFunctionErrorMessage(e)) ?? "Impossible d'enregistrer l'opération."); } finally { setSaving(false); }
  };
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour"><Feather name="arrow-left" size={23} color="#102B3D" /></Pressable><Text style={styles.title}>Nouvelle opération</Text><Text style={styles.subtitle}>Saisissez les informations et les références nécessaires.</Text>
    <View style={styles.choices}>{(["exceptional", "payment", "disbursement"] as Kind[]).map((value) => <Pressable key={value} onPress={() => { setKind(value); setError(""); }} style={[styles.choice, kind === value && styles.active]} accessibilityRole="button" accessibilityState={{ selected: kind === value }}><Text style={kind === value ? styles.activeText : styles.choiceText}>{value === "exceptional" ? "Cotisation exceptionnelle" : value === "payment" ? "Paiement" : "Décaissement"}</Text></Pressable>)}</View>
    {kind !== "payment" && <Field label="Libellé" value={label} onChangeText={setLabel} placeholder="Libellé de l'opération" />}{kind === "payment" && <Field label="Référence de cotisation" value={dueId} onChangeText={setDueId} placeholder="ID de cotisation" />}
    <Field label="Montant" value={amount} onChangeText={setAmount} placeholder="Montant (XOF)" keyboardType="decimal-pad" /><Field label={kind === "exceptional" ? "Date d'échéance" : "Date"} value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
    {kind === "exceptional" && <Field label="Membres ciblés (IDs séparés par des virgules)" value={targets} onChangeText={setTargets} placeholder="Tous les membres si vide" />}{kind === "payment" && <Field label="Référence / justificatif" value={reference} onChangeText={setReference} placeholder="Référence du paiement" />}
    {kind === "disbursement" && <><Field label="Membre bénéficiaire (ID)" value={memberId} onChangeText={setMemberId} placeholder="Optionnel" /><Field label="Cotisation liée (ID)" value={contributionId} onChangeText={setContributionId} placeholder="Optionnel" /><Field label="Justification obligatoire" value={justification} onChangeText={setJustification} placeholder="Expliquez la sortie de trésorerie" multiline /></>}
    {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}<Pressable disabled={saving} onPress={() => void submit()} style={[styles.submit, saving && { opacity: .5 }]} accessibilityRole="button"><Text style={styles.submitText}>{saving ? "Enregistrement…" : "Enregistrer"}</Text></Pressable>
  </ScrollView>;
}
function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }: { label: string; value: string; onChangeText: (v: string) => void; placeholder: string; keyboardType?: "decimal-pad"; multiline?: boolean }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#788798" style={[styles.input, multiline && { minHeight: 90, textAlignVertical: "top" }]} keyboardType={keyboardType} multiline accessibilityLabel={label} /></View>; }
const styles = StyleSheet.create({ page: { backgroundColor: "#F7FBFA", flexGrow: 1, gap: 12, padding: 22, paddingTop: 30 }, title: { color: "#102B3D", fontSize: 27, fontWeight: "800", marginTop: 12 }, subtitle: { color: "#65758A" }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 }, choice: { borderColor: "#DDE6E8", borderRadius: 12, borderWidth: 1, padding: 10 }, active: { backgroundColor: "#E1F7F1", borderColor: "#00A99D" }, choiceText: { color: "#65758A", fontSize: 12 }, activeText: { color: "#007D74", fontSize: 12, fontWeight: "800" }, field: { gap: 5 }, label: { color: "#102B3D", fontSize: 12, fontWeight: "700" }, input: { backgroundColor: "#FFF", borderColor: "#DDE6E8", borderRadius: 12, borderWidth: 1, color: "#102B3D", minHeight: 48, padding: 12 }, error: { color: "#C75042", textAlign: "center" }, submit: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 14, marginTop: 8, minHeight: 52, justifyContent: "center" }, submitText: { color: "#FFF", fontSize: 16, fontWeight: "800" } });
