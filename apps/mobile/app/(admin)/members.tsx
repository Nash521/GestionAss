import { StyleSheet, Text, View } from "react-native";
import { AdminHeader, AdminNavigation } from "../../src/components/admin-chrome";

export default function AdminMembers() {
  return <View style={styles.page}>
    <AdminHeader />
    <Text>Membres</Text>
    <AdminNavigation active="members" />
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFF" },
});
