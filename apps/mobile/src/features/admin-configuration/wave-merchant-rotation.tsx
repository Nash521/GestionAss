import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { normalizeWavePaymentLink, waveMerchantId, wavePaymentLinkAmount } from "./wave";
import { decideWaveMerchantChange, getWaveMerchantChangeState, requestWaveMerchantChange, updateExceptionalWaveLink, type WaveMerchantChangeState } from "./wave-api";

type Props = { merchantId: string | null; monthlyAmount: number; maxPayments: number; onChanged: () => Promise<void> };

export function WaveMerchantRotation({ merchantId, monthlyAmount, maxPayments, onChanged }: Props) {
  const [state, setState] = useState<WaveMerchantChangeState | null>(null);
  const [full, setFull] = useState("");
  const [half, setHalf] = useState("");
  const [replacement, setReplacement] = useState<Record<string, string>>({});
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = async () => setState(await getWaveMerchantChangeState());
  useEffect(() => { void refresh().catch(() => setError("Impossible de charger les changements Wave.")); }, []);

  const run = async (action: () => Promise<void>, message: string) => {
    if (working) return;
    setWorking(true); setError(""); setNotice("");
    try { await action(); await refresh(); await onChanged(); setNotice(message); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Opération impossible."); }
    finally { setWorking(false); }
  };

  const request = () => void run(async () => {
    const fullUrl = normalizeWavePaymentLink(full);
    const halfUrl = maxPayments === 2 ? normalizeWavePaymentLink(half) : null;
    if (!fullUrl || waveMerchantId(fullUrl) === merchantId || wavePaymentLinkAmount(fullUrl) !== monthlyAmount) throw new Error("Saisissez un lien complet du nouveau marchand avec le montant mensuel exact.");
    if (maxPayments === 2 && (!halfUrl || monthlyAmount % 2 !== 0)) throw new Error("La demi-mensualité doit avoir un lien et un montant pair.");
    if (halfUrl && (waveMerchantId(halfUrl) !== waveMerchantId(fullUrl) || wavePaymentLinkAmount(halfUrl) !== monthlyAmount / 2)) throw new Error("Le lien de demi-mensualité doit provenir du même nouveau marchand et avoir le bon montant.");
    await requestWaveMerchantChange(fullUrl, halfUrl);
  }, "Demande envoyée à un autre administrateur.");

  const decide = (approve: boolean) => {
    if (!state?.pending) return;
    void run(() => decideWaveMerchantChange(state.pending!.id, approve), approve ? "Nouveau marchand activé. Remplacez maintenant les liens des cotisations exceptionnelles en cours." : "Changement refusé.");
  };

  const saveExceptional = (id: string, amount: number) => void run(async () => {
    const url = normalizeWavePaymentLink(replacement[id] ?? "");
    if (!url || waveMerchantId(url) !== merchantId || wavePaymentLinkAmount(url) !== amount) throw new Error("Le lien doit utiliser le marchand actuel et correspondre exactement au montant.");
    await updateExceptionalWaveLink(id, url);
    setReplacement((current) => ({ ...current, [id]: "" }));
  }, "Lien de cotisation enregistré.");

  if (!merchantId) return null;
  return <View style={styles.card}>
    <Text style={styles.title}>Changer de compte marchand Wave</Text>
    <Text style={styles.hint}>Un autre administrateur doit vérifier le bénéficiaire dans Wave et approuver le changement. Les anciens liens des cotisations exceptionnelles seront désactivés à l’approbation.</Text>
    <Pressable disabled={working} onPress={() => void run(async () => { await refresh(); await onChanged(); }, "Demandes actualisées.")} style={styles.secondary}><Text style={styles.secondaryText}>Actualiser les demandes</Text></Pressable>
    {state?.pending ? <View style={styles.box}>
      <Text style={styles.label}>Demande en attente : {state.pending.oldMerchantId} → {state.pending.newMerchantId}</Text>
      <Text style={styles.hint}>Lien complet : {state.pending.fullUrl}</Text>
      {state.pending.halfUrl ? <Text style={styles.hint}>Demi-mensualité : {state.pending.halfUrl}</Text> : null}
      {state.pending.requestedByMe ? <Text style={styles.hint}>En attente de la validation d’un autre administrateur.</Text> : <View style={styles.actions}>
        <Pressable disabled={working} onPress={() => decide(true)} style={styles.button}><Text style={styles.buttonText}>Approuver</Text></Pressable>
        <Pressable disabled={working} onPress={() => decide(false)} style={styles.secondary}><Text style={styles.secondaryText}>Refuser</Text></Pressable>
      </View>}
    </View> : <View style={styles.box}>
      <Text style={styles.label}>Nouveaux liens du compte marchand</Text>
      <TextInput value={full} onChangeText={setFull} autoCapitalize="none" autoCorrect={false} placeholder="Lien mensualité complète" accessibilityLabel="Nouveau lien Wave complet" style={styles.input} />
      {maxPayments === 2 ? <TextInput value={half} onChangeText={setHalf} autoCapitalize="none" autoCorrect={false} placeholder="Lien demi-mensualité" accessibilityLabel="Nouveau lien Wave demi-mensualité" style={styles.input} /> : null}
      <Pressable disabled={working} onPress={request} style={styles.button}><Text style={styles.buttonText}>Demander le changement</Text></Pressable>
    </View>}
    {(state?.missingExceptionalLinks.length ?? 0) > 0 ? <View style={styles.box}>
      <Text style={styles.label}>Cotisations exceptionnelles sans lien ({state!.missingExceptionalLinks.length})</Text>
      {state!.missingExceptionalLinks.map((item) => <View key={item.id} style={styles.exceptional}>
        <Text style={styles.label}>{item.label} · {item.amount} XOF</Text>
        <TextInput value={replacement[item.id] ?? ""} onChangeText={(value) => setReplacement((current) => ({ ...current, [item.id]: value }))} autoCapitalize="none" autoCorrect={false} placeholder="Nouveau lien Wave" accessibilityLabel={`Lien Wave pour ${item.label}`} style={styles.input} />
        <Pressable disabled={working} onPress={() => saveExceptional(item.id, item.amount)} style={styles.secondary}><Text style={styles.secondaryText}>Enregistrer ce lien</Text></Pressable>
      </View>)}
    </View> : null}
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    {notice ? <Text style={styles.success}>{notice}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFF", borderColor: "#E1EBE9", borderRadius: 18, borderWidth: 1, gap: 12, padding: 18 },
  title: { color: "#102B3D", fontSize: 19, fontWeight: "800" },
  hint: { color: "#65758A", fontSize: 12, lineHeight: 18 },
  box: { backgroundColor: "#F7FBFA", borderRadius: 12, gap: 10, padding: 13 },
  label: { color: "#102B3D", fontSize: 13, fontWeight: "700" },
  input: { backgroundColor: "#FFF", borderColor: "#DDE6E8", borderRadius: 12, borderWidth: 1, color: "#102B3D", minHeight: 50, padding: 12 },
  actions: { flexDirection: "row", gap: 10 },
  button: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 12, justifyContent: "center", minHeight: 48, paddingHorizontal: 12 },
  buttonText: { color: "#FFF", fontWeight: "800" },
  secondary: { alignItems: "center", borderColor: "#00A99D", borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 12 },
  secondaryText: { color: "#007D74", fontWeight: "800" },
  exceptional: { borderTopColor: "#DDE6E8", borderTopWidth: 1, gap: 8, paddingTop: 10 },
  error: { color: "#B64337", fontSize: 12 }, success: { color: "#007D74", fontSize: 12, fontWeight: "700" },
});
