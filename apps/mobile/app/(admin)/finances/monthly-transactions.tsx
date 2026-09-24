import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AdminHeader } from "../../../src/components/admin-chrome";
import { MonthlyPaymentCard } from "../../../src/features/finance/monthly-payment-card";
import { getAdminFinance, type MonthlyPaymentTransaction } from "../../../src/lib/supabase";

const background = require("../../../assets/Fond_ecranMobile.png");
const PAGE_SIZE = 20;

export default function MonthlyTransactions() {
  const [items, setItems] = useState<MonthlyPaymentTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const requestSequence = useRef(0);

  const loadFirstPage = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true); setError(false); setItems([]);
    try {
      const result = await getAdminFinance("monthly", 0, PAGE_SIZE);
      if (requestId !== requestSequence.current) return;
      setItems(result.items as MonthlyPaymentTransaction[]); setTotal(result.metadata.total);
    } catch {
      if (requestId === requestSequence.current) setError(true);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || items.length >= total) return;
    const requestId = ++requestSequence.current;
    setLoadingMore(true); setMoreError(false);
    try {
      const result = await getAdminFinance("monthly", items.length, PAGE_SIZE);
      if (requestId !== requestSequence.current) return;
      setItems((current) => [...current, ...(result.items as MonthlyPaymentTransaction[])]);
      setTotal(result.metadata.total);
    } catch {
      if (requestId === requestSequence.current) setMoreError(true);
    } finally {
      if (requestId === requestSequence.current) setLoadingMore(false);
    }
  }, [items.length, loadingMore, total]);

  useEffect(() => {
    void loadFirstPage();
    return () => { requestSequence.current++; };
  }, [loadFirstPage]);

  return <View style={styles.page}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <ImageBackground source={background} style={styles.background} imageStyle={styles.backgroundImage}>
        <View style={styles.content}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour aux finances" onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={18} color="#007D74" /><Text style={styles.backText}>Finances</Text></Pressable>
          <Text style={styles.kicker}>Mensualités</Text>
          <Text style={styles.title}>Toutes les transactions</Text>
          <Text style={styles.subtitle}>Historique des paiements enregistrés, du plus récent au plus ancien.</Text>
          {loading ? <Text style={styles.message}>Chargement des transactions…</Text> : error ? <View style={styles.state}><Text style={styles.message}>Impossible de charger les transactions.</Text><Pressable accessibilityRole="button" onPress={() => void loadFirstPage()}><Text style={styles.action}>Réessayer</Text></Pressable></View> : items.length === 0 ? <Text style={styles.message}>Aucun paiement de mensualité pour le moment.</Text> : <>
            <Text accessibilityLiveRegion="polite" style={styles.count}>{items.length} sur {total} transaction{total > 1 ? "s" : ""}</Text>
            <View style={styles.list}>{items.map((item) => <MonthlyPaymentCard key={item.id} item={item} />)}</View>
            {items.length < total ? moreError ? <View style={styles.state}><Text style={styles.message}>La suite de l’historique n’a pas pu être chargée.</Text><Pressable accessibilityRole="button" onPress={() => void loadMore()}><Text style={styles.action}>Réessayer</Text></Pressable></View> : <Pressable accessibilityRole="button" accessibilityState={{ disabled: loadingMore }} style={styles.more} disabled={loadingMore} onPress={() => void loadMore()}><Text style={styles.action}>{loadingMore ? "Chargement…" : "Charger plus"}</Text></Pressable> : <Text style={styles.end}>Fin de l’historique</Text>}
          </>}
        </View>
      </ImageBackground>
    </ScrollView>
    <AdminHeader />
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, background: { minHeight: "100%" }, backgroundImage: { resizeMode: "cover" }, scroll: { flexGrow: 1 },
  content: { gap: 13, padding: 20, paddingBottom: 112, paddingTop: 116 }, back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 6, paddingVertical: 5 }, backText: { color: "#007D74", fontSize: 13, fontWeight: "700" },
  kicker: { color: "#65758A", fontSize: 13 }, title: { color: "#102B3D", fontSize: 27, fontWeight: "800" }, subtitle: { color: "#65758A", fontSize: 14, lineHeight: 20 },
  list: { gap: 10 }, count: { color: "#65758A", fontSize: 12, fontWeight: "600" }, message: { color: "#65758A", padding: 24, textAlign: "center" }, state: { alignItems: "center", gap: 8 }, action: { color: "#007D74", fontWeight: "800" },
  more: { alignItems: "center", backgroundColor: "rgba(255,255,255,.95)", borderColor: "#00A99D", borderRadius: 12, borderWidth: 1, padding: 13 }, end: { color: "#65758A", fontSize: 12, padding: 12, textAlign: "center" },
});
