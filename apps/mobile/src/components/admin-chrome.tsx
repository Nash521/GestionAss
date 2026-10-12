import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getUnreadPaymentNotificationCount } from "../features/notifications/api";

const logo = require("../../assets/logo-removebg-preview.png");

export type AdminSection = "dashboard" | "members" | "finances";

export function AdminHeader({ translateY }: { translateY?: Animated.Value }) {
  const Container = translateY ? Animated.View : View;
  const [unread, setUnread] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    const refresh = () => { void getUnreadPaymentNotificationCount().then((count) => { if (active) setUnread(count); }).catch(() => {}); };
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []));

  return <Container style={[styles.header, translateY && { transform: [{ translateY }] }]}>
    <Pressable style={styles.headerAction} onPress={() => router.push("/notifications")} accessibilityLabel="Notifications" accessibilityRole="button"><Feather name="bell" size={23} color="#102B3D" />{unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text></View> : null}</Pressable>
    <Image source={logo} style={styles.logo}/>
    <Pressable style={styles.headerAction} onPress={() => router.push("/(admin)/settings/finance")} accessibilityLabel="Paramètres"><Feather name="settings" size={22} color="#102B3D" /></Pressable>
  </Container>;
}

export function AdminNavigation({ active, translateY }: { active: AdminSection; translateY?: Animated.Value }) {
  const Container = translateY ? Animated.View : View;
  const color = (section: AdminSection) => active === section ? "#00A99D" : "#65758A";

  return <Container style={[styles.nav, translateY && { transform: [{ translateY }] }]}>
    <Pressable style={styles.navAction} onPress={() => router.replace("/(admin)/dashboard")} accessibilityLabel="Tableau de bord"><Feather name="grid" size={25} color={color("dashboard")} /></Pressable>
    <Pressable style={styles.navAction} onPress={() => router.push("/(admin)/members")} accessibilityLabel="Membres"><Feather name="users" size={25} color={color("members")} /></Pressable>
    <Pressable style={styles.navAction} onPress={() => router.push("/(admin)/finances")} accessibilityLabel="Finances"><Feather name="credit-card" size={25} color={color("finances")} /></Pressable>
  </Container>;
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", left: 0, paddingHorizontal: 20, position: "absolute", right: 0, top: 28, zIndex: 10 },
  headerAction: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 16, elevation: 4, height: 46, justifyContent: "center", shadowColor: "#102B3D", shadowOpacity: .14, shadowRadius: 8, width: 46 },
  badge: { alignItems: "center", backgroundColor: "#D34E43", borderRadius: 10, justifyContent: "center", minHeight: 18, minWidth: 18, paddingHorizontal: 3, position: "absolute", right: -3, top: -4 }, badgeText: { color: "#FFF", fontSize: 10, fontWeight: "800" },
  logo: { height: 64, resizeMode: "contain", width: 64 },
  nav: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 18, bottom: 20, elevation: 5, flexDirection: "row", justifyContent: "space-around", left: 20, minHeight: 64, position: "absolute", right: 20, shadowColor: "#102B3D", shadowOpacity: .14, shadowRadius: 8, zIndex: 10 },
  navAction: { alignItems: "center", height: 56, justifyContent: "center", width: 56 },
});
