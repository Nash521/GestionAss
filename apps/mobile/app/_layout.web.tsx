import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

export default function WebRootLayout() {
  return <View style={styles.preview}>
    <Stack screenOptions={{ headerShown: false }} />
  </View>;
}

const styles = StyleSheet.create({
  preview: { alignSelf: "center", flex: 1, maxWidth: 430, width: "100%" },
});
