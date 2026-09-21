import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ApiError,
  cancelRequest,
  completeRequest,
  getLocation,
  getRequest,
  listMessages,
  pingLocation,
  refuseRequest,
  sendMessage,
  startRequest,
  takeRequest,
} from "../api";
import { Chip, Btn } from "../components/Ui";
import { currentPoint } from "../geo";
import { categoryLabel, etaLabel, payLabel, statusLabel } from "../labels";
import { card, danger, fontDisplay, ink, line, mute, paper, shift, volt } from "../theme";
import type { ChatMessage, HelpRequest, RequestLocation, User } from "../types";

type Props = {
  id: string;
  user: User;
  onBack: () => void;
};

export function RequestScreen({ id, user, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<HelpRequest | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [track, setTrack] = useState<RequestLocation | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const isExecutor = user.roles.includes("executor");
  const isVolunteer = user.roles.includes("volunteer");

  const load = useCallback(async () => {
    setError(null);
    try {
      const next = await getRequest(id);
      setItem(next);
      const isParty = user.id === next.client_id || user.id === next.executor_id;
      const canChat = isParty && next.status !== "open" && next.status !== "cancelled";
      const canTrack = isParty && (next.status === "assigned" || next.status === "in_progress");
      if (canChat) {
        setMessages(await listMessages(id));
      }
      if (canTrack) {
        try {
          setTrack(await getLocation(id));
        } catch {
          setTrack(null);
        }
      } else {
        setTrack(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить заявку");
    }
  }, [id, user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => void load(), 4000);
    return () => clearInterval(timer);
  }, [load]);

  const isAssignee = item?.executor_id === user.id;
  const canTrack = Boolean(
    item && (user.id === item.client_id || isAssignee) && (item.status === "assigned" || item.status === "in_progress"),
  );

  useEffect(() => {
    if (!isAssignee || !canTrack) {
      return;
    }
    let live = true;
    async function ping() {
      try {
        const point = await currentPoint();
        const dto = await pingLocation(id, point.latitude, point.longitude);
        if (live) {
          setTrack(dto);
        }
      } catch {
        /* нет прав или заявка уже не активна */
      }
    }
    void ping();
    const timer = setInterval(() => void ping(), 12000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [canTrack, id, isAssignee]);

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось выполнить действие");
    } finally {
      setPending(false);
    }
  }

  async function send() {
    const body = draft.trim();
    if (!body) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const row = await sendMessage(id, body);
      setDraft("");
      setMessages((prev) => (prev.some((item) => item.id === row.id) ? prev : [...prev, row]));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не отправилось");
    } finally {
      setPending(false);
    }
  }

  if (!item) {
    return (
      <View style={[styles.wrap, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={onBack} style={styles.back}>
          <Text style={styles.link}>Назад</Text>
        </Pressable>
        <Text style={styles.meta}>{error ?? "Загружаем заявку…"}</Text>
      </View>
    );
  }

  const isOwner = user.id === item.client_id;
  const canTake = !isOwner && item.status === "open" && (isExecutor || (isVolunteer && !item.price));
  const canChat = (isOwner || isAssignee) && item.status !== "open" && item.status !== "cancelled";
  const eta = etaLabel(track?.eta_at ?? item.eta_at);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
          <Text style={styles.link}>Назад</Text>
        </Pressable>
        <View style={styles.chips}>
          <Chip label={categoryLabel(item.category)} />
          <Chip label={statusLabel(item.status)} accent={item.status === "in_progress" ? "shift" : "volt"} />
          <Chip label={payLabel(item.price)} accent="mute" />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.description}</Text>
        {item.address_text ? <Text style={styles.meta}>{item.address_text}</Text> : null}

        {canTrack ? (
          <View style={styles.track}>
            <Text style={styles.trackKicker}>Трек</Text>
            <Text style={styles.trackTitle}>{eta ?? (track ? "Точка живая" : "Ждём точку смены")}</Text>
            {track ? (
              <Text style={styles.meta}>
                {track.latitude.toFixed(5)}, {track.longitude.toFixed(5)}
              </Text>
            ) : null}
            <Btn
              tone="ghost"
              label="Открыть карту"
              onPress={() =>
                void Linking.openURL(
                  `https://yandex.ru/maps/?pt=${item.longitude},${item.latitude}&z=16`,
                )
              }
            />
          </View>
        ) : null}

        {isOwner && item.status === "open" ? (
          <Text style={styles.meta}>Ждём, кто возьмёт. Чат откроется сразу.</Text>
        ) : null}

        <View style={styles.actions}>
          {canTake ? <Btn disabled={pending} label={pending ? "Берём…" : "Возьмусь"} onPress={() => void run(() => takeRequest(id))} /> : null}
          {isAssignee && item.status === "assigned" ? (
            <Btn disabled={pending} label="В работе" onPress={() => void run(() => startRequest(id))} />
          ) : null}
          {isAssignee && item.status === "in_progress" ? (
            <Btn disabled={pending} label="Закрыть заявку" onPress={() => void run(() => completeRequest(id))} />
          ) : null}
          {isAssignee && (item.status === "assigned" || item.status === "in_progress") ? (
            <Btn tone="ghost" disabled={pending} label="Отказаться" onPress={() => void run(() => refuseRequest(id))} />
          ) : null}
          {isOwner && item.status === "open" ? (
            <Btn tone="danger" disabled={pending} label="Снять заявку" onPress={() => void run(() => cancelRequest(id))} />
          ) : null}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {canChat ? (
          <View style={styles.chat}>
            <Text style={styles.trackKicker}>Чат заявки</Text>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(row) => row.id}
              style={styles.chatList}
              contentContainerStyle={styles.chatContent}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={<Text style={styles.meta}>Пока пусто. Напишите точку встречи.</Text>}
              renderItem={({ item: row }) => {
                    const mine = row.author_id === user.id;
                return (
                  <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                    <Text style={[styles.who, mine ? styles.onVolt : styles.onDark]}>{mine ? "Вы" : row.author_display_name}</Text>
                    <Text style={[styles.msg, mine ? styles.onVolt : styles.onDark]}>{row.body || (row.has_image ? "Фото" : "")}</Text>
                  </View>
                );
              }}
            />
            <View style={[styles.composer, { paddingBottom: Math.max(8, insets.bottom) }]}>
              <TextInput
                style={styles.input}
                placeholder="Сообщение"
                placeholderTextColor={mute}
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={() => void send()}
                returnKeyType="send"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Отправить"
                disabled={pending}
                onPress={() => void send()}
                style={({ pressed }) => [styles.send, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.sendText}>Ок</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: ink },
  wrap: { flex: 1, backgroundColor: ink, paddingHorizontal: 20 },
  back: { minHeight: 44, justifyContent: "center" },
  link: { color: volt, fontWeight: "800" },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 },
  title: { color: paper, fontSize: 28, fontFamily: fontDisplay, marginTop: 12 },
  body: { color: mute, fontSize: 16, lineHeight: 24, marginTop: 8 },
  meta: { color: mute, marginTop: 8 },
  error: { color: danger, marginTop: 8 },
  actions: { gap: 10, marginTop: 16 },
  track: { backgroundColor: card, borderWidth: 1, borderColor: line, padding: 14, marginTop: 16, gap: 8 },
  trackKicker: { color: shift, fontSize: 11, letterSpacing: 2, fontWeight: "800", textTransform: "uppercase" },
  trackTitle: { color: paper, fontSize: 18, fontWeight: "800" },
  chat: { flex: 1, marginTop: 16, minHeight: 180 },
  chatList: { flex: 1 },
  chatContent: { paddingVertical: 8, gap: 8 },
  bubble: { padding: 10, maxWidth: "86%" },
  mine: { alignSelf: "flex-end", backgroundColor: volt },
  theirs: { alignSelf: "flex-start", backgroundColor: card, borderWidth: 1, borderColor: line },
  who: { fontSize: 11, fontWeight: "700", marginBottom: 2 },
  msg: { fontSize: 15, lineHeight: 20 },
  onVolt: { color: ink },
  onDark: { color: paper },
  composer: { flexDirection: "row", gap: 8, alignItems: "center", paddingTop: 8 },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: line,
    color: paper,
    paddingHorizontal: 12,
  },
  send: { minHeight: 48, minWidth: 48, backgroundColor: volt, alignItems: "center", justifyContent: "center" },
  sendText: { color: ink, fontWeight: "800", textTransform: "uppercase" },
});
