import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { monthlyPaymentSelection } from "../../../../src/features/members/monthly-payment-selection";
import { createAdminFinanceAction, getFunctionErrorMessage, getMonthlyPaymentContext, invokeRegistrationFunction, type MonthlyPaymentContext } from "../../../../src/lib/supabase";

const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);

export default function MonthlyPaymentMethod() {
  const { memberId, dueId, amount: requestedAmount, selectedYear } = useLocalSearchParams<{ memberId: string; dueId: string; amount: string; selectedYear?: string }>();
  const amount = Number(requestedAmount);
  const [context, setContext] = useState<MonthlyPaymentContext | null>(null);
  const [source, setSource] = useState<"manual" | "wave" | "jeko" | null>(null);
  const [jekoMethod, setJekoMethod] = useState<"wave" | "orange" | "mtn" | "moov" | "djamo" | "jeko">("wave");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [jekoBlocked, setJekoBlocked] = useState(false);
  const [jekoChecking, setJekoChecking] = useState(true);
  const [providerRequestId, setProviderRequestId] = useState("");
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMessage, setReconcileMessage] = useState("");
  const [needRequestId, setNeedRequestId] = useState(false);
  const [jekoUnavailable, setJekoUnavailable] = useState(false);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!memberId || !dueId || !Number.isInteger(amount) || amount <= 0) { setLoading(false); setError("Montant ou mensualité invalide."); return; }
    void invokeRegistrationFunction<{ status: string | null; redirectUrl: string | null; amount: number | null; reference: string | null }>("get-jeko-monthly-payment", { monthlyDueId: dueId }).then((result) => {
      if (!active || !result.status) return;
      setJekoBlocked(true);
      if (result.status === "pending" && result.redirectUrl && Number(result.amount) === amount) { setSource("jeko"); setCheckoutUrl(result.redirectUrl); }
      else setError(`Une demande Jèko est en cours ou nécessite une vérification. Référence : ${result.reference ?? "indisponible"}. Consultez Jèko avant de réessayer.`);
    }).catch(() => { if (active) setJekoUnavailable(true); }).finally(() => { if (active) setJekoChecking(false); });
    void getMonthlyPaymentContext(memberId, dueId).then(({ id }) => { if (active) setContext(id); }).catch(() => { if (active) setError("Impossible de vérifier cette mensualité."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [memberId, dueId, amount]);

  const selection = context ? monthlyPaymentSelection(context) : null;
  const amountValid = !!selection && selection.options.some((option) => option.amount === amount);
  const reconcile = async () => {
    if (reconciling) return;
    setReconciling(true); setReconcileMessage("");
    try {
      const body: { monthlyDueId: string; providerRequestId?: string } = { monthlyDueId: dueId };
      if (providerRequestId.trim()) body.providerRequestId = providerRequestId.trim();
      const result = await invokeRegistrationFunction<{ status: string; reference?: string }>("reconcile-jeko-payment", body);
      setNeedRequestId(result.status === "missing_request_id");
      if (result.status === "failed") { setCheckoutUrl(null); setJekoBlocked(false); setSource(null); setError(""); setReconcileMessage("Jèko indique que le paiement a échoué. Vous pouvez créer une nouvelle demande."); }
      else if (result.status === "missing_request_id") setReconcileMessage("Retrouvez l’identifiant de la demande dans Jèko avec la référence affichée, puis saisissez-le ci-dessous.");
      else if (result.status === "awaiting_confirmation") setReconcileMessage("Jèko indique que le paiement a réussi. Il reste en attente de la notification sécurisée avant comptabilisation.");
      else if (result.status === "needs_review") setReconcileMessage("Le paiement nécessite un contrôle financier ; ne créez pas de nouvelle demande.");
      else setReconcileMessage("Vérification effectuée. Actualisez cette page pour voir l’état de la demande.");
    } catch { setReconcileMessage("Vérification impossible. Vérifiez l’identifiant ou réessayez plus tard."); }
    finally { setReconciling(false); }
  };

  const submit = async () => {
    if (!context || !source || !amountValid || saving) return;
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
      if (source === "jeko") {
        const result = await invokeRegistrationFunction<{ redirectUrl: string; status: string }>("create-jeko-monthly-payment", { memberId, monthlyDueId: dueId, amount, method: jekoMethod });
        setJekoBlocked(true); setCheckoutUrl(result.redirectUrl);
        try { await Linking.openURL(result.redirectUrl); } catch { setError("Impossible d’ouvrir la page de paiement. Utilisez le bouton pour réessayer."); }
        return;
      }
      await createAdminFinanceAction({ action: "recordMonthlyStepPayment", memberId, dueId, amount, paidOn: new Date().toISOString().slice(0, 10), reference: source === "wave" ? reference.trim() : "", source });
      router.replace({ pathname: "/(admin)/members/[memberId]", params: { memberId, paymentUpdated: String(Date.now()), selectedYear: selectedYear ?? "" } });
    } catch (submissionError) {
      if (source === "jeko") setJekoBlocked(true);
      const message = await getFunctionErrorMessage(submissionError);
      setError(message === "Payment installment limit reached" ? "Le nombre maximal de versements est atteint. Actualisez la mensualité." : message === "Payment must settle remaining balance on final installment" ? "Le dernier versement doit régler tout le solde. Revenez au choix du montant." : message === "Payment amount is not an allowed installment" ? "Le montant ne correspond plus à un palier autorisé. Revenez au choix du montant." : message ?? "Impossible d’enregistrer le paiement.");
    } finally {
      setSaving(false);
    }
  };

  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour au montant" style={styles.back}><Feather name="arrow-left" size={20} color="#007D74" /><Text style={styles.backText}>Retour</Text></Pressable>
    <Text style={styles.step}>Étape 2 sur 2</Text>
    <Text style={styles.title}>Mode de paiement</Text>
    {loading ? <Text style={styles.message}>Vérification de la mensualité…</Text> : context ? <>
      <View style={styles.summary}><Text style={styles.member}>{context.memberName}</Text><Text style={styles.month}>Mensualité de {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${context.month.slice(0, 10)}T00:00:00`))}</Text><Text style={styles.amount}>{money(amount)}</Text><Text style={styles.message}>Reste après ce paiement : {money(Math.max(0, context.amountRemaining - amount))}</Text></View>
      {!amountValid ? <Text style={styles.error}>Ce montant ne peut plus être enregistré. Revenez au choix du montant.</Text> : <>
        <Text style={styles.label}>Choisissez le mode de paiement</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: source === "jeko" }} disabled={!!checkoutUrl} onPress={() => { setSource("jeko"); setError(""); }} style={[styles.choice, source === "jeko" && styles.choiceSelected]}>
          <View style={styles.cashIcon}><Feather name="credit-card" size={26} color="#007D74" /></View>
          <View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Payer avec Jèko</Text><Text style={styles.message}>Paiement en ligne, confirmé après réception</Text></View>
          {source === "jeko" ? <Feather name="check-circle" size={22} color="#00A99D" /> : null}
        </Pressable>
        {source === "jeko" ? <><Text style={styles.label}>Moyen de paiement</Text>{([ ["wave", "Wave"], ["orange", "Orange Money"], ["mtn", "MTN Money"], ["moov", "Moov Money"], ["djamo", "Djamo"], ["jeko", "Jèko"] ] as const).map(([value, label]) => <Pressable key={value} disabled={!!checkoutUrl} accessibilityRole="button" accessibilityState={{ selected: jekoMethod === value }} onPress={() => setJekoMethod(value)} style={[styles.choice, jekoMethod === value && styles.choiceSelected]}><Text style={styles.choiceTitle}>{label}</Text>{jekoMethod === value ? <Feather name="check-circle" size={20} color="#00A99D" /> : null}</Pressable>)}</> : null}
        <Pressable accessibilityRole="button" disabled={!!checkoutUrl} accessibilityState={{ selected: source === "wave" }} onPress={() => { setSource("wave"); setError(""); }} style={[styles.choice, source === "wave" && styles.choiceSelected]}>
          <Image source={require("../../../../assets/wave-logo.png")} style={styles.waveLogo} resizeMode="cover" accessibilityLabel="Logo Wave" />
          <View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Wave</Text><Text style={styles.message}>Paiement reçu par Wave</Text></View>
          {source === "wave" ? <Feather name="check-circle" size={22} color="#00A99D" /> : null}
        </Pressable>
        <Pressable accessibilityRole="button" disabled={!!checkoutUrl} accessibilityState={{ selected: source === "manual" }} onPress={() => { setSource("manual"); setError(""); }} style={[styles.choice, source === "manual" && styles.choiceSelected]}>
          <View style={styles.cashIcon}><MaterialCommunityIcons name="cash-multiple" size={29} color="#12875B" /></View>
          <View style={styles.choiceCopy}><Text style={styles.choiceTitle}>En espèces</Text><Text style={styles.message}>Paiement reçu en caisse</Text></View>
          {source === "manual" ? <Feather name="check-circle" size={22} color="#00A99D" /> : null}
        </Pressable>
        {source === "wave" ? <View style={styles.referenceField}><Text style={styles.label}>Référence du paiement Wave</Text><TextInput value={reference} onChangeText={setReference} placeholder="Référence de la transaction reçue" accessibilityLabel="Référence du paiement Wave" style={styles.input} autoCapitalize="characters" /></View> : null}
        <Text style={styles.notice}>{source === "jeko" ? "La mensualité sera mise à jour après confirmation par Jèko. Le retour sur cette page ne confirme pas le paiement." : "Vérifiez que le montant a bien été reçu avant de l’enregistrer."}</Text>
      </>}
      {jekoBlocked ? <View style={styles.referenceField}>
        <Text style={styles.label}>Suivi de la demande Jèko</Text>
        <Text style={styles.notice}>Vérifiez l’état auprès de Jèko avant de tenter un nouveau paiement.</Text>
        {needRequestId ? <><Text style={styles.label}>Identifiant de la demande Jèko</Text><TextInput value={providerRequestId} onChangeText={setProviderRequestId} autoCapitalize="none" autoCorrect={false} placeholder="Identifiant de la demande" style={styles.input} accessibilityLabel="Identifiant de la demande Jèko" /></> : null}
        {reconcileMessage ? <Text style={styles.notice} accessibilityLiveRegion="polite">{reconcileMessage}</Text> : null}
        <Pressable accessibilityRole="button" disabled={reconciling} onPress={() => void reconcile()} style={[styles.choice, reconciling && styles.disabled]}><Text style={styles.choiceTitle}>{reconciling ? "Vérification…" : "Vérifier auprès de Jèko"}</Text></Pressable>
      </View> : reconcileMessage ? <Text style={styles.notice}>{reconcileMessage}</Text> : null}
      {jekoUnavailable && source === "jeko" ? <Text style={styles.error}>Impossible de vérifier les demandes Jèko. Réessayez plus tard.</Text> : null}
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      {checkoutUrl ? <><Text style={styles.notice}>Demande créée. Le paiement reste en attente de confirmation.</Text><Pressable accessibilityRole="button" onPress={() => void Linking.openURL(checkoutUrl).catch(() => setError("Impossible d’ouvrir la page de paiement."))} style={styles.submit}><Text style={styles.submitText}>Ouvrir la page de paiement</Text></Pressable></> : <Pressable accessibilityRole="button" disabled={!amountValid || !source || saving || jekoBlocked || (source === "jeko" && (jekoChecking || jekoUnavailable))} onPress={() => void submit()} style={[styles.submit, (!amountValid || !source || saving || jekoBlocked || (source === "jeko" && (jekoChecking || jekoUnavailable))) && styles.disabled]}><Text style={styles.submitText}>{saving ? "Chargement…" : source === "jeko" ? "Continuer vers Jèko" : "Confirmer le paiement"}</Text></Pressable>}
    </> : <Text style={styles.error}>{error || "Mensualité introuvable."}</Text>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { alignSelf: "center", backgroundColor: "#F5F9F8", flexGrow: 1, gap: 16, maxWidth: 760, padding: 20, paddingBottom: 70, paddingTop: 34, width: "100%" },
  back: { alignItems: "center", flexDirection: "row", gap: 8 }, backText: { color: "#007D74", fontWeight: "800" },
  step: { color: "#007D74", fontSize: 12, fontWeight: "800", marginTop: 12 }, title: { color: "#102B3D", fontSize: 25, fontWeight: "800" },
  summary: { backgroundColor: "#FFF", borderRadius: 17, gap: 7, padding: 18 }, member: { color: "#102B3D", fontSize: 18, fontWeight: "800" }, month: { color: "#65758A", fontSize: 12, textTransform: "capitalize" }, amount: { color: "#007D74", fontSize: 26, fontWeight: "800", marginTop: 7 }, message: { color: "#65758A", fontSize: 12 },
  label: { color: "#102B3D", fontSize: 13, fontWeight: "800" }, choice: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#E2E9E9", borderRadius: 13, borderWidth: 2, flexDirection: "row", gap: 15, minHeight: 78, padding: 13 }, choiceSelected: { backgroundColor: "#EAF7F4", borderColor: "#00A99D" }, choiceCopy: { flex: 1, gap: 3 }, choiceTitle: { color: "#102B3D", fontSize: 16, fontWeight: "800" },
  waveLogo: { backgroundColor: "#48C9EF", borderRadius: 11, height: 48, width: 48 }, cashIcon: { alignItems: "center", backgroundColor: "#E2F6E8", borderColor: "#BFE6CD", borderRadius: 11, borderWidth: 1, height: 48, justifyContent: "center", width: 48 },
  referenceField: { gap: 8 }, input: { backgroundColor: "#FFF", borderColor: "#DDE6E8", borderRadius: 11, borderWidth: 1, minHeight: 50, padding: 12 }, notice: { color: "#65758A", fontSize: 12, lineHeight: 18 },
  error: { color: "#B64337", fontSize: 12 }, submit: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 13, justifyContent: "center", minHeight: 52 }, disabled: { opacity: 0.45 }, submitText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
