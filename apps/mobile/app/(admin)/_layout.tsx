import { Slot, usePathname } from "expo-router";
import { View } from "react-native";
import { AdminNavigation, AdminSection } from "../../src/components/admin-chrome";

function sectionFor(pathname: string): AdminSection {
  if (pathname.includes("dashboard")) return "dashboard";
  if (pathname.includes("members") || pathname.includes("membership-requests")) return "members";
  return "finances";
}

export default function AdminLayout() {
  const pathname = usePathname();

  if (pathname.endsWith("/members/new") || pathname.includes("/finances/new") || pathname.includes("/settings/finance")) return <Slot />;

  const activeSection = sectionFor(pathname);
  return <View style={{ flex: 1 }}><Slot /><AdminNavigation active={activeSection} /></View>;
}
