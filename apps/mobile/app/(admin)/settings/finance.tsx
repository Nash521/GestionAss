import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Linking, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardSafeScreen } from "../../../src/components/keyboard-safe-screen";
import { clearBiometricLogin } from "../../../src/lib/biometric-session";
import { getAssociationLogoUrl, getAssociationSettings, getWavePaymentLink, saveAssociationSettings, saveWavePaymentLink, uploadAssociationLogo } from "../../../src/features/admin-configuration/api";
import { validateAssociationSettings, type AssociationSettings } from "../../../src/features/admin-configuration/association";
import { normalizeWavePaymentLink } from "../../../src/features/admin-configuration/wave";
import { createAdminFinanceAction, getFunctionErrorMessage, getMonthlyContributionSettings } from "../../../src/lib/supabase";
import { getSupabaseClient, invokeRegistrationFunction } from "../../../src/lib/supabase-client";

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
  const [maxPayments, setMaxPayments] = useState("3");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waveLink, setWaveLink] = useState("");
  const [waveSavedLink, setWaveSavedLink] = useState<string | null>(null);
  const [waveLoading, setWaveLoading] = useState(true);
  const [waveSaving, setWaveSaving] = useState(false);
  const [waveError, setWaveError] = useState("");
  const [waveSaved, setWaveSaved] = useState(false);
  const [jekoKey, setJekoKey] = useState("");
  const [jekoWebhookSecret, setJekoWebhookSecret] = useState("");
  const [jekoKeyId, setJekoKeyId] = useState("");
  const [jekoStoreId, setJekoStoreId] = useState("");
  const [jekoConfigured, setJekoConfigured] = useState(false);
  const [jekoLoading, setJekoLoading] = useState(true);
  const [jekoSaving, setJekoSaving] = useState(false);
  const [jekoMessage, setJekoMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [invitation, setInvitation] = useState<{ code: string; expiresAt: string } | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState("");

  const generateInvitation = async () => {
    if (invitationLoading) return;
    setInvitationLoading(true); setInvitationMessage("");
    try {
      const result = await invokeRegistrationFunction<{ code: string; expiresAt: string }>("create-registration-invitation", {});
      setInvitation(result);
    } catch {
      setInvitationMessage("Impossible de générer le code. Réessayez.");
    } finally { setInvitationLoading(false); }
  };

  const shareInvitation = async () => {
    if (!invitation) return;
    const message = `Code d’invitation GestionAss : ${invitation.code}`;
    try {
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(message);
        setInvitationMessage("Code copié. Vous pouvez le partager.");
      } else {
        await Share.share({ message });
      }
    } catch { setInvitationMessage("Impossible de partager le code. Vous pouvez le sélectionner et le copier."); }
  };

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
    void getWavePaymentLink().then((url) => {
      if (active) { setWaveLink(url ?? ""); setWaveSavedLink(url); }
    }).catch(() => { if (active) setWaveError("Impossible de charger le lien Wave."); })
      .finally(() => { if (active) setWaveLoading(false); });
    void invokeRegistrationFunction<{ configured: boolean; apiKeyId: string | null; storeId: string | null }>("manage-jeko-configuration", { action: "status" }).then((result) => {
      if (active) { setJekoConfigured(result.configured); setJekoKeyId(result.apiKeyId ?? ""); setJekoStoreId(result.storeId ?? ""); }
    }).catch(() => { if (active) setJekoMessage("Impossible de charger la configuration Jèko."); }).finally(() => { if (active) setJekoLoading(false); });
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
    if (!membershipFeeAmount.trim() || !Number.isInteger(fee) || fee < 0 || fee > 9999999999 || !monthlyAmount.trim() || !Number.isInteger(amount) || amount < 0 || amount > 9999999999 || !Number.isInteger(day) || day < 1 || day > 28 || !maxPayments.trim() || !Number.isInteger(limit) || limit < 1 || limit > 12) return setError("Renseignez des montants entiers positifs, un jour entre 1 et 28 et un nombre de versements entre 1 et 12.");
    setSaving(true); setError(""); setSaved(false);
    try { await createAdminFinanceAction({ action: "updateContributionSettings", membershipFeeAmount: fee, monthlyAmount: amount, dueDay: day, maxPayments: limit }); setSaved(true); }
    catch (reason) { setError((await getFunctionErrorMessage(reason)) ?? "Impossible de mettre à jour les paramètres."); }
    finally { setSaving(false); }
  };

  const saveWave = async () => {
    if (waveSaving) return;
    setWaveSaved(false); setWaveError("");
    try {
      normalizeWavePaymentLink(waveLink);
      setWaveSaving(true);
      const url = await saveWavePaymentLink(waveLink);
      setWaveSavedLink(url); setWaveLink(url ?? ""); setWaveSaved(true);
    } catch (reason) {
      setWaveError(reason instanceof Error ? reason.message : "Impossible d’enregistrer le lien Wave.");
    } finally { setWaveSaving(false); }
  };

  const saveJeko = async () => {
    if (jekoSaving) return;
    if (!jekoKey.trim() || !jekoWebhookSecret.trim() || !jekoKeyId.trim() || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jekoStoreId.trim())) { setJekoMessage("Renseignez la clé, le secret webhook, son identifiant et un identifiant de magasin valide."); return; }
    setJekoSaving(true); setJekoMessage("");
    try {
      await invokeRegistrationFunction("manage-jeko-configuration", { action: "save", apiKey: jekoKey.trim(), webhookSecret: jekoWebhookSecret.trim(), apiKeyId: jekoKeyId.trim(), storeId: jekoStoreId.trim() });
      setJekoKey(""); setJekoWebhookSecret(""); setJekoConfigured(true); setJekoMessage("Configuration enregistrée. La clé ne peut plus être affichée.");
    } catch { setJekoMessage("Impossible d’enregistrer la configuration Jèko."); }
    finally { setJekoSaving(false); }
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
      {associationLoading ? <Text style={styles.hint}>Chargement des informations…</Text> : null}
      {associationError ? <Text style={styles.error} accessibilityRole="alert">{associationError}</Text> : null}
      {associationSaved ? <Text style={styles.success}>Informations de l’association enregistrées.</Text> : null}
      <Pressable accessibilityRole="button" disabled={associationLoading || associationSaving || !organizationId} onPress={() => void saveAssociation()} style={[styles.submit, (associationLoading || associationSaving || !organizationId) && styles.disabled]}><Text style={styles.submitText}>{associationSaving ? "Enregistrement…" : "Enregistrer l’association"}</Text></Pressable>
    </View>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Invitation des membres</Text>
      <Text style={styles.hint}>Générez un code à partager avec les personnes qui souhaitent rejoindre votre association. Chaque code est valable 7 jours et peut servir à plusieurs inscriptions.</Text>
      <Pressable accessibilityRole="button" disabled={invitationLoading} onPress={() => void generateInvitation()} style={[styles.submit, invitationLoading && styles.disabled]}><Text style={styles.submitText}>{invitationLoading ? "Génération…" : invitation ? "Générer un autre code" : "Générer un code"}</Text></Pressable>
      {invitation ? <><Text style={styles.label}>Code d’invitation</Text><Text selectable style={styles.input}>{invitation.code}</Text><Text style={styles.hint}>Valable jusqu’au {new Date(invitation.expiresAt).toLocaleString("fr-FR")}.</Text><Pressable accessibilityRole="button" onPress={() => void shareInvitation()} style={styles.logoButton}><Feather name="share-2" size={16} color="#007D74" /><Text style={styles.logoButtonText}>{Platform.OS === "web" ? "Copier le code" : "Partager le code"}</Text></Pressable></> : null}
      {invitationMessage ? <Text style={styles.hint} accessibilityRole="alert">{invitationMessage}</Text> : null}
    </View>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Cotisations</Text>
      <Text style={styles.label}>Droit d’adhésion (XOF)</Text><TextInput value={membershipFeeAmount} onChangeText={setMembershipFeeAmount} editable={!loading && !saving} keyboardType="number-pad" placeholder="Ex. 5000" style={styles.input} accessibilityLabel="Droit d’adhésion" />
      <Text style={styles.hint}>Le nouveau montant s’applique aux futurs membres. Les droits déjà créés gardent leur montant.</Text>
      <Text style={styles.label}>Montant mensuel (XOF)</Text><TextInput value={monthlyAmount} onChangeText={setMonthlyAmount} editable={!loading && !saving} keyboardType="decimal-pad" placeholder="Ex. 5000" style={styles.input} accessibilityLabel="Montant mensuel" />
      <Text style={styles.label}>Jour d’échéance (1 à 28)</Text><TextInput value={dueDay} onChangeText={setDueDay} editable={!loading && !saving} keyboardType="number-pad" style={styles.input} accessibilityLabel="Jour d'échéance" />
      <Text style={styles.label}>Nombre maximal de versements par mensualité (1 à 12)</Text><TextInput value={maxPayments} onChangeText={setMaxPayments} editable={!loading && !saving} keyboardType="number-pad" style={styles.input} accessibilityLabel="Nombre maximal de versements" />
      <Text style={styles.hint}>Le dernier versement doit régler tout le solde de la mensualité.</Text>
      {loading ? <Text style={styles.hint}>Chargement des cotisations…</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      {saved ? <Text style={styles.success}>Paramètres enregistrés.</Text> : null}
      <Pressable accessibilityRole="button" disabled={loading || saving} onPress={() => void save()} style={[styles.submit, (loading || saving) && styles.disabled]}><Text style={styles.submitText}>{saving ? "Enregistrement…" : "Enregistrer les cotisations"}</Text></Pressable>
    </View>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Finances · Jèko</Text>
      <Text style={styles.hint}>Configurez le compte Jèko de votre association. Après enregistrement, la clé secrète ne sera plus affichée. Vous pouvez la remplacer en saisissant une nouvelle clé.</Text>
      <Text style={styles.hint}>{jekoLoading ? "Chargement…" : jekoConfigured ? "Clé enregistrée" : "Aucune clé enregistrée"}</Text>
      <Text style={styles.label}>Identifiant de clé API</Text><TextInput value={jekoKeyId} onChangeText={setJekoKeyId} autoCapitalize="none" autoCorrect={false} editable={!jekoLoading && !jekoSaving} style={styles.input} accessibilityLabel="Identifiant de clé API Jèko" />
      <Text style={styles.label}>Identifiant du magasin Jèko</Text><TextInput value={jekoStoreId} onChangeText={setJekoStoreId} autoCapitalize="none" autoCorrect={false} editable={!jekoLoading && !jekoSaving} style={styles.input} accessibilityLabel="Identifiant du magasin Jèko" />
      <Text style={styles.label}>{jekoConfigured ? "Nouvelle clé API" : "Clé API"}</Text><TextInput value={jekoKey} onChangeText={setJekoKey} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="none" editable={!jekoLoading && !jekoSaving} style={styles.input} accessibilityLabel="Clé API secrète Jèko" />
      <Text style={styles.label}>Secret du webhook Jèko</Text><TextInput value={jekoWebhookSecret} onChangeText={setJekoWebhookSecret} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="none" editable={!jekoLoading && !jekoSaving} style={styles.input} accessibilityLabel="Secret du webhook Jèko" />
      {jekoMessage ? <Text style={styles.hint} accessibilityRole="alert">{jekoMessage}</Text> : null}
      <Pressable accessibilityRole="button" disabled={jekoLoading || jekoSaving} onPress={() => void saveJeko()} style={[styles.submit, (jekoLoading || jekoSaving) && styles.disabled]}><Text style={styles.submitText}>{jekoSaving ? "Enregistrement…" : "Enregistrer la configuration Jèko"}</Text></Pressable>
    </View>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Finances · Wave</Text>
      <Text style={styles.hint}>Ajoutez le lien de paiement de votre compte marchand Wave Business. Chaque association utilise son propre lien.</Text>
      <Text style={styles.label}>Lien de paiement Wave Business</Text>
      <TextInput value={waveLink} onChangeText={(value) => { setWaveLink(value); setWaveSaved(false); setWaveError(""); }} editable={!waveLoading && !waveSaving} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://pay.wave.com/m/…" style={styles.input} accessibilityLabel="Lien de paiement Wave Business" />
      <Text style={styles.hint}>Le lien ouvre Wave pour payer. Il ne confirme pas automatiquement le paiement dans l’application : vérifiez la transaction dans Wave Business avant de l’enregistrer.</Text>
      {waveLoading ? <Text style={styles.hint}>Chargement du lien Wave…</Text> : null}
      {waveError ? <Text style={styles.error} accessibilityRole="alert">{waveError}</Text> : null}
      {waveSaved ? <Text style={styles.success}>Lien Wave enregistré.</Text> : null}
      {waveSavedLink ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(waveSavedLink).catch(() => setWaveError("Impossible d’ouvrir le lien Wave."))} style={styles.logoButton}><Feather name="external-link" size={16} color="#007D74" /><Text style={styles.logoButtonText}>Ouvrir le lien enregistré</Text></Pressable> : null}
      <Pressable accessibilityRole="button" disabled={waveLoading || waveSaving} onPress={() => void saveWave()} style={[styles.submit, (waveLoading || waveSaving) && styles.disabled]}><Text style={styles.submitText}>{waveSaving ? "Enregistrement…" : "Enregistrer le lien Wave"}</Text></Pressable>
    </View>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Session</Text>
      <Text style={styles.hint}>Fermez votre session sur cet appareil.</Text>
      {signOutError ? <Text style={styles.error} accessibilityRole="alert">{signOutError}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Se déconnecter" disabled={signingOut} onPress={() => void signOut()} style={[styles.signOutButton, signingOut && styles.disabled]}><Feather name="log-out" size={18} color="#B64337" /><Text style={styles.signOutText}>{signingOut ? "Déconnexion…" : "Se déconnecter"}</Text></Pressable>
    </View>
  </View></KeyboardSafeScreen>;
}

const styles = StyleSheet.create({
  page: { alignSelf: "center", backgroundColor: "#F7FBFA", gap: 17, maxWidth: 760, padding: 20, paddingBottom: 72, paddingTop: 32, width: "100%" },
  back: { alignItems: "center", flexDirection: "row", gap: 8 }, backText: { color: "#007D74", fontWeight: "800" },
  title: { color: "#102B3D", fontSize: 28, fontWeight: "800", marginTop: 8 }, subtitle: { color: "#65758A", lineHeight: 20 },
  card: { backgroundColor: "#FFF", borderColor: "#E1EBE9", borderRadius: 18, borderWidth: 1, gap: 11, padding: 18 },
  sectionTitle: { color: "#102B3D", fontSize: 19, fontWeight: "800" }, label: { color: "#102B3D", fontSize: 13, fontWeight: "700", marginTop: 3 },
  input: { backgroundColor: "#FFF", borderColor: "#DDE6E8", borderRadius: 12, borderWidth: 1, color: "#102B3D", minHeight: 50, padding: 12 }, addressInput: { minHeight: 74, textAlignVertical: "top" },
  logoRow: { alignItems: "center", flexDirection: "row", gap: 14 }, logoPreview: { alignItems: "center", backgroundColor: "#EDF7F5", borderColor: "#CBE6E2", borderRadius: 16, borderWidth: 1, height: 76, justifyContent: "center", overflow: "hidden", width: 76 }, logoImage: { height: 72, width: 72 }, logoCopy: { flex: 1, gap: 4 }, logoTitle: { color: "#102B3D", fontWeight: "700" }, logoButton: { alignItems: "center", alignSelf: "flex-start", borderColor: "#00A99D", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 42, paddingHorizontal: 13 }, logoButtonText: { color: "#007D74", fontWeight: "700" },
  hint: { color: "#65758A", fontSize: 12, lineHeight: 18 }, error: { color: "#B64337", fontSize: 12 }, success: { color: "#007D74", fontSize: 13, fontWeight: "700" },
  submit: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 13, justifyContent: "center", marginTop: 5, minHeight: 52 }, submitText: { color: "#FFF", fontSize: 15, fontWeight: "800" }, disabled: { opacity: 0.5 },
  signOutButton: { alignItems: "center", borderColor: "#EEC9C4", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 9, justifyContent: "center", minHeight: 50 }, signOutText: { color: "#B64337", fontSize: 15, fontWeight: "800" },
});
