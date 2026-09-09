import { useEffect, useState } from "react";
import { Link, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { getSessionDestination } from "../src/lib/supabase";

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { void getSessionDestination().then((session) => { if (session.role === "admin") router.replace("/(admin)/dashboard"); else setIsAdmin(false); }).catch(() => setIsAdmin(false)); }, []);
  return <View style={styles.page}><Text style={styles.title}>Bienvenue sur GestionAss</Text><Text style={styles.message}>Votre compte est validé.</Text>{isAdmin ? <Link href="/(admin)/membership-requests" style={styles.link}>Gérer les demandes d’adhésion</Link> : null}</View>;
}

const styles = StyleSheet.create({ page: { alignItems: "center", backgroundColor: "#F3FAF5", flex: 1, justifyContent: "center", padding: 24 }, title: { color: "#102B3D", fontSize: 28, fontWeight: "700", textAlign: "center" }, message: { color: "#506275", fontSize: 16, marginTop: 12 }, link: { color: "#00A99D", fontSize: 16, fontWeight: "700", marginTop: 28 } });
