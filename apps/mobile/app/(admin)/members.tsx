import { Text, View } from "react-native";
import { AdminHeader, AdminNavigation } from "../../src/components/admin-chrome";

export default function AdminMembers() {
  return <View>
    <AdminHeader />
    <Text>Membres</Text>
    <AdminNavigation active="members" />
  </View>;
}
