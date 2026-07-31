import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Login() {
  return (
    <View style={styles.page}>
      <View style={styles.hero}>
        <Text style={styles.brand}>GestionAss</Text>
        <Text style={styles.title}>Votre association, simplement.</Text>
        <Text style={styles.subtitle}>
          Rejoignez votre organisation avec le code d’invitation transmis par votre administrateur.
        </Text>
      </View>

      <Link href="/sign-up" asChild>
        <Pressable style={styles.primaryButton} accessibilityRole="button">
          <Text style={styles.primaryButtonLabel}>Créer un compte</Text>
        </Pressable>
      </Link>

      <Text style={styles.notice}>La connexion des membres sera disponible prochainement.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F3FAF5",
  },
  hero: {
    marginBottom: 48,
  },
  brand: {
    marginBottom: 18,
    color: "#177245",
    fontSize: 18,
    fontWeight: "700",
  },
  title: {
    marginBottom: 14,
    color: "#143D27",
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 42,
  },
  subtitle: {
    color: "#4C6755",
    fontSize: 16,
    lineHeight: 24,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 16,
    backgroundColor: "#177245",
  },
  primaryButtonLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  notice: {
    marginTop: 20,
    color: "#607568",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
