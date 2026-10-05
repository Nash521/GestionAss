import { LoadingState, LoadingLabel } from "../../../../src/components/loading-state";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { monthlyPaymentSelection } from "../../../../src/features/members/monthly-payment-selection";
import { getMyMemberWavePaymentLink, getMyMonthlyPaymentContext } from "../../../../src/features/member-dashboard/api";
import { normalizeWavePaymentLink } from "../../../../src/features/admin-configuration/wave";
import { createAdminFinanceAction, getFunctionErrorMessage, getMonthlyPaymentContext, type MonthlyPaymentContext } from "../../../../src/lib/supabase";

const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);

export default function MonthlyPaymentMethod({ memberMonth }: { memberMonth?: string } = {}) {
  const { memberId, dueId, amount: requestedAmount, selectedYear } = useLocalSearchParams<{ memberId: string; dueId: string; amount: string; selectedYear?: string }>();
  const amount = Number(requestedAmount);
  const [context, setContext] = useState<MonthlyPaymentContext | null>(null);
  const [source, setSource] = useState<"manual" | "wave" | null>(null);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [waveUrl, setWaveUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if ((memberMonth ? !/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(memberMonth) : !memberId || !dueId) || !Number.isInteger(amount) || amount <= 0) { setLoading(false); setError("Montant ou mensualité invalide."); return; }
    const request = memberMonth
      ? Promise.all([getMyMonthlyPaymentContext(memberMonth), getMyMemberWavePaymentLink()]).then(([id, url]) => ({ id, url }))
      : getMonthlyPaymentContext(memberId, dueId).then(({ id }) => ({ id, url: null }));
    void request.then(({ id, url }) => { if (active) { setContext(id); setWaveUrl(url ? normalizeWavePaymentLink(url) : null); } }).catch(() => { if (active) setError("Impossible de vérifier cette mensualité."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [memberId, dueId, amount, memberMonth]);

  const selection = context ? monthlyPaymentSelection(context) : null;
  const amountValid = !!selection && selection.options.some((option) => option.amount === amount);
  const submit = async () => {
    if (!context || !source || !amountValid || saving) return;
    if (memberMonth) {
      if (source === "manual") { router.replace({ pathname: "/monthly/[month]", params: { month: memberMonth } }); return; }
      if (!waveUrl) { setError("Le lien de paiement Wave n’est pas encore configuré."); return; }
      try {
        if (Platform.OS === "web") {
          const opened = globalThis.open(waveUrl, "_blank");
          if (!opened) throw new Error("Fenêtre bloquée");
          opened.opener = null;
        } else await Linking.openURL(waveUrl);
      } catch { setError("Impossible d’ouvrir Wave. Réessayez ou vérifiez les fenêtres bloquées."); }
      return;
    }
    if (source === "wave" && !reference.trim()) { setError("Saisissez la référence du paiement Wave reçu."); return; }
    setSaving(true);
    setError("");
    try {
      const { id: fresh } = await getMonthlyPaymentContext(memberId, dueId);
      const freshSelection = monthlyPaymentSelection(fresh);
      if (!freshSelection.options.some((option) => option.amount === amount) || fresh.paymentCount !== context.paymentCount || fresh.amountRemaining !== context.amountRemaining || fresh.maxPayments !== context.maxPayments) {
        setContext(fresh);
        setError("La mensualité a changé. Revenez au choix du montant pour l’actualiser.");
        return;
      }
      await createAdminFinanceAction({ action: "recordMonthlyStepPayment", memberId, dueId, amount, paidOn: new Date().toISOString().slice(0, 10), reference: source === "wave" ? reference.trim() : "", source });
      router.replace({ pathname: "/(admin)/members/[memberId]", params: { memberId, paymentUpdated: String(Date.now()), selectedYear: selectedYear ?? "" } });
    } catch (submissionError) {
      const message = await getFunctionErrorMessage(submissionError);
      setError(message === "Payment installment limit reached" ? "Le nombre maximal de versements est atteint. Actualisez la mensualité." : message === "Payment must settle remaining balance on final installment" ? "Le dernier versement doit régler tout le solde. Revenez au choix du montant." : message === "Payment amount is not an allowed installment" ? "Le montant ne correspond plus à un palier autorisé. Revenez au choix du montant." : message ?? "Impossible d’enregistrer le paiement.");
    } finally {
      setSaving(false);
    }
  };

  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => memberMonth ? router.replace({ pathname: "/monthly/[month]/pay", params: { month: memberMonth } }) : router.replace({ pathname: "/(admin)/members/[memberId]/monthly-payment", params: { memberId, dueId, selectedYear: selectedYear ?? "" } })} accessibilityRole="button" accessibilityLabel="Retour au montant" style={styles.back}><Feather name="arrow-left" size={20} color="#007D74" /><Text style={styles.backText}>Retour</Text></Pressable>
    <Text style={styles.step}>Étape 2 sur 2</Text>
    <Text style={styles.title}>Mode de paiement</Text>
    {loading ? <LoadingState label="Vérification de la mensualité…" /> : context ? <>
      <View style={styles.summary}><Text style={styles.member}>{context.memberName}</Text><Text style={styles.month}>Mensualité de {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${context.month.slice(0, 10)}T00:00:00`))}</Text><Text style={styles.amount}>{money(amount)}</Text><Text style={styles.message}>Reste après ce paiement : {money(Math.max(0, context.amountRemaining - amount))}</Text></View>
      {!amountValid ? <Text style={styles.error}>Ce montant ne peut plus être enregistré. Revenez au choix du montant.</Text> : <>
        <Text style={styles.label}>{memberMonth ? "Comment souhaitez-vous payer ?" : "Comment le paiement a-t-il été reçu ?"}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: source === "wave", disabled: !!memberMonth && !waveUrl }} disabled={!!memberMonth && !waveUrl} onPress={() => { setSource("wave"); setError(""); }} style={[styles.choice, source === "wave" && styles.choiceSelected, memberMonth && !waveUrl && styles.disabled]}>
          <Image source={require("../../../../assets/wave-logo.png")} style={styles.waveLogo} resizeMode="cover" accessibilityLabel="Logo Wave" />
          <View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Wave</Text><Text style={styles.message}>{memberMonth ? waveUrl ? "Ouvrir le paiement Wave" : "Lien Wave non configuré" : "Paiement reçu par Wave"}</Text></View>
          {source === "wave" ? <Feather name="check-circle" size={22} color="#00A99D" /> : null}
        </Pressable>
        {memberMonth ? <>
          <View style={[styles.choice, styles.disabled]} accessibilityLabel="Orange Money indisponible"><Image source={require("../../../../assets/orange-money-logo.jpg")} style={styles.providerLogo} resizeMode="contain" accessibilityLabel="Logo Orange Money" /><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Orange Money</Text><Text style={styles.message}>Paiement en ligne indisponible pour le moment</Text></View></View>
          <View style={[styles.choice, styles.disabled]} accessibilityLabel="MTN MoMo indisponible"><Image source={require("../../../../assets/mtn-momo-logo.png")} style={styles.providerLogo} resizeMode="contain" accessibilityLabel="Logo MTN MoMo" /><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>MTN MoMo</Text><Text style={styles.message}>Paiement en ligne indisponible pour le moment</Text></View></View>
        </> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ selected: source === "manual" }} onPress={() => { setSource("manual"); setError(""); }} style={[styles.choice, source === "manual" && styles.choiceSelected]}>
          <View style={styles.cashIcon}><MaterialCommunityIcons name="cash-multiple" size={29} color="#12875B" /></View>
          <View style={styles.choiceCopy}><Text style={styles.choiceTitle}>En espèces</Text><Text style={styles.message}>{memberMonth ? "Régler auprès de l’administrateur" : "Paiement reçu en caisse"}</Text></View>
          {source === "manual" ? <Feather name="check-circle" size={22} color="#00A99D" /> : null}
        </Pressable>
        {source === "wave" && !memberMonth ? <View style={styles.referenceField}><Text style={styles.label}>Référence du paiement Wave</Text><TextInput value={reference} onChangeText={setReference} placeholder="Référence de la transaction reçue" accessibilityLabel="Référence du paiement Wave" style={styles.input} autoCapitalize="characters" /></View> : null}
        <Text style={styles.notice}>{memberMonth ? source === "manual" ? `Présentez-vous auprès de l’administrateur avec ${money(amount)}. Il enregistrera le versement après l’avoir reçu.` : source === "wave" ? `Saisissez ${money(amount)} dans Wave. Le paiement sera enregistré après vérification par l’administrateur.` : "Le paiement sera enregistré après vérification par l’administrateur." : "Vérifiez que le montant a bien été reçu avant de l’enregistrer."}</Text>
      </>}
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={!amountValid || !source || saving} onPress={() => void submit()} style={[styles.submit, (!amountValid || !source || saving) && styles.disabled]}><LoadingLabel loading={saving} style={styles.submitText}>{memberMonth ? source === "wave" ? "Ouvrir Wave" : "Voir la mensualité" : saving ? "Enregistrement…" : "Confirmer le paiement"}</LoadingLabel></Pressable>
    </> : <Text style={styles.error}>{error || "Mensualité introuvable."}</Text>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { alignSelf: "center", backgroundColor: "#F5F9F8", flexGrow: 1, gap: 16, maxWidth: 760, padding: 20, paddingBottom: 70, paddingTop: 34, width: "100%" },
  back: { alignItems: "center", flexDirection: "row", gap: 8 }, backText: { color: "#007D74", fontWeight: "800" },
  step: { color: "#007D74", fontSize: 12, fontWeight: "800", marginTop: 12 }, title: { color: "#102B3D", fontSize: 25, fontWeight: "800" },
  summary: { backgroundColor: "#FFF", borderRadius: 17, gap: 7, padding: 18 }, member: { color: "#102B3D", fontSize: 18, fontWeight: "800" }, month: { color: "#65758A", fontSize: 12, textTransform: "capitalize" }, amount: { color: "#007D74", fontSize: 26, fontWeight: "800", marginTop: 7 }, message: { color: "#65758A", fontSize: 12 },
  label: { color: "#102B3D", fontSize: 13, fontWeight: "800" }, choice: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#E2E9E9", borderRadius: 13, borderWidth: 2, flexDirection: "row", gap: 15, minHeight: 78, padding: 13 }, choiceSelected: { backgroundColor: "#EAF7F4", borderColor: "#00A99D" }, choiceCopy: { flex: 1, gap: 3 }, choiceTitle: { color: "#102B3D", fontSize: 16, fontWeight: "800" },
  waveLogo: { backgroundColor: "#48C9EF", borderRadius: 11, height: 48, width: 48 }, providerLogo: { height: 48, width: 60 }, cashIcon: { alignItems: "center", backgroundColor: "#E2F6E8", borderColor: "#BFE6CD", borderRadius: 11, borderWidth: 1, height: 48, justifyContent: "center", width: 48 },
  referenceField: { gap: 8 }, input: { backgroundColor: "#FFF", borderColor: "#DDE6E8", borderRadius: 11, borderWidth: 1, minHeight: 50, padding: 12 }, notice: { color: "#65758A", fontSize: 12, lineHeight: 18 },
  error: { color: "#B64337", fontSize: 12 }, submit: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 13, justifyContent: "center", minHeight: 52 }, disabled: { opacity: 0.45 }, submitText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
