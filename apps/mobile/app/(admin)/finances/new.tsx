import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createAdminFinanceAction, getFunctionErrorMessage } from "../../../src/lib/supabase";

type Kind = "monthly" | "exceptional" | "payment" | "disbursement";
type PaymentKind = "membership" | "monthly" | "exceptional";

const today = new Date().toISOString().slice(0, 10);
const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export default function NewFinance() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const initialKind: Kind = params.kind === "monthly" ? "monthly" : params.kind === "payment" ? "payment" : params.kind === "disbursement" ? "disbursement" : "exceptional";

  const [kind, setKind] = useState<Kind>(initialKind);
  const [paymentKind, setPaymentKind] = useState<PaymentKind>("monthly");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [targets, setTargets] = useState("");
  const [dueId, setDueId] = useState("");
  const [reference, setReference] = useState("");
  const [memberId, setMemberId] = useState("");
  const [contributionId, setContributionId] = useState("");
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!isValidDate(date)) {
      setError("Saisissez une date valide au format AAAA-MM-JJ.");
      return;
    }

    const numeric = Number(amount);
    if (kind !== "monthly" && (!Number.isFinite(numeric) || numeric <= 0)) {
      setError("Le montant doit être supérieur à zéro.");
      return;
    }
    if ((kind === "exceptional" || kind === "disbursement") && !label.trim()) {
      setError("Le libellé est obligatoire.");
      return;
    }
    if (kind === "payment" && !dueId.trim()) {
      setError("La référence de la cotisation à régler est obligatoire.");
      return;
    }
    if (kind === "disbursement" && (!justification.trim() || (memberId.trim() && contributionId.trim()))) {
      setError("Justification obligatoire ; choisissez au maximum une cible.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (kind === "monthly") {
        await createAdminFinanceAction({ action: "generateMonthly", month: `${date.slice(0, 7)}-01` });
      } else if (kind === "exceptional") {
        await createAdminFinanceAction({
          action: "createExceptional",
          label: label.trim(),
          amount: numeric,
          dueDate: date,
          targetMemberIds: targets.split(",").map((value) => value.trim()).filter(Boolean),
        });
      } else if (kind === "payment") {
        await createAdminFinanceAction({
          action: "recordPayment",
          kind: paymentKind,
          dueId: dueId.trim(),
          amount: numeric,
          paidOn: date,
          reference: reference.trim(),
          source: "manual",
        });
      } else {
        await createAdminFinanceAction({
          action: "createDisbursement",
          label: label.trim(),
          amount: numeric,
          disbursedOn: date,
          type: memberId.trim() ? "member_aid" : contributionId.trim() ? "exceptional_contribution_payment" : "general_expense",
          beneficiaryMemberId: memberId.trim() || null,
          exceptionalContributionId: contributionId.trim() || null,
          justification: justification.trim(),
        });
      }
      router.back();
    } catch (submissionError) {
      setError((await getFunctionErrorMessage(submissionError)) ?? "Impossible d'enregistrer l'opération.");
    } finally {
      setSaving(false);
    }
  };

  const paymentDueLabel = paymentKind === "membership"
    ? "ID du droit d’adhésion"
    : paymentKind === "exceptional"
      ? "ID de la cotisation exceptionnelle"
      : "ID de la mensualité";

  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
      <Feather name="arrow-left" size={23} color="#102B3D" />
    </Pressable>
    <Text style={styles.title}>Nouvelle opération</Text>
    <Text style={styles.subtitle}>Saisissez les informations nécessaires à l’opération.</Text>

    <View style={styles.choices}>
      {(["monthly", "exceptional", "payment", "disbursement"] as const).map((value) => (
        <Pressable
          key={value}
          onPress={() => { setKind(value); setError(""); }}
          style={[styles.choice, kind === value && styles.active]}
          accessibilityRole="button"
          accessibilityState={{ selected: kind === value }}
        >
          <Text style={kind === value ? styles.activeText : styles.choiceText}>
            {value === "monthly" ? "Générer les mensualités" : value === "exceptional" ? "Cotisation exceptionnelle" : value === "payment" ? "Paiement" : "Décaissement"}
          </Text>
        </Pressable>
      ))}
    </View>

    {(kind === "exceptional" || kind === "disbursement") && (
      <Field label="Libellé" value={label} onChangeText={setLabel} placeholder="Libellé de l'opération" />
    )}

    {kind === "payment" && <>
      <View style={styles.field}>
        <Text style={styles.label}>Type de cotisation</Text>
        <View style={styles.paymentKinds}>
          {(["membership", "monthly", "exceptional"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => { setPaymentKind(value); setDueId(""); setError(""); }}
              style={[styles.paymentKind, paymentKind === value && styles.paymentKindActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: paymentKind === value }}
            >
              <Text style={paymentKind === value ? styles.paymentKindTextActive : styles.paymentKindText}>
                {value === "membership" ? "Adhésion" : value === "monthly" ? "Mensualité" : "Exceptionnelle"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Field label={paymentDueLabel} value={dueId} onChangeText={setDueId} placeholder="Identifiant de la cotisation" />
    </>}

    {kind !== "monthly" && (
      <Field label="Montant" value={amount} onChangeText={setAmount} placeholder="Montant (XOF)" keyboardType="decimal-pad" />
    )}
    <Field label={kind === "exceptional" ? "Date d'échéance" : kind === "monthly" ? "Mois à générer" : "Date"} value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />

    {kind === "exceptional" && (
      <Field label="Membres ciblés (IDs séparés par des virgules)" value={targets} onChangeText={setTargets} placeholder="Tous les membres si vide" />
    )}
    {kind === "payment" && (
      <Field label="Référence / justificatif" value={reference} onChangeText={setReference} placeholder="Référence du paiement" />
    )}
    {kind === "disbursement" && <>
      <Field label="Membre bénéficiaire (ID)" value={memberId} onChangeText={setMemberId} placeholder="Optionnel" />
      <Field label="Cotisation liée (ID)" value={contributionId} onChangeText={setContributionId} placeholder="Optionnel" />
      <Field label="Justification obligatoire" value={justification} onChangeText={setJustification} placeholder="Expliquez la sortie de trésorerie" multiline />
    </>}

    {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
    <Pressable disabled={saving} onPress={() => void submit()} style={[styles.submit, saving && styles.disabled]} accessibilityRole="button">
      <Text style={styles.submitText}>{saving ? "Enregistrement…" : "Enregistrer"}</Text>
    </Pressable>
  </ScrollView>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "decimal-pad"; multiline?: boolean }) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#788798"
      style={[styles.input, multiline && styles.multiline]}
      keyboardType={keyboardType}
      multiline={multiline}
      accessibilityLabel={label}
    />
  </View>;
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#F7FBFA", flexGrow: 1, gap: 12, padding: 22, paddingTop: 30 },
  title: { color: "#102B3D", fontSize: 27, fontWeight: "800", marginTop: 12 },
  subtitle: { color: "#65758A" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  choice: { borderColor: "#DDE6E8", borderRadius: 12, borderWidth: 1, padding: 10 },
  active: { backgroundColor: "#E1F7F1", borderColor: "#00A99D" },
  choiceText: { color: "#65758A", fontSize: 12 },
  activeText: { color: "#007D74", fontSize: 12, fontWeight: "800" },
  field: { gap: 5 },
  label: { color: "#102B3D", fontSize: 12, fontWeight: "700" },
  input: { backgroundColor: "#FFF", borderColor: "#DDE6E8", borderRadius: 12, borderWidth: 1, color: "#102B3D", minHeight: 48, padding: 12 },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  paymentKinds: { flexDirection: "row", gap: 7 },
  paymentKind: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#DDE6E8", borderRadius: 11, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 6 },
  paymentKindActive: { backgroundColor: "#E1F7F1", borderColor: "#00A99D" },
  paymentKindText: { color: "#65758A", fontSize: 11, textAlign: "center" },
  paymentKindTextActive: { color: "#007D74", fontSize: 11, fontWeight: "800", textAlign: "center" },
  error: { color: "#C75042", textAlign: "center" },
  submit: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 14, justifyContent: "center", marginTop: 8, minHeight: 52 },
  disabled: { opacity: .5 },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
