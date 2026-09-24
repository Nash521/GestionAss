import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { formatFinanceDate } from "../../lib/date-format";
import type { MonthlyPaymentTransaction } from "../../lib/supabase";

const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);

export function MonthlyPaymentCard({ item }: { item: MonthlyPaymentTransaction }) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const phone = item.phone?.replace(/[^\d+]/g, "");
  const validPhone = phone && /^\+?[1-9]\d{7,14}$/.test(phone);
  const memberName = [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || "Membre";
  const partial = item.statusAfterPayment === "partial";
  const message = `Bonjour${item.firstName ? ` ${item.firstName}` : ""}, rappel de votre cotisation mensuelle (${formatFinanceDate(item.month)}).`;

  return <>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${memberName}, payé le ${formatFinanceDate(item.paidOn)}, ${money(item.amount)}, ${partial ? "Partiel" : "Payé"}`}
      accessibilityHint="Ouvrir les détails du paiement"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => setDetailsVisible(true)}
    >
      <View style={styles.top}>
        <Text numberOfLines={1} style={styles.name}>{memberName}</Text>
        <Text style={[styles.status, partial ? styles.partial : styles.paid]}>{partial ? "Partiel" : "Payé"}</Text>
      </View>
      <View style={styles.summary}>
        <Text style={styles.date}>{formatFinanceDate(item.paidOn)}</Text>
        <Text style={styles.amount}>{money(item.amount)}</Text>
        <Feather name="chevron-right" size={17} color="#81909C" />
      </View>
    </Pressable>

    <Modal transparent animationType="slide" visible={detailsVisible} onRequestClose={() => setDetailsVisible(false)}>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer les détails du paiement"
          style={styles.backdrop}
          onPress={() => setDetailsVisible(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.heading}>
              <Text style={styles.sheetTitle}>Détail du paiement</Text>
              <Text numberOfLines={1} style={styles.sheetName}>{memberName}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer les détails du paiement"
              hitSlop={10}
              style={styles.closeButton}
              onPress={() => setDetailsVisible(false)}
            >
              <Feather name="x" size={20} color="#102B3D" />
            </Pressable>
          </View>

          <View style={styles.details}>
            <DetailRow label="Mois concerné" value={formatFinanceDate(item.month)} />
            <DetailRow label="Montant payé" value={money(item.amount)} strong />
            <DetailRow label="Date du paiement" value={formatFinanceDate(item.paidOn)} />
            <DetailRow label="Mode de paiement" value={item.source === "wave" ? "Wave" : "Espèces"} />
            <DetailRow label="Statut" value={partial ? "Partiel" : "Payé"} />
            {partial && item.remainingAfterPayment !== null
              ? <DetailRow label="Reste à payer" value={money(item.remainingAfterPayment)} warning />
              : null}
          </View>

          {validPhone ? <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Relancer ${memberName} sur WhatsApp`}
            style={styles.reminder}
            onPress={() => void Linking.openURL(`https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`)}
          >
            <Feather name="message-circle" size={16} color="#007D74" />
            <Text style={styles.reminderText}>Relancer sur WhatsApp</Text>
          </Pressable> : null}
        </View>
      </View>
    </Modal>
  </>;
}

function DetailRow({ label, value, strong, warning }: { label: string; value: string; strong?: boolean; warning?: boolean }) {
  return <View style={styles.detailRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, strong && styles.strongValue, warning && styles.warningValue]}>{value}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(255,255,255,.97)", borderColor: "#E4ECEC", borderRadius: 16, borderWidth: 1, gap: 9, paddingHorizontal: 15, paddingVertical: 12 },
  cardPressed: { backgroundColor: "#F7FBFB", opacity: 0.88 },
  top: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  name: { color: "#102B3D", flex: 1, fontSize: 15, fontWeight: "800" },
  status: { borderRadius: 9, fontSize: 11, fontWeight: "800", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  paid: { backgroundColor: "#E1F7F1", color: "#007D74" }, partial: { backgroundColor: "#FFF2D9", color: "#A46300" },
  summary: { alignItems: "center", flexDirection: "row", gap: 8 },
  date: { color: "#65758A", flex: 1, fontSize: 12 },
  amount: { color: "#102B3D", fontSize: 14, fontWeight: "800" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(16,43,61,.48)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 22, borderTopRightRadius: 22, gap: 18, paddingBottom: 30, paddingHorizontal: 20, paddingTop: 12 },
  sheetHeader: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  heading: { flex: 1, gap: 3 },
  sheetTitle: { color: "#65758A", fontSize: 12, fontWeight: "700" },
  sheetName: { color: "#102B3D", fontSize: 18, fontWeight: "800" },
  closeButton: { alignItems: "center", backgroundColor: "#F1F5F5", borderRadius: 20, height: 38, justifyContent: "center", width: 38 },
  details: { gap: 14 },
  detailRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  label: { color: "#65758A", flex: 1, fontSize: 13 },
  value: { color: "#102B3D", fontSize: 13, fontWeight: "600", textAlign: "right" },
  strongValue: { fontSize: 15, fontWeight: "800" },
  warningValue: { color: "#A46300" },
  reminder: { alignItems: "center", alignSelf: "stretch", backgroundColor: "#E1F7F1", borderRadius: 12, flexDirection: "row", gap: 8, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 12 },
  reminderText: { color: "#007D74", fontSize: 13, fontWeight: "700" },
});
