import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import type { ReactNode } from "react";

export function LoadingState({ label = "Chargement…" }: { label?: string }) {
  return <View style={styles.state} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }}>
    <View style={styles.indicator}><ActivityIndicator size="large" color="#00A99D" /></View>
    <Text style={styles.label}>{label}</Text>
  </View>;
}

export function LoadingLabel({ loading, style, children }: { loading: boolean; style?: StyleProp<TextStyle>; children: ReactNode }) {
  const color = StyleSheet.flatten(style)?.color ?? "#087C70";
  return <View style={styles.row} accessibilityState={{ busy: loading }}>
    {loading ? <ActivityIndicator size="small" color={color} /> : null}
    <Text style={style}>{children}</Text>
  </View>;
}

const styles = StyleSheet.create({
  state: { alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 28, minHeight: 120 },
  indicator: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E4F5EF", alignItems: "center", justifyContent: "center" },
  label: { color: "#65758A", fontSize: 13, lineHeight: 20, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, flexShrink: 1 },
});
