import { LoadingState } from "../../../../src/components/loading-state";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { monthlyPaymentSelection } from "../../../../src/features/members/monthly-payment-selection";
import { getMyMonthlyPaymentContext } from "../../../../src/features/member-dashboard/api";
import { getMonthlyPaymentContext, type MonthlyPaymentContext } from "../../../../src/lib/supabase";

const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
const monthLabel = (value: string) => new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));

export default function MonthlyPaymentAmount({ memberMonth }: { memberMonth?: string } = {}) {
  const { memberId, dueId, selectedYear } = useLocalSearchParams<{ memberId: string; dueId: string; selectedYear?: string }>();
  const [context, setContext] = useState<MonthlyPaymentContext | null>(null);
  const [amount, setAmount] = useState(0);
  const [trackWidth, setTrackWidth] = useState(280);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fillProgress = useRef(new Animated.Value(0)).current;
  const markerPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let active = true;
    if (memberMonth ? !/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(memberMonth) : !memberId || !dueId) { setLoading(false); setError("Mensualité introuvable."); return; }
    const request = memberMonth ? getMyMonthlyPaymentContext(memberMonth) : getMonthlyPaymentContext(memberId, dueId).then(({ id }) => id);
    void request.then((id) => {
      if (!active) return;
      if (!id) { setError("Mensualité introuvable."); return; }
      fillProgress.setValue(monthlyPaymentSelection(id).paidFraction);
      setContext(id);
      setAmount(monthlyPaymentSelection(id).suggestedAmount);
    }).catch(() => { if (active) setError("Impossible de charger cette mensualité."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [memberId, dueId, memberMonth, fillProgress]);

  const selection = useMemo(() => context ? monthlyPaymentSelection(context) : null, [context]);
  const canPay = !!selection && selection.options.length > 0;
  const fraction = context && context.amountDue > 0 ? (context.amountPaid + amount) / context.amountDue : 0;
  const barWidth = trackWidth - 40;
  const selectedOption = selection?.options.find((option) => option.amount === amount);
  const animatedWidth = fillProgress.interpolate({ inputRange: [0, 1], outputRange: [0, barWidth] });

  useEffect(() => {
    if (!context) return;
    const animation = Animated.timing(fillProgress, { toValue: Math.min(1, Math.max(0, fraction)), duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [context, fraction, fillProgress]);

  useEffect(() => {
    if (!selectedOption) return;
    markerPulse.setValue(0.78);
    const animation = Animated.spring(markerPulse, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [selectedOption?.targetPaid, markerPulse]);

  return <ScrollView contentContainerStyle={styles.page}>
    <Pressable onPress={() => memberMonth ? router.replace("/home") : router.replace({ pathname: "/(admin)/members/[memberId]", params: { memberId, selectedYear: selectedYear ?? "" } })} accessibilityRole="button" accessibilityLabel={memberMonth ? "Retour au calendrier" : "Retour à la fiche membre"} style={styles.back}><Feather name="arrow-left" size={20} color="#007D74" /><Text style={styles.backText}>Retour</Text></Pressable>
    <View style={styles.heading}><View style={styles.stepBadge}><Text style={styles.step}>ÉTAPE 1 / 2</Text></View><Text style={styles.title}>Payer une mensualité</Text><Text style={styles.subtitle}>{memberMonth ? "Choisissez le montant que vous souhaitez régler." : "Choisissez le palier correspondant au versement reçu."}</Text></View>
    {loading ? <LoadingState label="Chargement de la mensualité…" /> : error ? <Text style={styles.error}>{error}</Text> : context && selection ? <>
      <View style={styles.hero}>
        <View style={styles.heroCircleLarge} /><View style={styles.heroCircleSmall} />
        <View style={styles.heroTop}><View style={styles.heroIcon}><Feather name="calendar" size={18} color="#D3F8EE" /></View><Text style={styles.heroMonth}>{monthLabel(context.month)}</Text></View>
        <Text style={styles.member}>{context.memberName}</Text>
        <Text style={styles.heroCaption}>Mensualité à régler</Text>
        <Text style={styles.heroAmount}>{money(context.amountDue)}</Text>
        <View style={styles.heroStats}><View style={styles.heroStat}><Text style={styles.heroStatLabel}>Déjà réglé</Text><Text style={styles.heroStatValue}>{money(context.amountPaid)}</Text></View><View style={styles.heroDivider} /><View style={styles.heroStat}><Text style={styles.heroStatLabel}>Reste à régler</Text><Text style={styles.heroStatValue}>{money(context.amountRemaining)}</Text></View></View>
      </View>
      {canPay ? <View style={styles.card}>
        <View style={styles.sectionHead}><View style={styles.sectionIcon}><Feather name="sliders" size={17} color="#007D74" /></View><View style={styles.sectionHeadText}><Text style={styles.sectionTitle}>Montant du versement</Text><Text style={styles.hint}>Touchez un rond pour choisir un palier.</Text></View></View>
        <View style={styles.installmentPill}><Feather name="layers" size={14} color="#007D74" /><Text style={styles.installmentText}>{context.paymentCount} sur {context.maxPayments} versements effectués · {selection.remainingSlots} restant{selection.remainingSlots > 1 ? "s" : ""}</Text></View>
        <View style={styles.progressLabels}><Text style={styles.paidLabel}>{Math.round(selection.paidFraction * 100)} % déjà payé</Text><Text style={styles.targetLabel}>{Math.round(fraction * 100)} % après ce choix</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} onLayout={({ nativeEvent }) => setTrackWidth(Math.max(160, Math.min(nativeEvent.layout.width, 660)))} contentContainerStyle={styles.trackScroll}>
          <View style={[styles.trackArea, { width: trackWidth }]}>
            <View style={[styles.track, { width: barWidth }]} />
            <Animated.View style={[styles.selectedFill, { width: animatedWidth }]} />
            <View style={[styles.paidFill, { width: barWidth * selection.paidFraction }]} />
            {selection.markers.map((marker) => {
              const selected = marker.available && marker.amount === amount;
              const paid = marker.targetPaid <= context.amountPaid;
              const x = 20 + marker.targetPaid / context.amountDue * barWidth;
              return <Pressable key={marker.index} accessibilityRole="button" accessibilityState={{ disabled: !marker.available, selected }} accessibilityLabel={marker.available ? `Payer ${money(marker.amount)}, palier ${marker.index} sur ${context.maxPayments}` : `Palier ${marker.index} sur ${context.maxPayments}${paid ? ", déjà payé" : ", indisponible"}`} disabled={!marker.available} onPress={() => setAmount(marker.amount)} style={[styles.marker, { left: x - 22 }]}>
                <Animated.View style={[styles.markerCircle, paid && styles.markerPaid, selected && styles.markerSelected, !marker.available && !paid && styles.markerDisabled, selected && { transform: [{ scale: markerPulse }] }]}>{paid && !selected ? <Feather name="check" size={13} color="#FFF" /> : selected ? <View style={styles.markerCenter} /> : null}</Animated.View>
              </Pressable>;
            })}
            {selection.markers.map((marker) => {
              const labelWidth = context.maxPayments <= 5 ? 64 : 36;
              const center = 20 + marker.targetPaid / context.amountDue * barWidth;
              return <Text key={`label-${marker.index}`} style={[styles.markerLabel, marker.available && marker.amount === amount && styles.markerLabelSelected, { left: Math.max(0, Math.min(trackWidth - labelWidth, center - labelWidth / 2)), width: labelWidth }]}>{context.maxPayments <= 5 ? marker.available ? new Intl.NumberFormat("fr-FR").format(marker.amount) : marker.targetPaid <= context.amountPaid ? "Payé" : "—" : marker.index}</Text>;
            })}
          </View>
        </ScrollView>
        {selection.mustSettle ? <Text style={styles.hint}>Dernier versement autorisé : le solde complet doit être réglé.</Text> : null}
        {selection.legacyBalanceOnly ? <Text style={styles.hint}>Les paiements précédents ne correspondent pas aux paliers actuels : seul le solde complet peut être sélectionné.</Text> : null}
        <View style={styles.choiceSummary}><View><Text style={styles.amountLabel}>VERSEMENT SÉLECTIONNÉ</Text><Text style={styles.amount}>{money(amount)}</Text></View><View style={styles.choiceIcon}><Feather name="check" size={19} color="#007D74" /></View></View>
        <View style={styles.afterRow}><Feather name="info" size={14} color="#65758A" /><Text style={styles.hint}>Solde après ce paiement : {money(Math.max(0, context.amountRemaining - amount))}</Text></View>
      </View> : <Text style={styles.error}>{context.amountRemaining <= 0 ? "Cette mensualité est déjà réglée." : memberMonth ? "Aucun nouveau versement n’est possible pour cette mensualité. Contactez l’administrateur." : "La limite de versements est atteinte. Modifiez le paramètre administrateur pour régler le solde."}</Text>}
      <Pressable accessibilityRole="button" disabled={!canPay || !selectedOption} onPress={() => memberMonth ? router.push({ pathname: "/monthly/[month]/payment-method", params: { month: memberMonth, amount: String(amount) } }) : router.push({ pathname: "/(admin)/members/[memberId]/monthly-payment-method", params: { memberId, dueId, amount: String(amount), selectedYear: selectedYear ?? "" } })} style={[styles.continue, (!canPay || !selectedOption) && styles.disabled]}><Text style={styles.continueText}>Continuer avec {money(amount)}</Text><Feather name="arrow-right" size={18} color="#FFF" /></Pressable>
    </> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { alignSelf: "center", backgroundColor: "#F3F8F6", flexGrow: 1, gap: 18, maxWidth: 760, padding: 20, paddingBottom: 76, paddingTop: 34, width: "100%" },
  back: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#E7F3EF", borderRadius: 12, flexDirection: "row", gap: 7, paddingHorizontal: 12, paddingVertical: 9 },
  backText: { color: "#006C63", fontSize: 13, fontWeight: "800" },
  heading: { gap: 8, marginBottom: 2 }, stepBadge: { alignSelf: "flex-start", backgroundColor: "#DDF2EB", borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  step: { color: "#007D74", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  title: { color: "#102B3D", fontSize: 28, fontWeight: "800", letterSpacing: -0.5 }, subtitle: { color: "#65758A", fontSize: 13, lineHeight: 20 },
  message: { color: "#65758A" }, error: { color: "#B64337" },
  hero: { backgroundColor: "#075E58", borderRadius: 22, gap: 5, overflow: "hidden", padding: 20, shadowColor: "#064940", shadowOpacity: 0.15, shadowRadius: 18, elevation: 4 },
  heroCircleLarge: { borderColor: "rgba(255,255,255,0.11)", borderRadius: 105, borderWidth: 30, height: 210, position: "absolute", right: -72, top: -72, width: 210 },
  heroCircleSmall: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 55, height: 110, position: "absolute", right: 45, top: 78, width: 110 },
  heroTop: { alignItems: "center", flexDirection: "row", gap: 9, marginBottom: 9 }, heroIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, height: 35, justifyContent: "center", width: 35 },
  heroMonth: { color: "#DAF7ED", fontSize: 13, fontWeight: "700", textTransform: "capitalize" }, member: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  heroCaption: { color: "#BCE7DC", fontSize: 11, marginTop: 12 }, heroAmount: { color: "#FFF", fontSize: 31, fontWeight: "800", letterSpacing: -0.6 },
  heroStats: { backgroundColor: "rgba(255,255,255,0.11)", borderRadius: 13, flexDirection: "row", marginTop: 17, paddingHorizontal: 14, paddingVertical: 12 },
  heroStat: { flex: 1, gap: 5 }, heroDivider: { backgroundColor: "rgba(255,255,255,0.24)", marginHorizontal: 13, width: 1 },
  heroStatLabel: { color: "#C9EDE5", fontSize: 10 }, heroStatValue: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  card: { backgroundColor: "#FFF", borderRadius: 22, gap: 16, padding: 20, shadowColor: "#0F534B", shadowOpacity: 0.07, shadowRadius: 16, elevation: 2 },
  sectionHead: { alignItems: "center", flexDirection: "row", gap: 11 }, sectionIcon: { alignItems: "center", backgroundColor: "#E5F6F0", borderRadius: 11, height: 38, justifyContent: "center", width: 38 }, sectionHeadText: { flex: 1, gap: 3 },
  sectionTitle: { color: "#102B3D", fontSize: 16, fontWeight: "800" }, hint: { color: "#65758A", fontSize: 12, lineHeight: 18 },
  installmentPill: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#ECF7F3", borderRadius: 20, flexDirection: "row", gap: 7, paddingHorizontal: 11, paddingVertical: 8 }, installmentText: { color: "#007D74", fontSize: 11, fontWeight: "700" },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 }, paidLabel: { color: "#758797", fontSize: 11, fontWeight: "600" }, targetLabel: { color: "#007D74", fontSize: 11, fontWeight: "800" },
  trackScroll: { paddingVertical: 5 }, trackArea: { height: 71, position: "relative" },
  track: { backgroundColor: "#E2ECE8", borderRadius: 6, height: 12, left: 20, position: "absolute", top: 20 },
  selectedFill: { backgroundColor: "#48C8AF", borderRadius: 6, height: 12, left: 20, position: "absolute", top: 20 }, paidFill: { backgroundColor: "#087C70", borderRadius: 6, height: 12, left: 20, position: "absolute", top: 20 },
  marker: { alignItems: "center", height: 44, justifyContent: "center", position: "absolute", top: 4, width: 44 },
  markerCircle: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#25B69C", borderRadius: 15, borderWidth: 3, height: 30, justifyContent: "center", shadowColor: "#0A6C5C", shadowOpacity: 0.13, shadowRadius: 5, width: 30 },
  markerPaid: { backgroundColor: "#087C70", borderColor: "#087C70" }, markerSelected: { backgroundColor: "#00A98F", borderColor: "#FFF", borderWidth: 3, height: 36, shadowOpacity: 0.24, width: 36 }, markerDisabled: { backgroundColor: "#E7EEEB", borderColor: "#B6C6C0" }, markerCenter: { backgroundColor: "#FFF", borderRadius: 5, height: 9, width: 9 },
  markerLabel: { color: "#788A91", fontSize: 11, fontWeight: "700", position: "absolute", textAlign: "center", top: 51 }, markerLabelSelected: { color: "#007D74", fontWeight: "800" },
  choiceSummary: { alignItems: "center", backgroundColor: "#EAF8F2", borderColor: "#D0EBDE", borderRadius: 15, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 4, padding: 15 },
  choiceIcon: { alignItems: "center", backgroundColor: "#D1F0E2", borderRadius: 20, height: 36, justifyContent: "center", width: 36 }, amountLabel: { color: "#54796D", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 }, amount: { color: "#006C63", fontSize: 26, fontWeight: "800", marginTop: 4 },
  afterRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  continue: { alignItems: "center", backgroundColor: "#00A98F", borderRadius: 15, flexDirection: "row", gap: 12, justifyContent: "center", minHeight: 56, shadowColor: "#006C63", shadowOpacity: 0.16, shadowRadius: 10, elevation: 3 }, disabled: { opacity: 0.45 }, continueText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
