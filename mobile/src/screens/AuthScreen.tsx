import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApiError, fetchMe, login, register, setTokens } from "../api";
import { saveTokens } from "../session";
import { fontDisplay, ink, mute, paper, volt } from "../theme";
import type { User } from "../types";
import { Btn, Field } from "../components/Ui";

type Props = {
  onAuthed: (user: User) => void;
};

export function AuthScreen({ onAuthed }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [asExecutor, setAsExecutor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const tokens =
        mode === "login"
          ? await login(email.trim(), password)
          : await register(email.trim(), password, displayName.trim() || "Пользователь", asExecutor);
      setTokens(tokens);
      await saveTokens(tokens);
      onAuthed(await fetchMe());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось войти");
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.wrap, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.kicker}>Мова дапамогі</Text>
        <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.read}>Читается мовай</Text>
        <Text style={styles.title}>{mode === "login" ? "Вход" : "Регистрация"}</Text>
        {mode === "register" ? (
          <Field placeholder="Имя" value={displayName} onChangeText={setDisplayName} autoCapitalize="sentences" />
        ) : null}
        <Field
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <Field placeholder="Пароль" value={password} onChangeText={setPassword} secure />
        {mode === "register" ? (
          <Pressable
            accessibilityRole="button"
            style={styles.check}
            onPress={() => setAsExecutor((value) => !value)}
          >
            <Text style={styles.checkText}>{asExecutor ? "Роль: исполнитель" : "Роль: клиент"}</Text>
          </Pressable>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Btn
          label={pending ? "…" : mode === "login" ? "Войти" : "Создать"}
          disabled={pending}
          onPress={() => void submit()}
        />
        <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")} style={styles.switchHit}>
          <Text style={styles.switch}>
            {mode === "login" ? "Нет аккаунта — регистрация" : "Уже есть аккаунт — вход"}
          </Text>
        </Pressable>
        <Text style={styles.hint}>Создать заявку — на сайте. Здесь: рядом, смена, чат.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ink },
  wrap: { flex: 1, paddingHorizontal: 24, justifyContent: "center", gap: 12 },
  kicker: { color: volt, fontSize: 12, letterSpacing: 3, fontWeight: "800", textTransform: "uppercase" },
  logo: { width: "100%", height: 56, marginTop: 8 },
  read: { color: mute, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" },
  title: { color: paper, fontSize: 36, fontFamily: fontDisplay, textTransform: "uppercase", marginTop: 12 },
  check: { minHeight: 44, justifyContent: "center" },
  checkText: { color: paper, fontWeight: "700" },
  error: { color: "#F87171" },
  switchHit: { minHeight: 44, justifyContent: "center" },
  switch: { color: mute, textAlign: "center" },
  hint: { color: mute, textAlign: "center", fontSize: 13, lineHeight: 18, marginTop: 8 },
});
