import { useCallback, useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AdminHeader } from "../../../../src/components/admin-chrome";
import {
  AdminMemberDetail,
  decideDisciplinaryCase,
  DisciplinaryCase,
  getAdminMemberDetail,
  listDisciplinaryCases,
  openDisciplinaryCase,
} from "../../../../src/features/members/api";
import { getFunctionErrorMessage } from "../../../../src/lib/supabase";

const background = require("../../../../assets/Fond_ecranMobile.png");
type Outcome = "confirmed" | "dismissed";
type Sanction = DisciplinaryCase["sanction"];

const publicError = async (error: unknown, fallback: string) => {
  const message = await getFunctionErrorMessage(error);
  if (message === "Forbidden") return "Vous n’êtes pas autorisé à gérer ces dossiers.";
  if (message === "Not found") return "Le membre ou le dossier demandé est introuvable.";
  if (message === "Conflict") return "Cette action n’est plus possible. Actualisez les dossiers.";
  if (message === "Invalid request") return "Vérifiez les informations saisies puis réessayez.";
  if (message === "Service unavailable") return "Le service est momentanément indisponible. Réessayez dans un instant.";
  return fallback;
};

const dateTime = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
};
const statusLabel = (status: DisciplinaryCase["status"]) => ({ open: "À instruire", confirmed: "Décision confirmée", dismissed: "Dossier rejeté", closed: "Clôturé" })[status];
const sanctionLabel = (sanction: Sanction) => ({ none: "Aucune", warning: "Avertissement", suspension: "Suspension", removal: "Exclusion" })[sanction];

export default function MemberDisciplinaryCases() {
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const memberIdIsValid = typeof memberId === "string" && memberId.length > 0;
  const [detail, setDetail] = useState<AdminMemberDetail | null>(null);
  const [cases, setCases] = useState<DisciplinaryCase[]>([]);
  const [loading, setLoading] = useState(memberIdIsValid);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [observations, setObservations] = useState("");
  const [evidence, setEvidence] = useState("");
  const [contributionPolicy, setContributionPolicy] = useState<"continue" | "stop">("continue");
  const [outcome, setOutcome] = useState<Outcome>("dismissed");
  const [sanction, setSanction] = useState<Sanction>("none");
  const [decisionObservations, setDecisionObservations] = useState("");
  const requestSequence = useRef(0);

  const loadData = useCallback(async (showLoading = true) => {
    if (!memberIdIsValid) return;
    const requestId = ++requestSequence.current;
    if (showLoading) setLoading(true);
    setLoadError("");
    try {
      const [memberResult, caseResult] = await Promise.all([
        getAdminMemberDetail(memberId),
        listDisciplinaryCases(memberId),
      ]);
      if (requestId !== requestSequence.current) return;
      setDetail(memberResult);
      setCases(caseResult.cases);
    } catch (error) {
      if (requestId !== requestSequence.current) return;
      setLoadError(await publicError(error, "Impossible de charger les dossiers disciplinaires."));
    } finally {
      if (showLoading && requestId === requestSequence.current) setLoading(false);
    }
  }, [memberId, memberIdIsValid]);

  useEffect(() => {
    if (!memberIdIsValid) {
      setDetail(null);
      setCases([]);
      setLoading(false);
      return;
    }
    void loadData();
    return () => { requestSequence.current++; };
  }, [loadData, memberIdIsValid]);

  const submitOpening = async () => {
    const duration = Number(durationDays);
    if (!memberIdIsValid || !reason.trim() || reason.trim().length > 2000 || !Number.isInteger(duration) || duration < 1 || duration > 3650 || observations.length > 5000 || evidence.length > 5000) {
      setActionError("Saisissez un motif, une durée entière de 1 à 3 650 jours et des notes de 5 000 caractères maximum.");
      return;
    }
    setSaving(true);
    setActionError("");
    setSuccess("");
    try {
      await openDisciplinaryCase({
        memberId,
        reason: reason.trim(),
        durationDays: duration,
        observations: observations.trim() || undefined,
        evidence: evidence.trim() || undefined,
        contributionPolicy,
      });
      setReason("");
      setDurationDays("30");
      setObservations("");
      setEvidence("");
      setSuccess("Dossier ouvert. Le membre reste actif jusqu’à la décision.");
      await loadData(false);
    } catch (error) {
      setActionError(await publicError(error, "Impossible d’ouvrir le dossier."));
    } finally {
      setSaving(false);
    }
  };

  const submitDecision = async (caseId: string) => {
    setSaving(true);
    setActionError("");
    setSuccess("");
    try {
      await decideDisciplinaryCase({
        caseId,
        outcome,
        sanction: outcome === "dismissed" ? "none" : sanction,
        observations: decisionObservations.trim() || undefined,
      });
      setDecisionObservations("");
      setSuccess(outcome === "dismissed" ? "Dossier rejeté ; le membre reste actif." : "Décision enregistrée.");
      await loadData(false);
    } catch (error) {
      setActionError(await publicError(error, "Impossible d’enregistrer la décision."));
    } finally {
      setSaving(false);
    }
  };

  const openCase = cases.find((item) => item.status === "open");
  const body = !memberIdIsValid
    ? <State message="Membre introuvable." />
    : loading && !detail
    ? <State message="Chargement des dossiers…" />
    : loadError && !detail
    ? <State message={loadError} retry={() => void loadData()} />
    : detail
    ? <>
      <View style={styles.memberCard}>
        <Text style={styles.memberName}>{detail.member.firstName} {detail.member.lastName}</Text>
        <Text style={styles.meta}>{detail.member.memberNumber} · {detail.member.phone}</Text>
        <Text style={styles.meta}>Statut du membre : {detail.member.memberStatus === "active" ? "Actif" : detail.member.memberStatus === "suspended" ? "Suspendu" : detail.member.memberStatus === "removed" ? "Exclu" : "En attente"}</Text>
      </View>

      <Section title="Dossiers disciplinaires">
        {cases.length === 0 ? <Text style={styles.empty}>Aucun dossier disciplinaire pour ce membre.</Text> : cases.map((item) => <CaseCard key={item.id} item={item} />)}
        {loadError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{loadError}</Text> : null}
        <Pressable accessibilityRole="button" disabled={saving || loading} onPress={() => void loadData()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{loading ? "Actualisation…" : "Actualiser les dossiers"}</Text>
        </Pressable>
      </Section>

      {openCase ? <DecisionForm
        disabled={saving}
        outcome={outcome}
        sanction={sanction}
        observations={decisionObservations}
        onOutcomeChange={(value) => { setOutcome(value); if (value === "dismissed") setSanction("none"); }}
        onSanctionChange={setSanction}
        onObservationsChange={setDecisionObservations}
        onSubmit={() => void submitDecision(openCase.id)}
      /> : detail.member.memberStatus === "active" ? <OpeningForm
        reason={reason}
        durationDays={durationDays}
        observations={observations}
        evidence={evidence}
        contributionPolicy={contributionPolicy}
        disabled={saving || loading}
        onReasonChange={setReason}
        onDurationChange={setDurationDays}
        onObservationsChange={setObservations}
        onEvidenceChange={setEvidence}
        onPolicyChange={setContributionPolicy}
        onSubmit={() => void submitOpening()}
      /> : <Section title="Nouvelle enquête"><Text style={styles.note}>Un nouveau dossier ne peut être ouvert que pour un membre actif. La réactivation d’un membre suspendu doit être effectuée manuellement par un administrateur depuis sa fiche.</Text></Section>}

      {actionError ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{actionError}</Text> : null}
      {success ? <Text accessibilityLiveRegion="polite" style={styles.success}>{success}</Text> : null}
    </>
    : <State message="Impossible de charger les dossiers disciplinaires." retry={() => void loadData()} />;

  return <View style={styles.page}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}>
        <View style={styles.content}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour à la fiche membre" onPress={() => router.back()} style={styles.back}>
            <Feather name="arrow-left" color="#007D74" size={20} /><Text style={styles.backText}>Fiche membre</Text>
          </Pressable>
          <Text style={styles.title}>Gestion disciplinaire</Text>
          <Text style={styles.intro}>L’ouverture d’un dossier ne modifie pas le statut du membre. Toute sanction éventuelle intervient après la décision.</Text>
          {body}
        </View>
      </ImageBackground>
    </ScrollView>
    <AdminHeader />
  </View>;
}

function OpeningForm({
  reason, durationDays, observations, evidence, contributionPolicy, disabled,
  onReasonChange, onDurationChange, onObservationsChange, onEvidenceChange, onPolicyChange, onSubmit,
}: {
  reason: string; durationDays: string; observations: string; evidence: string; contributionPolicy: "continue" | "stop"; disabled: boolean;
  onReasonChange: (value: string) => void; onDurationChange: (value: string) => void; onObservationsChange: (value: string) => void;
  onEvidenceChange: (value: string) => void; onPolicyChange: (value: "continue" | "stop") => void; onSubmit: () => void;
}) {
  return <Section title="Ouvrir une enquête">
    <Text style={styles.note}>Le membre demeure actif pendant l’enquête. La durée est indicative : aucune suspension automatique ne prendra fin à son échéance.</Text>
    <Field label="Motif (obligatoire, 1 à 2 000 caractères)" value={reason} onChangeText={onReasonChange} multiline maxLength={2000} />
    <Field label="Durée envisagée en jours (1 à 3 650)" value={durationDays} onChangeText={onDurationChange} keyboardType="number-pad" />
    <Field label="Observations (facultatif, 5 000 caractères maximum)" value={observations} onChangeText={onObservationsChange} multiline />
    <Field label="Éléments de preuve (facultatif, texte, 5 000 caractères maximum)" value={evidence} onChangeText={onEvidenceChange} multiline />
    <Text style={styles.fieldLabel}>Si une suspension est décidée, les cotisations :</Text>
    <Choice label="Continuent d’être appelées" selected={contributionPolicy === "continue"} disabled={disabled} onPress={() => onPolicyChange("continue")} />
    <Choice label="S’arrêtent pendant la suspension" selected={contributionPolicy === "stop"} disabled={disabled} onPress={() => onPolicyChange("stop")} />
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onSubmit} style={[styles.primaryButton, disabled && styles.disabled]}>
      <Text style={styles.primaryButtonText}>{disabled ? "Enregistrement…" : "Ouvrir le dossier"}</Text>
    </Pressable>
  </Section>;
}

function DecisionForm({ disabled, outcome, sanction, observations, onOutcomeChange, onSanctionChange, onObservationsChange, onSubmit }: {
  disabled: boolean; outcome: Outcome; sanction: Sanction; observations: string;
  onOutcomeChange: (value: Outcome) => void; onSanctionChange: (value: Sanction) => void; onObservationsChange: (value: string) => void; onSubmit: () => void;
}) {
  return <Section title="Décision de l’administrateur">
    <Text style={styles.note}>La décision est appliquée à son enregistrement. Réactivation ultérieure manuelle : une suspension ne se termine pas automatiquement et devra être levée par un administrateur.</Text>
    <Choice label="Rejeter le dossier" selected={outcome === "dismissed"} disabled={disabled} onPress={() => onOutcomeChange("dismissed")} />
    <Choice label="Confirmer une sanction" selected={outcome === "confirmed"} disabled={disabled} onPress={() => onOutcomeChange("confirmed")} />
    {outcome === "confirmed" ? <View style={styles.choiceGroup}>
      <Text style={styles.fieldLabel}>Sanction</Text>
      {(["none", "warning", "suspension", "removal"] as const).map((value) => <Choice key={value} label={sanctionLabel(value)} selected={sanction === value} disabled={disabled} onPress={() => onSanctionChange(value)} />)}
    </View> : <Text style={styles.note}>Un rejet est toujours enregistré sans sanction.</Text>}
    <Field label="Observations de décision (facultatif)" value={observations} onChangeText={onObservationsChange} multiline />
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onSubmit} style={[styles.primaryButton, disabled && styles.disabled]}>
      <Text style={styles.primaryButtonText}>{disabled ? "Enregistrement…" : "Enregistrer la décision"}</Text>
    </Pressable>
  </Section>;
}

function CaseCard({ item }: { item: DisciplinaryCase }) {
  return <View style={styles.caseCard}>
    <View style={styles.caseHeading}><Text style={styles.caseReason}>{item.reason}</Text><Text style={styles.status}>{statusLabel(item.status)}</Text></View>
    <Text style={styles.meta}>Ouvert le {dateTime(item.openedAt)}</Text>
    <Text style={styles.meta}>Durée envisagée : {item.plannedDurationDays ?? "—"} jours (indicative)</Text>
    <Text style={styles.meta}>Sanction : {sanctionLabel(item.sanction)}</Text>
    <Text style={styles.meta}>Cotisations en cas de suspension : {item.contributionPolicy === "continue" ? "continuent" : "arrêtées"}</Text>
    {item.observations ? <Text style={styles.caseText}>Observations : {item.observations}</Text> : null}
    {item.evidence ? <Text style={styles.caseText}>Éléments de preuve : {item.evidence}</Text> : null}
    {item.decidedAt ? <Text style={styles.meta}>Décidé le {dateTime(item.decidedAt)}</Text> : null}
  </View>;
}

function Field({ label, value, onChangeText, multiline = false, keyboardType, maxLength = 5000 }: {
  label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; keyboardType?: "number-pad"; maxLength?: number;
}) {
  return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} multiline={multiline} maxLength={maxLength} keyboardType={keyboardType} textAlignVertical={multiline ? "top" : "center"} style={[styles.input, multiline && styles.multiline]} />
    {multiline ? <Text style={styles.counter}>{value.length}/{maxLength.toLocaleString("fr-FR")} caractères</Text> : null}
  </View>;
}

function Choice({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} onPress={onPress} disabled={disabled} style={[styles.choice, selected && styles.choiceSelected, disabled && styles.disabled]}>
    <Feather name={selected ? "check-circle" : "circle"} size={17} color={selected ? "#007D74" : "#65758A"} />
    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
  </Pressable>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function State({ message, retry }: { message: string; retry?: () => void }) {
  return <View style={styles.state}><Text style={styles.empty}>{message}</Text>{retry ? <Pressable accessibilityRole="button" onPress={retry} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Réessayer</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, background: { minHeight: "100%" }, backgroundImage: { resizeMode: "cover" },
  content: { gap: 14, padding: 20, paddingBottom: 110, paddingTop: 116 },
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 7 }, backText: { color: "#007D74", fontWeight: "800" },
  title: { color: "#102B3D", fontSize: 28, fontWeight: "800" }, intro: { color: "#65758A", lineHeight: 20 },
  memberCard: { backgroundColor: "rgba(255,255,255,.97)", borderRadius: 16, gap: 5, padding: 15 }, memberName: { color: "#102B3D", fontSize: 18, fontWeight: "800" }, meta: { color: "#65758A", fontSize: 12 },
  section: { backgroundColor: "rgba(255,255,255,.96)", borderRadius: 16, gap: 11, padding: 15 }, sectionTitle: { color: "#102B3D", fontSize: 17, fontWeight: "800" },
  caseCard: { backgroundColor: "#F4FAF8", borderColor: "#E3EEEA", borderRadius: 13, borderWidth: 1, gap: 7, padding: 12 }, caseHeading: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "space-between" }, caseReason: { color: "#102B3D", flex: 1, fontWeight: "800", minWidth: 150 }, status: { backgroundColor: "#E1F7F1", borderRadius: 8, color: "#007D74", fontSize: 11, fontWeight: "700", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 }, caseText: { color: "#344B5E", fontSize: 13, lineHeight: 19 },
  note: { color: "#65758A", fontSize: 13, lineHeight: 19 }, field: { gap: 5 }, fieldLabel: { color: "#344B5E", fontSize: 13, fontWeight: "700" }, input: { backgroundColor: "#FFF", borderColor: "#DDE6E8", borderRadius: 11, borderWidth: 1, color: "#102B3D", minHeight: 46, padding: 11 }, multiline: { minHeight: 92, paddingTop: 11 }, counter: { color: "#8A98A8", fontSize: 10, textAlign: "right" },
  choiceGroup: { gap: 7 }, choice: { alignItems: "center", borderColor: "#DDE6E8", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 42, paddingHorizontal: 10 }, choiceSelected: { backgroundColor: "#E9F8F4", borderColor: "#00A99D" }, choiceText: { color: "#65758A", flex: 1, fontSize: 13 }, choiceTextSelected: { color: "#007D74", fontWeight: "700" },
  primaryButton: { alignItems: "center", backgroundColor: "#00A99D", borderRadius: 12, justifyContent: "center", minHeight: 49, paddingHorizontal: 12 }, primaryButtonText: { color: "#FFF", fontWeight: "800" }, secondaryButton: { alignItems: "center", alignSelf: "center", borderColor: "#00A99D", borderRadius: 10, borderWidth: 1, justifyContent: "center", minHeight: 40, paddingHorizontal: 13 }, secondaryButtonText: { color: "#007D74", fontWeight: "700" }, disabled: { opacity: 0.55 },
  empty: { color: "#65758A", lineHeight: 20, paddingVertical: 9, textAlign: "center" }, state: { alignItems: "center", gap: 9, paddingVertical: 40 }, error: { color: "#B94236", lineHeight: 20 }, success: { color: "#007D74", fontWeight: "700", lineHeight: 20 },
});
