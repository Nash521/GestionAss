import { StyleSheet, Text, View } from "react-native";

export default function Home() {
  return <View style={styles.page}><Text style={styles.title}>Bienvenue sur GestionAss</Text><Text style={styles.message}>Votre compte est validé.</Text></View>;
}

const styles = StyleSheet.create({ page: { alignItems: "center", backgroundColor: "#F3FAF5", flex: 1, justifyContent: "center", padding: 24 }, title: { color: "#102B3D", fontSize: 28, fontWeight: "700", textAlign: "center" }, message: { color: "#506275", fontSize: 16, marginTop: 12 } });
