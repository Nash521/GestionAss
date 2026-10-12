import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type MemberSection = "home" | "transactions" | "profile";

const tabs: { section: MemberSection; label: string; icon: "grid" | "list" | "user"; href: "/home" | "/transactions" | "/profile" }[] = [
  { section: "home", label: "Tableau de bord", icon: "grid", href: "/home" },
  { section: "transactions", label: "Transactions", icon: "list", href: "/transactions" },
  { section: "profile", label: "Profil", icon: "user", href: "/profile" },
];

export function MemberNavigation({ active }: { active: MemberSection }) {
  return <View style={styles.navigation}>
    {tabs.map((tab) => <Pressable key={tab.section} accessibilityRole="button" accessibilityState={{ selected: active === tab.section }} accessibilityLabel={tab.label} onPress={() => { if (active !== tab.section) router.replace(tab.href); }} style={styles.navItem}>
      <Feather name={tab.icon} size={22} color={active === tab.section ? "#007D74" : "#84939D"} />
      <Text style={active === tab.section ? styles.navActive : styles.navInactive}>{tab.label}</Text>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  navigation: { alignSelf: "center", alignItems: "center", backgroundColor: "#FFF", borderRadius: 19, bottom: 16, elevation: 6, flexDirection: "row", justifyContent: "space-around", minHeight: 66, position: "absolute", shadowColor: "#102B3D", shadowOpacity: .15, shadowRadius: 8, width: "90%", maxWidth: 720 },
  navItem: { alignItems: "center", flex: 1, gap: 4, justifyContent: "center", minHeight: 60 },
  navActive: { color: "#007D74", fontSize: 10, fontWeight: "800" },
  navInactive: { color: "#84939D", fontSize: 10, fontWeight: "700" },
});
