import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createAdminFinanceAction, getFunctionErrorMessage } from "../../../src/lib/supabase";

const today = new Date().toISOString().slice(0, 10);
const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export default function NewFinance() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const disbursement = kind === "disbursement";
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [memberId, setMemberId] = useState("");
  const [contributionId, setContributionId] = useState("");
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const numeric = Number(amount);
    if (!label.trim()) { setError("Le libellé est obligatoire."); return; }
    if (!Number.isFinite(numeric) || numeric <= 0) { setError("Le montant doit être supérieur à zéro."); return; }
    if (!isValidDate(date)) { setError("Saisissez une date valide au format AAAA-MM-JJ."); return; }
    if (disbursement && (!justification.trim() || (memberId.trim() && contributionId.trim()))) { setError("Justification obligatoire ; choisissez au maximum une cible."); return; }
    setSaving(true); setError("");
    try {
      if (disbursement) {
        await createAdminFinanceAction({
          action: "createDisbursement", label: label.trim(), amount: numeric, disbursedOn: date,
          type: memberId.trim() ? "member_aid" : contributionId.trim() ? "exceptional_contribution_payment" : "general_expense",
          beneficiaryMemberId: memberId.trim() || null,
          exceptionalContributionId: contributionId.trim() || null,
          justification: justification.trim(),
        });
      } else {
        await createAdminFinanceAction({ action: "createExceptional", label: label.trim(), amount: numeric, dueDate: date, targetMemberIds: [] });
      }
      router.replace("/(admin)/finances");
    } catch (submissionError) {
      setError((await getFunctionErrorMessage(submissionError)) ?? "Impossible d’enregistrer l’opération.");
    } finally { setSaving(false); }
  };

  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.replace("/(admin)/finances")} accessibilityRole="button" accessibilityLabel="Retour aux finances" style={styles.back}><Feather name="arrow-left" size={19} color="#087C70" /><Text style={styles.backText}>Finances</Text></Pressable>
    <View style={styles.heading}><View style={[styles.headingIcon, disbursement && styles.headingIconExpense]}><Feather name={disbursement ? "arrow-up-right" : "gift"} size={22} color={disbursement ? "#B4613F" : "#087C70"} /></View><Text style={styles.kicker}>{disbursement ? "SORTIE DE TRÉSORERIE" : "COTISATION EXCEPTIONNELLE"}</Text><Text style={styles.title}>{disbursement ? "Nouveau décaissement" : "Créer une cotisation"}</Text><Text style={styles.subtitle}>{disbursement ? "Renseignez le montant, la date et le motif de la dépense." : "La cotisation sera créée pour tous les membres actifs."}</Text></View>
    <View style={styles.formSection}><View style={styles.formSectionTitle}><Feather name="file-text" size={17} color="#087C70" /><Text style={styles.formSectionText}>{disbursement ? "Informations du décaissement" : "Informations de la cotisation"}</Text></View><Field label="Libellé" value={label} onChangeText={setLabel} placeholder={disbursement ? "Ex. Achat de fournitures" : "Ex. Fonds de solidarité"} /><Field label="Montant" value={amount} onChangeText={setAmount} placeholder="Montant en FCFA" keyboardType="decimal-pad" /><Field label={disbursement ? "Date du décaissement" : "Date d’échéance"} value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" /><Text style={styles.help}>Format de date : AAAA-MM-JJ</Text></View>
    {disbursement ? <View style={styles.formSection}><View style={styles.formSectionTitle}><Feather name="align-left" size={17} color="#087C70" /><Text style={styles.formSectionText}>Motif et affectation</Text></View><Field label="Justification" value={justification} onChangeText={setJustification} placeholder="Expliquez la sortie de trésorerie" multiline /><Text style={styles.help}>La justification est obligatoire pour enregistrer la dépense.</Text><View style={styles.separator} /><Text style={styles.optional}>LIEN FACULTATIF</Text><Field label="Membre bénéficiaire (ID)" value={memberId} onChangeText={setMemberId} placeholder="Identifiant du membre, si concerné" /><Field label="Cotisation liée (ID)" value={contributionId} onChangeText={setContributionId} placeholder="Identifiant de la cotisation, si concernée" /><Text style={styles.help}>Renseignez au maximum un des deux identifiants.</Text></View> : null}
    {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
    <Pressable disabled={saving} onPress={() => void submit()} style={[styles.submit, saving && styles.disabled]} accessibilityRole="button"><Feather name="check" size={19} color="#FFF" /><Text style={styles.submitText}>{saving ? "Enregistrement…" : disbursement ? "Enregistrer le décaissement" : "Créer la cotisation"}</Text></Pressable>
  </ScrollView>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "decimal-pad"; multiline?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#788798" style={[styles.input, multiline && styles.multiline]} keyboardType={keyboardType} multiline={multiline} accessibilityLabel={label} /></View>;
}

const styles = StyleSheet.create({
  page: { alignSelf: "center", backgroundColor: "#F6F9F8", flexGrow: 1, gap: 18, maxWidth: 760, padding: 20, paddingBottom: 76, paddingTop: 30, width: "100%" },
  back: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#E5F3EE", borderRadius: 11, flexDirection: "row", gap: 7, paddingHorizontal: 12, paddingVertical: 9 }, backText: { color: "#087C70", fontSize: 13, fontWeight: "800" },
  heading: { gap: 7, marginTop: 9 }, headingIcon: { alignItems: "center", backgroundColor: "#E4F5EF", borderRadius: 14, height: 50, justifyContent: "center", marginBottom: 5, width: 50 }, headingIconExpense: { backgroundColor: "#FFF0E8" }, kicker: { color: "#087C70", fontSize: 10, fontWeight: "800", letterSpacing: 1 }, title: { color: "#102B3D", fontSize: 28, fontWeight: "800" }, subtitle: { color: "#65758A", fontSize: 13, lineHeight: 20 },
  formSection: { backgroundColor: "#FFF", borderColor: "#E5EDEB", borderRadius: 19, borderWidth: 1, gap: 15, padding: 19 }, formSectionTitle: { alignItems: "center", flexDirection: "row", gap: 9, marginBottom: 2 }, formSectionText: { color: "#173343", fontSize: 16, fontWeight: "800" }, field: { gap: 7 }, label: { color: "#173343", fontSize: 12, fontWeight: "800" }, input: { backgroundColor: "#FAFCFB", borderColor: "#DCE8E3", borderRadius: 11, borderWidth: 1, color: "#102B3D", minHeight: 50, paddingHorizontal: 13, paddingVertical: 10 }, multiline: { minHeight: 98, textAlignVertical: "top" }, help: { color: "#84959D", fontSize: 11, lineHeight: 16 }, separator: { backgroundColor: "#E9EFED", height: 1 }, optional: { color: "#8A9BA0", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  error: { backgroundColor: "#FDECE9", borderRadius: 11, color: "#C75042", padding: 12, textAlign: "center" }, submit: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 14, flexDirection: "row", gap: 9, justifyContent: "center", marginTop: 3, minHeight: 56 }, disabled: { opacity: .5 }, submitText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
