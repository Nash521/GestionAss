import { LoadingState, LoadingLabel } from "../../../src/components/loading-state";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardSafeScreen } from "../../../src/components/keyboard-safe-screen";
import { clearBiometricLogin } from "../../../src/lib/biometric-session";
import { getAssociationLogoUrl, getAssociationSettings, saveAssociationSettings, uploadAssociationLogo } from "../../../src/features/admin-configuration/api";
import { validateAssociationSettings, type AssociationSettings } from "../../../src/features/admin-configuration/association";
import { normalizeWavePaymentLink, waveMerchantId, wavePaymentLinkAmount } from "../../../src/features/admin-configuration/wave";
import { getAdminWaveMonthlyLinks, updateAdminWaveMonthlyLinks } from "../../../src/features/admin-configuration/wave-api";
import { WaveMerchantRotation } from "../../../src/features/admin-configuration/wave-merchant-rotation";
import { createAdminFinanceAction, getFunctionErrorMessage, getMonthlyContributionSettings } from "../../../src/lib/supabase";
import { getSupabaseClient } from "../../../src/lib/supabase-client";

const emptyAssociation: AssociationSettings = { name: "", address: "", phone: "", email: "", logoPath: null };
export default function FinanceSettings() {
  const [association, setAssociation] = useState<AssociationSettings>(emptyAssociation);
  const [organizationId, setOrganizationId] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<{ base64: string; mimeType: string } | null>(null);
  const [associationLoading, setAssociationLoading] = useState(true);
  const [associationSaving, setAssociationSaving] = useState(false);
  const [associationError, setAssociationError] = useState("");
  const [associationSaved, setAssociationSaved] = useState(false);
  const [membershipFeeAmount, setMembershipFeeAmount] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [maxPayments, setMaxPayments] = useState("2");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waveFullUrl, setWaveFullUrl] = useState("");
  const [waveHalfUrl, setWaveHalfUrl] = useState("");
  const [waveMerchant, setWaveMerchant] = useState<string | null>(null);
  const [waveLoading, setWaveLoading] = useState(true);
  const [waveSaving, setWaveSaving] = useState(false);
  const [waveError, setWaveError] = useState("");
  const [waveSaved, setWaveSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    let active = true;
    void getAssociationSettings().then(async (settings) => {
      if (!active) return;
      setAssociation(settings);
      setOrganizationId(settings.organizationId);
      try {
        const url = await getAssociationLogoUrl(settings.logoPath);
        if (active) setLogoUrl(url);
      } catch {
        if (active) setAssociationError("Le logo actuel ne peut pas être affiché.");
      }
    }).catch(() => { if (active) setAssociationError("Impossible de charger les informations de l’association."); })
      .finally(() => { if (active) setAssociationLoading(false); });
    void getMonthlyContributionSettings().then(({ id }) => {
      if (!active) return;
      setMembershipFeeAmount(String(id.membershipFeeAmount));
      setMonthlyAmount(String(id.monthlyAmount));
      setDueDay(String(id.dueDay));
      setMaxPayments(String(id.maxPayments));
    }).catch(() => { if (active) setError("Impossible de charger les paramètres des cotisations."); })
      .finally(() => { if (active) setLoading(false); });
    void getAdminWaveMonthlyLinks().then((links) => { if (active) { setWaveFullUrl(links.fullUrl ?? ""); setWaveHalfUrl(links.halfUrl ?? ""); setWaveMerchant(links.merchantId ?? null); } })
      .catch(() => { if (active) setWaveError("Impossible de charger les liens Wave."); })
      .finally(() => { if (active) setWaveLoading(false); });
    return () => { active = false; };
  }, []);

  const updateAssociation = (key: "name" | "address" | "phone" | "email", value: string) => {
    setAssociation((current) => ({ ...current, [key]: value }));
    setAssociationSaved(false);
    setAssociationError("");
  };

  const chooseLogo = async () => {
    try {
      setAssociationError("");
      const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.8, base64: true });
      if (selection.canceled) return;
      const image = selection.assets[0];
      if (!image?.base64) throw new Error("Impossible de lire cette image.");
      const mimeType = image.mimeType ?? "image/jpeg";
      if (!(["image/png", "image/jpeg"] as string[]).includes(mimeType)) throw new Error("Choisissez une image PNG ou JPEG.");
      if (image.base64.length > Math.ceil((5 * 1024 * 1024) / 3) * 4 + 4) throw new Error("Le logo doit faire au maximum 5 Mo.");
      setSelectedLogo({ base64: image.base64, mimeType });
      setLogoUrl(`data:${mimeType};base64,${image.base64}`);
      setAssociationSaved(false);
    } catch (reason) {
      setAssociationError(reason instanceof Error ? reason.message : "Impossible de choisir le logo.");
    }
  };

  const saveAssociation = async () => {
    if (associationSaving) return;
    setAssociationSaved(false);
    setAssociationError("");
    try {
      const values = validateAssociationSettings(association);
      setAssociationSaving(true);
      const logo = selectedLogo ? await uploadAssociationLogo(selectedLogo.base64, selectedLogo.mimeType, organizationId) : null;
      const savedValues = await saveAssociationSettings({ ...values, logoPath: logo?.path ?? values.logoPath });
      setAssociation(savedValues);
      if (logo) setLogoUrl(logo.url);
      setSelectedLogo(null);
      setAssociationSaved(true);
    } catch (reason) {
      setAssociationError(reason instanceof Error ? reason.message : "Impossible d’enregistrer les informations de l’association.");
    } finally {
      setAssociationSaving(false);
    }
  };

  const save = async () => {
    const fee = Number(membershipFeeAmount); const amount = Number(monthlyAmount); const day = Number(dueDay); const limit = Number(maxPayments);
    if (!membershipFeeAmount.trim() || !Number.isInteger(fee) || fee < 0 || fee > 9999999999 || !monthlyAmount.trim() || !Number.isInteger(amount) || amount < 0 || amount > 9999999999 || !Number.isInteger(day) || day < 1 || day > 28 || ![1, 2].includes(limit)) return setError("Renseignez des montants entiers positifs, un jour entre 1 et 28 et choisissez un ou deux versements.");
    setSaving(true); setError(""); setSaved(false);
    try { await createAdminFinanceAction({ action: "updateContributionSettings", membershipFeeAmount: fee, monthlyAmount: amount, dueDay: day, maxPayments: limit }); setSaved(true); }
    catch (reason) { setError((await getFunctionErrorMessage(reason)) ?? "Impossible de mettre à jour les paramètres."); }
    finally { setSaving(false); }
  };

  const saveWaveLinks = async () => {
    if (waveSaving) return;
    let fullUrl: string | null; let halfUrl: string | null;
    try { fullUrl = normalizeWavePaymentLink(waveFullUrl); halfUrl = normalizeWavePaymentLink(waveHalfUrl); }
    catch (reason) { setWaveError(reason instanceof Error ? reason.message : "Lien Wave invalide."); return; }
    if (!fullUrl) { setWaveError("Ajoutez le lien Wave pour la mensualité complète."); return; }
    if (waveMerchant && waveMerchantId(fullUrl) !== waveMerchant || halfUrl && waveMerchantId(halfUrl) !== waveMerchantId(fullUrl)) { setWaveError("Tous les liens doivent appartenir au même marchand Wave de l’association."); return; }
    if (wavePaymentLinkAmount(fullUrl) !== Number(monthlyAmount)) { setWaveError(`Le lien de mensualité complète doit indiquer amount=${monthlyAmount}.`); return; }
    if (maxPayments === "2" && !halfUrl) { setWaveError("Ajoutez aussi le lien Wave pour la moitié de la mensualité."); return; }
    if (maxPayments === "2" && Number(monthlyAmount) % 2 !== 0) { setWaveError("Le montant mensuel doit être pair pour deux versements Wave égaux."); return; }
    if (halfUrl && wavePaymentLinkAmount(halfUrl) !== Number(monthlyAmount) / 2) { setWaveError(`Le lien de demi-mensualité doit indiquer amount=${Number(monthlyAmount) / 2}.`); return; }
    setWaveSaving(true); setWaveError(""); setWaveSaved(false);
    try { const links = await updateAdminWaveMonthlyLinks({ fullUrl, halfUrl }); setWaveMerchant(links.merchantId ?? waveMerchantId(fullUrl)); setWaveSaved(true); }
    catch (reason) { setWaveError((await getFunctionErrorMessage(reason)) ?? "Impossible d’enregistrer les liens Wave."); }
    finally { setWaveSaving(false); }
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true); setSignOutError("");
    try {
      await clearBiometricLogin();
      const { error: authError } = await getSupabaseClient().auth.signOut({ scope: "local" });
      if (authError) throw authError;
      router.replace("/login");
    } catch {
      setSignOutError("Impossible de vous déconnecter. Réessayez.");
      setSigningOut(false);
    }
  };

  return <KeyboardSafeScreen><View style={styles.page}>
    <Pressable accessibilityRole="button" accessibilityLabel="Retour au tableau de bord" onPress={() => router.replace("/(admin)/dashboard")} style={styles.back}><Feather name="arrow-left" size={18} color="#007D74" /><Text style={styles.backText}>Retour</Text></Pressable>
    <Text style={styles.title}>Paramètres</Text>
    <Text style={styles.subtitle}>Configurez les informations de l’association et les cotisations.</Text>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Informations de l’association</Text>
      <Text style={styles.hint}>Ces informations sont enregistrées pour votre association.</Text>
      <Text style={styles.label}>Logo</Text>
      <View style={styles.logoRow}><View style={styles.logoPreview}>{logoUrl ? <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" accessibilityLabel="Logo de l’association" /> : <Feather name="image" size={30} color="#8BA6A3" />}</View><View style={styles.logoCopy}><Text style={styles.logoTitle}>{logoUrl ? "Logo de l’association" : "Aucun logo"}</Text><Text style={styles.hint}>PNG ou JPEG · 5 Mo maximum</Text></View></View>
      <Pressable accessibilityRole="button" disabled={associationLoading || associationSaving} onPress={() => void chooseLogo()} style={styles.logoButton}><Feather name="upload" size={16} color="#007D74" /><Text style={styles.logoButtonText}>Choisir un logo</Text></Pressable>
      <Text style={styles.label}>Nom</Text><TextInput accessibilityLabel="Nom de l’association" value={association.name} onChangeText={(value) => updateAssociation("name", value)} editable={!associationLoading && !associationSaving} maxLength={160} placeholder="Nom de l’association" style={styles.input} />
      <Text style={styles.label}>Adresse</Text><TextInput accessibilityLabel="Adresse de l’association" value={association.address} onChangeText={(value) => updateAssociation("address", value)} editable={!associationLoading && !associationSaving} maxLength={500} multiline placeholder="Adresse de l’association" style={[styles.input, styles.addressInput]} />
      <Text style={styles.label}>Téléphone</Text><TextInput accessibilityLabel="Téléphone de l’association" value={association.phone} onChangeText={(value) => updateAssociation("phone", value)} editable={!associationLoading && !associationSaving} keyboardType="phone-pad" placeholder="+225…" style={styles.input} />
      <Text style={styles.label}>E-mail</Text><TextInput accessibilityLabel="E-mail de l’association" value={association.email} onChangeText={(value) => updateAssociation("email", value)} editable={!associationLoading && !associationSaving} keyboardType="email-address" autoCapitalize="none" maxLength={254} placeholder="contact@association.ci" style={styles.input} />
      {associationLoading ? <LoadingState label="Chargement des informations…" /> : null}
      {associationError ? <Text style={styles.error} accessibilityRole="alert">{associationError}</Text> : null}
      {associationSaved ? <Text style={styles.success}>Informations de l’association enregistrées.</Text> : null}
      <Pressable accessibilityRole="button" disabled={associationLoading || associationSaving || !organizationId} onPress={() => void saveAssociation()} style={[styles.submit, (associationLoading || associationSaving || !organizationId) && styles.disabled]}><LoadingLabel loading={!!(associationSaving)} style={styles.submitText}>{associationSaving ? "Enregistrement…" : "Enregistrer l’association"}</LoadingLabel></Pressable>
    </View>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Cotisations</Text>
      <Text style={styles.label}>Droit d’adhésion (XOF)</Text><TextInput value={membershipFeeAmount} onChangeText={setMembershipFeeAmount} editable={!loading && !saving} keyboardType="number-pad" placeholder="Ex. 5000" style={styles.input} accessibilityLabel="Droit d’adhésion" />
      <Text style={styles.hint}>Le nouveau montant s’applique aux futurs membres. Les droits déjà créés gardent leur montant.</Text>
      <Text style={styles.label}>Montant mensuel (XOF)</Text><TextInput value={monthlyAmount} onChangeText={setMonthlyAmount} editable={!loading && !saving} keyboardType="decimal-pad" placeholder="Ex. 5000" style={styles.input} accessibilityLabel="Montant mensuel" />
      <Text style={styles.label}>Jour d’échéance (1 à 28)</Text><TextInput value={dueDay} onChangeText={setDueDay} editable={!loading && !saving} keyboardType="number-pad" style={styles.input} accessibilityLabel="Jour d'échéance" />
      <Text style={styles.label}>Nombre maximal de versements par mensualité</Text><View style={styles.paymentOptions}>{(["1", "2"] as const).map((option) => <Pressable key={option} accessibilityRole="button" accessibilityLabel={`${option} versement${option === "2" ? "s" : ""} maximum`} accessibilityState={{ selected: maxPayments === option }} disabled={loading || saving} onPress={() => { setMaxPayments(option); setSaved(false); setError(""); }} style={[styles.paymentOption, maxPayments === option && styles.paymentOptionSelected]}><Text style={[styles.paymentOptionText, maxPayments === option && styles.paymentOptionTextSelected]}>{option === "1" ? "En une fois" : "En deux fois"}</Text></Pressable>)}</View>
      <Text style={styles.hint}>Le dernier versement doit régler tout le solde de la mensualité.</Text>
      {loading ? <LoadingState label="Chargement des cotisations…" /> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      {saved ? <Text style={styles.success}>Paramètres enregistrés.</Text> : null}
      <Pressable accessibilityRole="button" disabled={loading || saving} onPress={() => void save()} style={[styles.submit, (loading || saving) && styles.disabled]}><LoadingLabel loading={!!(saving)} style={styles.submitText}>{saving ? "Enregistrement…" : "Enregistrer les cotisations"}</LoadingLabel></Pressable>
    </View>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Paiements Wave</Text>
      <Text style={styles.hint}>Créez dans Wave Business deux liens au montant fixe : {monthlyAmount || "—"} XOF pour une mensualité complète et {Number(monthlyAmount) / 2 || "—"} XOF pour la moitié. Collez-les ici pour les membres de cette association.</Text>
      <Text style={styles.hint}>{waveMerchant ? `Marchand Wave verrouillé : ${waveMerchant}. Les nouveaux liens doivent provenir de ce même compte.` : "Le premier lien enregistré fixe le marchand Wave de l’association. Vérifiez son bénéficiaire dans Wave avant l’enregistrement."}</Text>
      {waveLoading ? <LoadingState label="Chargement des liens…" /> : null}
      <Text style={styles.label}>Lien mensualité complète</Text><TextInput value={waveFullUrl} onChangeText={(value) => { setWaveFullUrl(value); setWaveSaved(false); }} editable={!waveLoading && !waveSaving} autoCapitalize="none" autoCorrect={false} placeholder="https://pay.wave.com/m/…" style={styles.input} accessibilityLabel="Lien Wave mensualité complète" />
      <Text style={styles.label}>Lien demi-mensualité</Text><TextInput value={waveHalfUrl} onChangeText={(value) => { setWaveHalfUrl(value); setWaveSaved(false); }} editable={!waveLoading && !waveSaving} autoCapitalize="none" autoCorrect={false} placeholder="https://pay.wave.com/m/…" style={styles.input} accessibilityLabel="Lien Wave demi-mensualité" />
      <Text style={styles.hint}>Un lien ne confirme pas automatiquement le paiement. Le membre doit vérifier le montant affiché dans Wave et l’administrateur doit confirmer le versement reçu.</Text>
      {waveError ? <Text style={styles.error} accessibilityRole="alert">{waveError}</Text> : null}
      {waveSaved ? <Text style={styles.success}>Liens Wave enregistrés.</Text> : null}
      <Pressable accessibilityRole="button" disabled={waveLoading || waveSaving} onPress={() => void saveWaveLinks()} style={[styles.submit, (waveLoading || waveSaving) && styles.disabled]}><LoadingLabel loading={waveSaving} style={styles.submitText}>{waveSaving ? "Enregistrement…" : "Enregistrer les liens Wave"}</LoadingLabel></Pressable>
    </View>
    <WaveMerchantRotation merchantId={waveMerchant} monthlyAmount={Number(monthlyAmount)} maxPayments={Number(maxPayments)} onChanged={async () => { const links = await getAdminWaveMonthlyLinks(); setWaveFullUrl(links.fullUrl ?? ""); setWaveHalfUrl(links.halfUrl ?? ""); setWaveMerchant(links.merchantId ?? null); }} />
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Session</Text>
      <Text style={styles.hint}>Fermez votre session sur cet appareil.</Text>
      {signOutError ? <Text style={styles.error} accessibilityRole="alert">{signOutError}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Se déconnecter" disabled={signingOut} onPress={() => void signOut()} style={[styles.signOutButton, signingOut && styles.disabled]}><Feather name="log-out" size={18} color="#B64337" /><LoadingLabel loading={!!(signingOut)} style={styles.signOutText}>{signingOut ? "Déconnexion…" : "Se déconnecter"}</LoadingLabel></Pressable>
    </View>
  </View></KeyboardSafeScreen>;
}

const styles = StyleSheet.create({
  providerCard: { backgroundColor: "#F8FBFA", borderColor: "#E0EBE7", borderRadius: 15, borderWidth: 1, gap: 11, padding: 14 },
  providerHeading: { alignItems: "center", flexDirection: "row", gap: 11 },
  providerLogo: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 11, height: 48, justifyContent: "center", overflow: "hidden", width: 60 },
  providerImage: { height: 44, width: 58 },
  providerNameBlock: { flex: 1 },
  providerName: { color: "#102B3D", fontSize: 15, fontWeight: "800" },
  providerActions: { alignItems: "center", flexDirection: "row", gap: 15 },
  providerSave: { alignItems: "center", backgroundColor: "#087C70", borderRadius: 10, justifyContent: "center", minHeight: 42, paddingHorizontal: 14 },
  providerSaveText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  providerRemove: { color: "#B64337", fontSize: 12, fontWeight: "800" },
  page: { alignSelf: "center", backgroundColor: "#F7FBFA", gap: 17, maxWidth: 760, padding: 20, paddingBottom: 72, paddingTop: 32, width: "100%" },
  back: { alignItems: "center", flexDirection: "row", gap: 8 }, backText: { color: "#007D74", fontWeight: "800" },
  title: { color: "#102B3D", fontSize: 28, fontWeight: "800", marginTop: 8 }, subtitle: { color: "#65758A", lineHeight: 20 },
  card: { backgroundColor: "#FFF", borderColor: "#E1EBE9", borderRadius: 18, borderWidth: 1, gap: 11, padding: 18 },
  sectionTitle: { color: "#102B3D", fontSize: 19, fontWeight: "800" }, label: { color: "#102B3D", fontSize: 13, fontWeight: "700", marginTop: 3 },
  input: { backgroundColor: "#FFF", borderColor: "#DDE6E8", borderRadius: 12, borderWidth: 1, color: "#102B3D", minHeight: 50, padding: 12 }, addressInput: { minHeight: 74, textAlignVertical: "top" },
  paymentOptions: { flexDirection: "row", gap: 10 }, paymentOption: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#DDE6E8", borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 50, padding: 10 }, paymentOptionSelected: { backgroundColor: "#EAF7F4", borderColor: "#00A99D", borderWidth: 2 }, paymentOptionText: { color: "#65758A", fontSize: 13, fontWeight: "700" }, paymentOptionTextSelected: { color: "#007D74", fontWeight: "800" },
  logoRow: { alignItems: "center", flexDirection: "row", gap: 14 }, logoPreview: { alignItems: "center", backgroundColor: "#EDF7F5", borderColor: "#CBE6E2", borderRadius: 16, borderWidth: 1, height: 76, justifyContent: "center", overflow: "hidden", width: 76 }, logoImage: { height: 72, width: 72 }, logoCopy: { flex: 1, gap: 4 }, logoTitle: { color: "#102B3D", fontWeight: "700" }, logoButton: { alignItems: "center", alignSelf: "flex-start", borderColor: "#00A99D", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 42, paddingHorizontal: 13 }, logoButtonText: { color: "#007D74", fontWeight: "700" },
  hint: { color: "#65758A", fontSize: 12, lineHeight: 18 }, error: { color: "#B64337", fontSize: 12 }, success: { color: "#007D74", fontSize: 13, fontWeight: "700" },
  submit: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 13, justifyContent: "center", marginTop: 5, minHeight: 52 }, submitText: { color: "#FFF", fontSize: 15, fontWeight: "800" }, disabled: { opacity: 0.5 },
  signOutButton: { alignItems: "center", borderColor: "#EEC9C4", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 9, justifyContent: "center", minHeight: 50 }, signOutText: { color: "#B64337", fontSize: 15, fontWeight: "800" },
});
