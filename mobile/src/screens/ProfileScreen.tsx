import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError, getWallet, shiftMe, shiftOff, shiftOn } from "../api";
import { Btn } from "../components/Ui";
import { currentPoint } from "../geo";
import { fontDisplay, ink, mute, paper, volt, WEB_URL } from "../theme";
import type { User } from "../types";

type Props = {
  user: User;
  onLogout: () => void;
};

export function ProfileScreen({ user, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState<number | null>(null);
  const [onShift, setOnShift] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isExecutor = user.roles.includes("executor");

  useEffect(() => {
    void (async () => {
      try {
        const wallet = await getWallet();
        setBalance(wallet.balance);
        if (isExecutor) {
          const shift = await shiftMe();
          setOnShift(shift.on_shift);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить профиль");
      }
    })();
  }, [isExecutor]);

  async function toggleShift() {
    setPending(true);
    setError(null);
    try {
      if (onShift) {
        await shiftOff();
        setOnShift(false);
      } else {
        const point = await currentPoint();
        await shiftOn(point.latitude, point.longitude);
        setOnShift(true);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сменить смену");
    } finally {
      setPending(false);
    }
  }

  const rating = user.rating_avg == null ? "—" : user.rating_avg.toFixed(1);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.kicker}>Профиль</Text>
      <Text style={styles.title}>{user.display_name}</Text>
      <Text style={styles.meta}>{user.email}</Text>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statN}>{user.karma_points}</Text>
          <Text style={styles.statL}>Карма</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statN}>{rating}</Text>
          <Text style={styles.statL}>Оценка</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statN}>{balance == null ? "…" : balance.toFixed(0)}</Text>
          <Text style={styles.statL}>BYN</Text>
        </View>
      </View>
      {isExecutor ? (
        <Btn
          tone={onShift ? "shift" : "ghost"}
          disabled={pending}
          label={onShift ? "На смене" : "Выйти на смену"}
          onPress={() => void toggleShift()}
        />
      ) : (
        <Text style={styles.meta}>Смена — у исполнителя. Клиент ставит заявку на сайте.</Text>
      )}
      <Btn tone="ghost" label="Сайт: заявка и кабинет" onPress={() => void Linking.openURL(WEB_URL)} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" onPress={onLogout} style={styles.out}>
        <Text style={styles.link}>Выйти</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: ink, paddingHorizontal: 20, gap: 12 },
  kicker: { color: volt, fontSize: 12, letterSpacing: 2, fontWeight: "800", textTransform: "uppercase" },
  title: { color: paper, fontSize: 32, fontFamily: fontDisplay, textTransform: "uppercase" },
  meta: { color: mute, fontSize: 15, lineHeight: 22 },
  stats: { flexDirection: "row", gap: 12, marginVertical: 8 },
  stat: { flex: 1 },
  statN: { color: paper, fontSize: 28, fontWeight: "800" },
  statL: { color: mute, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 },
  error: { color: "#F87171" },
  out: { minHeight: 44, justifyContent: "center", marginTop: 8 },
  link: { color: volt, fontWeight: "800" },
});
