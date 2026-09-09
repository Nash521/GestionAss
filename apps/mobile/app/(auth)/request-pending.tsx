import { Feather } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";

const background = require("../../assets/fond_effetvague.png");
const logo = require("../../assets/logo-removebg-preview.png");
const waitingIllustration = require("../../assets/image_attente.png");

export default function RequestPending() {
  return (
    <View style={styles.page}>
      <Image source={background} style={styles.background} accessible={false} />
      <View style={styles.content}>
        <Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
        <Image source={waitingIllustration} style={styles.illustration} accessibilityLabel="Illustration de demande en attente" />

        <Text style={styles.title}>Demande d’inscription reçue</Text>
        <View style={styles.separator} />
        <Text style={styles.message}>
          Votre demande d’inscription a bien été envoyée. Elle est actuellement en cours de validation par l’administrateur.
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusIcon} accessible={false}>
            <Feather name="clock" size={32} color="#00A99D" />
          </View>
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>En attente de validation</Text>
            <Text style={styles.statusMessage}>Vous recevrez une notification dès que votre compte sera approuvé.</Text>
          </View>
        </View>

        <Feather name="send" size={32} color="#00A99D" style={styles.plane} accessible={false} />
        <Text style={styles.thanks}>Merci pour votre patience.</Text>
        <Text style={styles.notice}>Nous vous informons dès que possible.</Text>

        <Link href="/login" style={styles.loginLink} accessibilityRole="link">
          Retour à la connexion
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  background: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", resizeMode: "cover" },
  content: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 26, paddingVertical: 20 },
  logo: { height: 90, marginBottom: 3, resizeMode: "contain", width: 90 },
  illustration: { height: 210, marginBottom: 3, resizeMode: "contain", width: "100%" },
  title: { color: "#102B3D", fontSize: 24, fontWeight: "700", textAlign: "center" },
  separator: { backgroundColor: "#00A99D", borderRadius: 4, height: 4, marginTop: 13, width: 54 },
  message: { color: "#506275", fontSize: 14, lineHeight: 21, marginTop: 16, textAlign: "center" },
  statusCard: { alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.72)", borderColor: "#CAEAE6", borderRadius: 17, borderWidth: 1, flexDirection: "row", marginTop: 21, padding: 14, width: "100%" },
  statusIcon: { alignItems: "center", backgroundColor: "#F7FFFE", borderColor: "#D5F0ED", borderRadius: 32, borderWidth: 1, height: 60, justifyContent: "center", width: 60 },
  statusText: { flex: 1, marginLeft: 13 },
  statusTitle: { color: "#009C91", fontSize: 16, fontWeight: "700" },
  statusMessage: { color: "#506275", fontSize: 12, lineHeight: 18, marginTop: 4 },
  plane: { marginTop: 22 },
  thanks: { color: "#102B3D", fontSize: 15, marginTop: 10, textAlign: "center" },
  notice: { color: "#009C91", fontSize: 15, marginTop: 2, textAlign: "center" },
  loginLink: { color: "#506275", fontSize: 13, fontWeight: "600", marginTop: 18, padding: 6, textDecorationLine: "underline" },
});
