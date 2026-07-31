import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function PasswordReset() {
  return <View style={styles.page}><Text style={styles.title}>Mot de passe oublié</Text><Text style={styles.message}>Cette fonctionnalité arrive bientôt.</Text><Link href="/login" style={styles.link}>Retour à la connexion</Link></View>;
}

const styles = StyleSheet.create({ page: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 }, title: { color: "#102B3D", fontSize: 28, fontWeight: "700" }, message: { color: "#506275", fontSize: 16, marginTop: 16, textAlign: "center" }, link: { color: "#00A99D", fontSize: 16, fontWeight: "700", marginTop: 32 } });
