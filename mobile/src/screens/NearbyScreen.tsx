import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError, listMine, listNearby } from "../api";
import { currentPoint } from "../geo";
import { categoryLabel, formatDistance, payLabel, statusLabel } from "../labels";
import { card, fontDisplay, ink, line, mute, paper, volt } from "../theme";
import type { HelpRequest } from "../types";
import { Chip } from "../components/Ui";

type Feed = "near" | "mine";

type Props = {
  onOpen: (id: string) => void;
};

export function NearbyScreen({ onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const [feed, setFeed] = useState<Feed>("near");
  const [rows, setRows] = useState<HelpRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (which: Feed) => {
    setError(null);
    try {
      if (which === "mine") {
        setRows(await listMine());
        return;
      }
      const point = await currentPoint();
      setRows(await listNearby(point.latitude, point.longitude));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить заявки");
    }
  }, []);

  useEffect(() => {
    void load(feed);
  }, [feed, load]);

  async function refresh() {
    setRefreshing(true);
    try {
      await load(feed);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.kicker}>Заявки</Text>
      <Text style={styles.title}>Рядом</Text>
      <View style={styles.seg}>
        <Pressable accessibilityRole="button" onPress={() => setFeed("near")} style={[styles.segBtn, feed === "near" && styles.segOn]}>
          <Text style={[styles.segText, feed === "near" && styles.segTextOn]}>Лента</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setFeed("mine")} style={[styles.segBtn, feed === "mine" && styles.segOn]}>
          <Text style={[styles.segText, feed === "mine" && styles.segTextOn]}>Мои</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {feed === "mine" ? "Своих заявок пока нет. Поставить точку — на сайте." : "Открытых заявок рядом нет."}
          </Text>
        }
        renderItem={({ item }) => {
          const dist = formatDistance(item.distance_m);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => onOpen(item.id)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.row}>
                <Chip label={categoryLabel(item.category)} />
                <Chip label={statusLabel(item.status)} accent={item.status === "open" ? "volt" : "shift"} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.meta}>
                {payLabel(item.price)}
                {dist ? ` · ${dist}` : ""}
                {item.address_text ? ` · ${item.address_text}` : ""}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: ink, paddingHorizontal: 20 },
  kicker: { color: volt, fontSize: 12, letterSpacing: 2, fontWeight: "800", textTransform: "uppercase" },
  title: { color: paper, fontSize: 32, fontFamily: fontDisplay, textTransform: "uppercase", marginTop: 4 },
  seg: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 8 },
  segBtn: { minHeight: 40, paddingHorizontal: 14, justifyContent: "center", borderWidth: 1, borderColor: line },
  segOn: { backgroundColor: volt, borderColor: volt },
  segText: { color: mute, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", fontSize: 12 },
  segTextOn: { color: ink },
  list: { paddingBottom: 24 },
  empty: { color: mute, marginTop: 24, lineHeight: 22 },
  error: { color: "#F87171", marginTop: 8 },
  card: { backgroundColor: card, borderWidth: 1, borderColor: line, padding: 16, marginTop: 12, gap: 8 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  cardTitle: { color: paper, fontSize: 18, fontFamily: fontDisplay },
  meta: { color: mute, fontSize: 14 },
});
