import { Onest_400Regular, Onest_600SemiBold, Onest_700Bold, useFonts } from "@expo-google-fonts/onest";
import { Unbounded_800ExtraBold } from "@expo-google-fonts/unbounded";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { fetchMe, setTokens } from "./src/api";
import { TabBar } from "./src/components/TabBar";
import { AuthScreen } from "./src/screens/AuthScreen";
import { NearbyScreen } from "./src/screens/NearbyScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { RequestScreen } from "./src/screens/RequestScreen";
import { clearTokens, loadTokens } from "./src/session";
import { ink, mute, volt } from "./src/theme";
import type { User } from "./src/types";

type Tab = "nearby" | "me";
type Screen = { name: "tabs"; tab: Tab } | { name: "request"; id: string };

export default function App() {
  const [fontsLoaded] = useFonts({
    Unbounded_800ExtraBold,
    Onest_400Regular,
    Onest_600SemiBold,
    Onest_700Bold,
  });
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "tabs", tab: "nearby" });
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const tokens = await loadTokens();
        if (!tokens) {
          return;
        }
        setTokens(tokens);
        setUser(await fetchMe());
      } catch {
        setTokens(null);
        await clearTokens();
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  async function logout() {
    setTokens(null);
    await clearTokens();
    setUser(null);
    setScreen({ name: "tabs", tab: "nearby" });
  }

  if (!fontsLoaded || booting) {
    return (
      <View style={styles.boot}>
        <Text style={styles.bootKicker}>MOVAŬ</Text>
        <Text style={styles.bootHint}>Мова дапамогі</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!user ? (
        <AuthScreen onAuthed={setUser} />
      ) : screen.name === "request" ? (
        <RequestScreen id={screen.id} user={user} onBack={() => setScreen({ name: "tabs", tab: "nearby" })} />
      ) : (
        <View style={styles.root}>
          <View style={styles.body}>
            {screen.tab === "me" ? (
              <ProfileScreen user={user} onLogout={() => void logout()} />
            ) : (
              <NearbyScreen onOpen={(id) => setScreen({ name: "request", id })} />
            )}
          </View>
          <TabBar active={screen.tab} onChange={(tab) => setScreen({ name: "tabs", tab })} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ink },
  body: { flex: 1 },
  boot: { flex: 1, backgroundColor: ink, alignItems: "center", justifyContent: "center", gap: 8 },
  bootKicker: { color: volt, fontSize: 22, fontWeight: "800", letterSpacing: 4 },
  bootHint: { color: mute, letterSpacing: 2, textTransform: "uppercase" },
});
