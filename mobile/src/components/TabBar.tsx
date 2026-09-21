import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ink, line, mute, paper, volt } from "../theme";

type Tab = "nearby" | "me";

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

export function TabBar({ active, onChange }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active === "nearby" }}
        accessibilityLabel="Рядом"
        onPress={() => onChange("nearby")}
        style={styles.item}
      >
        <Feather name="map-pin" size={22} color={active === "nearby" ? volt : mute} />
        <Text style={[styles.label, active === "nearby" ? styles.on : null]}>Рядом</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active === "me" }}
        accessibilityLabel="Профиль"
        onPress={() => onChange("me")}
        style={styles.item}
      >
        <Feather name="user" size={22} color={active === "me" ? volt : mute} />
        <Text style={[styles.label, active === "me" ? styles.on : null]}>Профиль</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: line,
    backgroundColor: ink,
    paddingTop: 8,
  },
  item: { flex: 1, alignItems: "center", minHeight: 48, justifyContent: "center", gap: 4 },
  label: { color: mute, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  on: { color: paper },
});
