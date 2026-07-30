import { useEffect } from "react";
import { router } from "expo-router";
import { Image, StyleSheet, View } from "react-native";

const logo = require("../assets/logo-removebg-preview.png");

export default function Index() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/login");
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.page}>
      <Image source={logo} style={styles.logo} accessibilityLabel="Logo GestionAss" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: "contain",
  },
});
